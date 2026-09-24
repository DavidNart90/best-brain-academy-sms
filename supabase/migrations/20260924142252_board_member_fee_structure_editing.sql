-- Give Board Members the same student-fee structure controls as existing
-- fee operators without widening access to salaries, payment setup or
-- financial categories.

set lock_timeout = '5s';

insert into public.permissions (code, description)
values ('finance.fees.manage', 'Configure student fee rates by academic term and class')
on conflict (code) do update
set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('SUPER_ADMIN', 'finance.fees.manage'),
  ('ACCOUNTANT', 'finance.fees.manage'),
  ('MANAGEMENT', 'finance.fees.manage')
on conflict do nothing;

drop policy if exists fee_component_rates_insert_settings
  on public.fee_component_rates;
create policy fee_component_rates_insert_settings
on public.fee_component_rates for insert to authenticated
with check (
  (select private.has_permission('finance.settings.manage'))
  or (select private.has_permission('finance.fees.manage'))
);

drop policy if exists fee_component_rates_update_settings
  on public.fee_component_rates;
create policy fee_component_rates_update_settings
on public.fee_component_rates for update to authenticated
using (
  (select private.has_permission('finance.settings.manage'))
  or (select private.has_permission('finance.fees.manage'))
)
with check (
  (select private.has_permission('finance.settings.manage'))
  or (select private.has_permission('finance.fees.manage'))
);

create or replace function public.prepare_term_rate_configuration(
  target_academic_term_id bigint,
  target_domain text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_term record;
  source_term record;
  existing_configuration public.term_rate_configurations%rowtype;
  saved_configuration public.term_rate_configurations%rowtype;
  copied_count integer := 0;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Sign in before changing term rates.';
  end if;
  if target_domain = 'school_fees' then
    if not (
      (select private.has_permission('finance.settings.manage'))
      or (select private.has_permission('finance.fees.manage'))
    ) then
      raise exception using errcode = '42501', message = 'Student fee management permission is required.';
    end if;
  elsif target_domain = 'library_prospectus' then
    if not (select private.has_permission('library.settings.manage')) then
      raise exception using errcode = '42501', message = 'Library settings permission is required.';
    end if;
  else
    raise exception using errcode = '22023', message = 'Choose a valid term-rate domain.';
  end if;

  select term.id, term.academic_year_id, term.name, year.name as academic_year_name
  into target_term
  from public.academic_terms term
  join public.academic_years year on year.id = term.academic_year_id
  where term.id = target_academic_term_id
    and term.status = 'active'
    and year.status = 'active';
  if target_term.id is null then
    raise exception using errcode = '23514', message = 'Choose an active academic term.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('term-rate:' || target_domain || ':' || target_academic_term_id::text, 0)
  );

  select * into existing_configuration
  from public.term_rate_configurations configuration
  where configuration.academic_term_id = target_academic_term_id
    and configuration.domain = target_domain;
  if existing_configuration.id is not null then
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'configurationId', existing_configuration.id,
      'status', existing_configuration.status,
      'copiedCount', 0
    );
  end if;

  select * into source_term
  from private.previous_active_academic_term(target_academic_term_id);
  if source_term.academic_term_id is not null and not exists (
    select 1
    from public.term_rate_configurations configuration
    where configuration.academic_term_id = source_term.academic_term_id
      and configuration.domain = target_domain
      and configuration.status = 'approved'
  ) then
    raise exception using errcode = '23514',
      message = 'Approve the previous term configuration before copying it forward.';
  end if;

  insert into public.term_rate_configurations (
    academic_term_id, domain, source_academic_term_id, status,
    created_by, updated_by
  ) values (
    target_academic_term_id, target_domain, source_term.academic_term_id, 'draft',
    actor_id, actor_id
  )
  returning * into saved_configuration;

  if target_domain = 'school_fees' and source_term.academic_term_id is not null then
    insert into public.fee_component_rates (
      fee_component_id, academic_year_id, academic_term_id, class_id,
      school_location_id, amount, status, created_by, updated_by
    )
    select
      source_rate.fee_component_id,
      target_term.academic_year_id,
      target_academic_term_id,
      source_rate.class_id,
      source_rate.school_location_id,
      source_rate.amount,
      'active',
      actor_id,
      actor_id
    from public.fee_component_rates source_rate
    where source_rate.academic_term_id = source_term.academic_term_id
      and source_rate.status = 'active'
      and not exists (
        select 1
        from public.fee_component_rates target_rate
        where target_rate.academic_term_id = target_academic_term_id
          and target_rate.fee_component_id = source_rate.fee_component_id
          and target_rate.class_id is not distinct from source_rate.class_id
          and target_rate.school_location_id is not distinct from source_rate.school_location_id
          and target_rate.status = 'active'
      );
    get diagnostics copied_count = row_count;
  elsif target_domain = 'library_prospectus' and source_term.academic_term_id is not null then
    insert into public.library_term_rates (
      academic_term_id, class_id, charge_status, amount, created_by, updated_by
    )
    select
      target_academic_term_id,
      source_rate.class_id,
      source_rate.charge_status,
      source_rate.amount,
      actor_id,
      actor_id
    from public.library_term_rates source_rate
    where source_rate.academic_term_id = source_term.academic_term_id
      and not exists (
        select 1
        from public.library_term_rates target_rate
        where target_rate.academic_term_id = target_academic_term_id
          and target_rate.class_id = source_rate.class_id
      );
    get diagnostics copied_count = row_count;
  end if;

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'configurationId', saved_configuration.id,
    'status', saved_configuration.status,
    'sourceAcademicTermId', source_term.academic_term_id,
    'copiedCount', copied_count
  );
end;
$$;

revoke all on function public.prepare_term_rate_configuration(bigint, text)
  from public, anon, authenticated;
grant execute on function public.prepare_term_rate_configuration(bigint, text)
  to authenticated;

create or replace function public.approve_term_rate_configuration(
  target_academic_term_id bigint,
  target_domain text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_year_id bigint;
  configuration public.term_rate_configurations%rowtype;
  missing_count integer := 0;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Sign in before approving term rates.';
  end if;
  if target_domain = 'school_fees' then
    if not (
      (select private.has_permission('finance.settings.manage'))
      or (select private.has_permission('finance.fees.manage'))
    ) then
      raise exception using errcode = '42501', message = 'Student fee management permission is required.';
    end if;
  elsif target_domain = 'library_prospectus' then
    if not (select private.has_permission('library.settings.manage')) then
      raise exception using errcode = '42501', message = 'Library settings permission is required.';
    end if;
  else
    raise exception using errcode = '22023', message = 'Choose a valid term-rate domain.';
  end if;

  select academic_year_id into target_year_id
  from public.academic_terms
  where id = target_academic_term_id and status = 'active';
  if target_year_id is null then
    raise exception using errcode = '23514', message = 'Choose an active academic term.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('term-rate:' || target_domain || ':' || target_academic_term_id::text, 0)
  );
  select * into configuration
  from public.term_rate_configurations item
  where item.academic_term_id = target_academic_term_id
    and item.domain = target_domain
  for update;
  if configuration.id is null then
    raise exception using errcode = '23514', message = 'Create the term draft before approving it.';
  end if;
  if configuration.status = 'approved' then
    return jsonb_build_object('ok', true, 'status', 'approved', 'configurationId', configuration.id);
  end if;

  if target_domain = 'school_fees' then
    select count(*)::integer into missing_count
    from (
      select school_class.id
      from public.classes school_class
      where school_class.status = 'active'
        and not exists (
          select 1
          from public.fee_component_rates rate
          join public.fee_components component on component.id = rate.fee_component_id
          where component.code = 'base_class_fee'
            and rate.academic_year_id = target_year_id
            and rate.academic_term_id = target_academic_term_id
            and rate.class_id = school_class.id
            and rate.status = 'active'
        )
      union all
      select location.id
      from public.school_locations location
      where location.status = 'active'
        and not exists (
          select 1
          from public.fee_component_rates rate
          join public.fee_components component on component.id = rate.fee_component_id
          where component.code = 'location_transport_charge'
            and rate.academic_year_id = target_year_id
            and rate.academic_term_id = target_academic_term_id
            and rate.school_location_id = location.id
            and rate.status = 'active'
        )
      union all
      select component.id
      from public.fee_components component
      where component.status = 'active'
        and component.scope = 'flat'
        and not exists (
          select 1
          from public.fee_component_rates rate
          where rate.fee_component_id = component.id
            and rate.academic_year_id = target_year_id
            and rate.academic_term_id = target_academic_term_id
            and rate.status = 'active'
        )
    ) missing;
    if missing_count > 0 then
      raise exception using errcode = '23514',
        message = format('Complete %s missing school-fee rate%s before approval.', missing_count, case when missing_count = 1 then '' else 's' end);
    end if;
  else
    select count(*)::integer into missing_count
    from public.classes school_class
    where school_class.status = 'active'
      and not exists (
        select 1
        from public.library_term_rates rate
        where rate.academic_term_id = target_academic_term_id
          and rate.class_id = school_class.id
      );
    if missing_count > 0 then
      raise exception using errcode = '23514',
        message = format('Configure Books & Prospectus for %s missing class%s before approval.', missing_count, case when missing_count = 1 then '' else 'es' end);
    end if;
  end if;

  update public.term_rate_configurations
  set status = 'approved', approved_at = now(), approved_by = actor_id, updated_by = actor_id
  where id = configuration.id;

  return jsonb_build_object(
    'ok', true,
    'status', 'approved',
    'configurationId', configuration.id
  );
end;
$$;

revoke all on function public.approve_term_rate_configuration(bigint, text)
  from public, anon, authenticated;
grant execute on function public.approve_term_rate_configuration(bigint, text)
  to authenticated;

comment on policy fee_component_rates_insert_settings
  on public.fee_component_rates is
  'Allows existing finance-settings operators and dedicated student-fee operators to create current-term fee rates.';
comment on policy fee_component_rates_update_settings
  on public.fee_component_rates is
  'Allows existing finance-settings operators and dedicated student-fee operators to update current-term fee rates.';
