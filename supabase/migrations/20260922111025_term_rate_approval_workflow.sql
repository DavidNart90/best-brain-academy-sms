-- Term rate workflow: copy the previous approved term into an editable draft,
-- then explicitly approve the complete configuration before billing.

set lock_timeout = '5s';

create table public.term_rate_configurations (
  id bigint generated always as identity primary key,
  academic_term_id bigint not null references public.academic_terms(id) on delete restrict,
  domain text not null check (domain in ('school_fees', 'library_prospectus')),
  source_academic_term_id bigint references public.academic_terms(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint term_rate_configurations_distinct_source
    check (source_academic_term_id is null or source_academic_term_id <> academic_term_id),
  constraint term_rate_configurations_approval_shape check (
    (status = 'draft' and approved_at is null and approved_by is null)
    or (status = 'approved' and approved_at is not null)
  ),
  unique (academic_term_id, domain)
);

create index term_rate_configurations_domain_status_idx
  on public.term_rate_configurations (domain, status, academic_term_id);
create index term_rate_configurations_source_idx
  on public.term_rate_configurations (source_academic_term_id)
  where source_academic_term_id is not null;
create index term_rate_configurations_approved_by_idx
  on public.term_rate_configurations (approved_by)
  where approved_by is not null;

create trigger term_rate_configurations_stamp
before insert or update on public.term_rate_configurations
for each row execute function private.stamp_configuration_record();

create trigger term_rate_configurations_audit
after insert or update or delete on public.term_rate_configurations
for each row execute function private.write_configuration_audit();

alter table public.term_rate_configurations enable row level security;
revoke all on public.term_rate_configurations from public, anon, authenticated;
grant select on public.term_rate_configurations to authenticated;

create policy term_rate_configurations_read_authorized
  on public.term_rate_configurations for select to authenticated
  using (
    (domain = 'school_fees' and (select private.has_permission('financials.read')))
    or
    (domain = 'library_prospectus' and (select private.has_permission('library.read')))
  );

-- Existing configurations have already been used operationally. Preserve them
-- as approved without changing any amount or generated financial record.
insert into public.term_rate_configurations (
  academic_term_id, domain, status, approved_at
)
select distinct rate.academic_term_id, 'school_fees', 'approved', now()
from public.fee_component_rates rate
where rate.status = 'active'
on conflict (academic_term_id, domain) do nothing;

insert into public.term_rate_configurations (
  academic_term_id, domain, status, approved_at
)
select distinct rate.academic_term_id, 'library_prospectus', 'approved', now()
from public.library_term_rates rate
on conflict (academic_term_id, domain) do nothing;

create or replace function private.previous_active_academic_term(target_term_id bigint)
returns table (
  academic_term_id bigint,
  academic_year_id bigint,
  academic_year_name text,
  academic_term_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select term.sequence, year.starts_on
    from public.academic_terms term
    join public.academic_years year on year.id = term.academic_year_id
    where term.id = target_term_id
  )
  select term.id, year.id, year.name, term.name
  from public.academic_terms term
  join public.academic_years year on year.id = term.academic_year_id
  cross join target
  where term.status = 'active'
    and year.status = 'active'
    and (
      year.starts_on < target.starts_on
      or (year.starts_on = target.starts_on and term.sequence < target.sequence)
    )
  order by year.starts_on desc, term.sequence desc, term.id desc
  limit 1;
$$;
revoke all on function private.previous_active_academic_term(bigint)
  from public, anon, authenticated;

create or replace function private.assert_term_rate_configuration(
  target_academic_term_id bigint,
  target_domain text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if target_domain not in ('school_fees', 'library_prospectus') then
    raise exception using errcode = '22023', message = 'Choose a valid term-rate domain.';
  end if;
  if not exists (
    select 1
    from public.term_rate_configurations configuration
    where configuration.academic_term_id = target_academic_term_id
      and configuration.domain = target_domain
      and configuration.status = 'approved'
  ) then
    raise exception using errcode = '23514', message = case target_domain
      when 'school_fees' then 'Approve the school-fee configuration for this term before generating invoices.'
      else 'Approve the Books & Prospectus configuration for this term before generating charges.'
    end;
  end if;
end;
$$;
revoke all on function private.assert_term_rate_configuration(bigint, text)
  from public, anon, authenticated;

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
    if not (select private.has_permission('finance.settings.manage')) then
      raise exception using errcode = '42501', message = 'Financial settings permission is required.';
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
    if not (select private.has_permission('finance.settings.manage')) then
      raise exception using errcode = '42501', message = 'Financial settings permission is required.';
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

create or replace function private.guard_fee_rate_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_term_id bigint := case when tg_op = 'DELETE' then old.academic_term_id else new.academic_term_id end;
  configuration_status text;
begin
  select status into configuration_status
  from public.term_rate_configurations
  where academic_term_id = target_term_id and domain = 'school_fees';
  if configuration_status is null then
    raise exception using errcode = '23514', message = 'Create a school-fee draft for this term before editing rates.';
  end if;
  if configuration_status <> 'draft' then
    raise exception using errcode = '23514', message = 'Approved school-fee configuration is locked.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function private.guard_fee_rate_draft() from public, anon, authenticated;

create trigger fee_component_rates_require_draft
before insert or update or delete on public.fee_component_rates
for each row execute function private.guard_fee_rate_draft();

create or replace function private.guard_library_rate_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_term_id bigint := case when tg_op = 'DELETE' then old.academic_term_id else new.academic_term_id end;
  configuration_status text;
begin
  select status into configuration_status
  from public.term_rate_configurations
  where academic_term_id = target_term_id and domain = 'library_prospectus';
  if configuration_status is null then
    raise exception using errcode = '23514', message = 'Create a Books & Prospectus draft for this term before editing rates.';
  end if;
  if configuration_status <> 'draft' then
    raise exception using errcode = '23514', message = 'Approved Books & Prospectus configuration is locked.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function private.guard_library_rate_draft() from public, anon, authenticated;

create trigger library_term_rates_require_draft
before insert or update or delete on public.library_term_rates
for each row execute function private.guard_library_rate_draft();

create or replace function private.guard_invoice_approved_rates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_term_rate_configuration(new.academic_term_id, 'school_fees');
  if new.invoice_kind = 'end_of_term' then
    perform private.assert_term_rate_configuration(new.academic_term_id, 'library_prospectus');
  end if;
  return new;
end;
$$;
revoke all on function private.guard_invoice_approved_rates() from public, anon, authenticated;

create trigger invoices_require_approved_rates
before insert on public.invoices
for each row execute function private.guard_invoice_approved_rates();

create or replace function public.generate_term_invoices(
  target_academic_year_id bigint,
  target_academic_term_id bigint,
  target_student_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  enrollment_row record;
  outcome jsonb;
  created jsonb := '[]'::jsonb;
  skipped jsonb := '[]'::jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if not exists (
    select 1 from public.academic_terms t
    join public.academic_years y on y.id = t.academic_year_id
    where t.id = target_academic_term_id and y.id = target_academic_year_id
      and t.status = 'active' and y.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'Choose an active academic year and term.';
  end if;
  perform private.assert_term_rate_configuration(target_academic_term_id, 'school_fees');

  if target_student_id is not null then
    begin
      outcome := private.generate_invoice_for_student(
        target_student_id, target_academic_year_id, target_academic_term_id, actor_id
      );
    exception when others then
      outcome := jsonb_build_object('studentId', target_student_id, 'status', 'skipped', 'reason', sqlerrm);
    end;
    if outcome->>'status' = 'created' then
      created := jsonb_build_array(outcome);
    else
      skipped := jsonb_build_array(outcome);
    end if;
  else
    for enrollment_row in
      select distinct se.student_id
      from public.student_enrollments se
      where se.academic_year_id = target_academic_year_id
        and se.academic_term_id = target_academic_term_id
        and se.status = 'active'
      order by se.student_id
    loop
      begin
        outcome := private.generate_invoice_for_student(
          enrollment_row.student_id, target_academic_year_id, target_academic_term_id, actor_id
        );
      exception when others then
        outcome := jsonb_build_object(
          'studentId', enrollment_row.student_id, 'status', 'skipped', 'reason', sqlerrm
        );
      end;
      if outcome->>'status' = 'created' then
        created := created || jsonb_build_array(outcome);
      else
        skipped := skipped || jsonb_build_array(outcome);
      end if;
    end loop;
  end if;

  return jsonb_build_object('createdCount', jsonb_array_length(created), 'created', created, 'skipped', skipped);
end;
$$;
revoke all on function public.generate_term_invoices(bigint, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.generate_term_invoices(bigint, bigint, bigint)
  to authenticated;

create or replace function public.generate_library_term_charges(
  target_academic_term_id bigint,
  target_student_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  enrollment record;
  created_rows jsonb := '[]'::jsonb;
  skipped_rows jsonb := '[]'::jsonb;
  new_charge_id bigint;
begin
  if not (select private.has_permission('library.collections.manage')) then
    raise exception using errcode = '42501', message = 'Library collection permission is required.';
  end if;
  if not exists (
    select 1 from public.academic_terms
    where id = target_academic_term_id and status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'Choose an active academic term.';
  end if;
  perform private.assert_term_rate_configuration(target_academic_term_id, 'library_prospectus');

  perform pg_advisory_xact_lock(hashtextextended('library-term:' || target_academic_term_id::text, 0));
  for enrollment in
    select
      student.id as student_id,
      student_enrollment.id as enrollment_id,
      student_enrollment.academic_year_id,
      student_enrollment.academic_term_id,
      student_enrollment.class_id,
      rate.id as rate_id,
      rate.charge_status,
      rate.amount,
      concat_ws(' ', student.first_name, student.middle_name, student.last_name) as student_name,
      student.admission_number,
      class.name as class_name,
      academic_year.name as academic_year_name,
      academic_term.name as academic_term_name
    from public.student_enrollments student_enrollment
    join public.students student on student.id = student_enrollment.student_id
    join public.classes class on class.id = student_enrollment.class_id
    join public.academic_years academic_year on academic_year.id = student_enrollment.academic_year_id
    join public.academic_terms academic_term on academic_term.id = student_enrollment.academic_term_id
    left join public.library_term_rates rate
      on rate.academic_term_id = student_enrollment.academic_term_id
      and rate.class_id = student_enrollment.class_id
    where student_enrollment.academic_term_id = target_academic_term_id
      and student_enrollment.status = 'active'
      and student.status = 'active'
      and (target_student_id is null or student.id = target_student_id)
    order by student.id
  loop
    if enrollment.rate_id is null then
      skipped_rows := skipped_rows || jsonb_build_array(jsonb_build_object(
        'studentId', enrollment.student_id,
        'reason', 'Books & Prospectus is not configured for this class.'
      ));
      continue;
    end if;
    if enrollment.charge_status = 'not_charged' then
      skipped_rows := skipped_rows || jsonb_build_array(jsonb_build_object(
        'studentId', enrollment.student_id,
        'reason', 'This class is not charged for Books & Prospectus.'
      ));
      continue;
    end if;
    if exists (
      select 1 from public.library_charges
      where student_id = enrollment.student_id
        and academic_term_id = enrollment.academic_term_id
    ) then
      skipped_rows := skipped_rows || jsonb_build_array(jsonb_build_object(
        'studentId', enrollment.student_id,
        'reason', 'A Library charge already exists for this term.'
      ));
      continue;
    end if;

    insert into public.library_charges (
      student_id, enrollment_id, academic_year_id, academic_term_id, class_id,
      term_rate_id, student_name_snapshot, admission_number_snapshot,
      class_name_snapshot, academic_year_name_snapshot, academic_term_name_snapshot,
      expected_amount, created_by, updated_by
    ) values (
      enrollment.student_id, enrollment.enrollment_id, enrollment.academic_year_id,
      enrollment.academic_term_id, enrollment.class_id, enrollment.rate_id,
      enrollment.student_name, enrollment.admission_number, enrollment.class_name,
      enrollment.academic_year_name, enrollment.academic_term_name,
      enrollment.amount, actor_id, actor_id
    )
    returning id into new_charge_id;
    created_rows := created_rows || jsonb_build_array(jsonb_build_object(
      'studentId', enrollment.student_id,
      'chargeId', new_charge_id
    ));
  end loop;

  return jsonb_build_object(
    'ok', true,
    'createdCount', jsonb_array_length(created_rows),
    'created', created_rows,
    'skipped', skipped_rows
  );
end;
$$;
revoke all on function public.generate_library_term_charges(bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.generate_library_term_charges(bigint, bigint)
  to authenticated;

comment on table public.term_rate_configurations is
  'Audited draft/approval state for school-fee and Books & Prospectus term rates.';
comment on function public.prepare_term_rate_configuration(bigint, text) is
  'Creates an editable term-rate draft and copies the immediately previous approved term.';
comment on function public.approve_term_rate_configuration(bigint, text) is
  'Validates completeness, approves and permanently locks a term-rate configuration.';
