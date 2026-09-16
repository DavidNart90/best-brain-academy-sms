-- End-of-term billing: immutable next-term invoice snapshots with bounded, retry-safe generation.

insert into public.permissions(code, description)
values
  ('finance.end_term_invoices.read', 'View and print end-of-term invoices'),
  ('finance.end_term_invoices.manage', 'Configure and generate end-of-term invoices')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions(role_code, permission_code)
values
  ('SUPER_ADMIN', 'finance.end_term_invoices.read'),
  ('SUPER_ADMIN', 'finance.end_term_invoices.manage'),
  ('ACCOUNTANT', 'finance.end_term_invoices.read'),
  ('ACCOUNTANT', 'finance.end_term_invoices.manage'),
  ('ADMINISTRATOR', 'finance.end_term_invoices.read'),
  ('ADMINISTRATOR', 'finance.end_term_invoices.manage'),
  ('MANAGEMENT', 'finance.end_term_invoices.read')
on conflict (role_code, permission_code) do nothing;

create table public.end_term_invoice_configurations (
  id bigint generated always as identity primary key,
  source_academic_term_id bigint not null references public.academic_terms(id) on delete restrict,
  target_academic_term_id bigint not null references public.academic_terms(id) on delete restrict,
  parent_notes text not null default '' check (char_length(parent_notes) <= 2000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_term_invoice_configurations_distinct_terms
    check (source_academic_term_id <> target_academic_term_id),
  unique (source_academic_term_id, target_academic_term_id)
);

create index end_term_invoice_configurations_target_idx
  on public.end_term_invoice_configurations (target_academic_term_id, source_academic_term_id);
create index end_term_invoice_configurations_created_by_idx
  on public.end_term_invoice_configurations (created_by);
create index end_term_invoice_configurations_updated_by_idx
  on public.end_term_invoice_configurations (updated_by);

create trigger end_term_invoice_configurations_stamp
before insert or update on public.end_term_invoice_configurations
for each row execute function private.stamp_configuration_record();

create trigger end_term_invoice_configurations_audit
after insert or update or delete on public.end_term_invoice_configurations
for each row execute function private.write_configuration_audit();

alter table public.end_term_invoice_configurations enable row level security;
revoke all on public.end_term_invoice_configurations from public, anon, authenticated;
grant select on public.end_term_invoice_configurations to authenticated;

create policy end_term_invoice_configurations_read_authorized
  on public.end_term_invoice_configurations for select to authenticated
  using ((select private.has_permission('finance.end_term_invoices.read')));

alter table public.invoices
  add column invoice_kind text not null default 'term',
  add column end_term_configuration_id bigint references public.end_term_invoice_configurations(id) on delete restrict,
  add column source_academic_term_id bigint references public.academic_terms(id) on delete restrict,
  add column previous_balance_snapshot numeric(14, 2) not null default 0,
  add column prospectus_amount_snapshot numeric(14, 2) not null default 0,
  add column parent_notes_snapshot text,
  add constraint invoices_kind_check check (invoice_kind in ('term', 'end_of_term')),
  add constraint invoices_end_term_snapshot_amounts_check check (
    previous_balance_snapshot >= 0
    and previous_balance_snapshot = round(previous_balance_snapshot, 2)
    and prospectus_amount_snapshot >= 0
    and prospectus_amount_snapshot = round(prospectus_amount_snapshot, 2)
  ),
  add constraint invoices_end_term_snapshot_shape_check check (
    (
      invoice_kind = 'term'
      and end_term_configuration_id is null
      and source_academic_term_id is null
      and previous_balance_snapshot = 0
      and prospectus_amount_snapshot = 0
      and parent_notes_snapshot is null
    )
    or
    (
      invoice_kind = 'end_of_term'
      and end_term_configuration_id is not null
      and source_academic_term_id is not null
      and (parent_notes_snapshot is null or char_length(parent_notes_snapshot) <= 2000)
    )
  );

create index invoices_end_term_configuration_idx
  on public.invoices (end_term_configuration_id, class_id, student_id)
  where invoice_kind = 'end_of_term';
create index invoices_source_term_idx
  on public.invoices (source_academic_term_id, student_id)
  where invoice_kind = 'end_of_term';

create policy invoices_read_end_term_authorized
  on public.invoices for select to authenticated
  using (
    invoice_kind = 'end_of_term'
    and (select private.has_permission('finance.end_term_invoices.read'))
  );

create policy invoice_lines_read_end_term_authorized
  on public.invoice_lines for select to authenticated
  using (
    (select private.has_permission('finance.end_term_invoices.read'))
    and exists (
      select 1
      from public.invoices invoice
      where invoice.id = invoice_lines.invoice_id
        and invoice.invoice_kind = 'end_of_term'
    )
  );

create function private.preserve_end_term_invoice_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.invoice_kind := old.invoice_kind;
  new.end_term_configuration_id := old.end_term_configuration_id;
  new.source_academic_term_id := old.source_academic_term_id;
  new.previous_balance_snapshot := old.previous_balance_snapshot;
  new.prospectus_amount_snapshot := old.prospectus_amount_snapshot;
  new.parent_notes_snapshot := old.parent_notes_snapshot;
  return new;
end;
$$;
revoke all on function private.preserve_end_term_invoice_snapshot()
  from public, anon, authenticated;

create trigger invoices_preserve_end_term_snapshot
before update on public.invoices
for each row execute function private.preserve_end_term_invoice_snapshot();

create function private.next_active_academic_term(source_term_id bigint)
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
  with source as (
    select term.sequence, year.starts_on
    from public.academic_terms term
    join public.academic_years year on year.id = term.academic_year_id
    where term.id = source_term_id
  )
  select term.id, year.id, year.name, term.name
  from public.academic_terms term
  join public.academic_years year on year.id = term.academic_year_id
  cross join source
  where term.status = 'active'
    and year.status = 'active'
    and (
      year.starts_on > source.starts_on
      or (year.starts_on = source.starts_on and term.sequence > source.sequence)
    )
  order by year.starts_on, term.sequence, term.id
  limit 1;
$$;
revoke all on function private.next_active_academic_term(bigint)
  from public, anon, authenticated;

create function public.get_end_term_invoice_setup(target_source_academic_term_id bigint default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  source_term record;
  target_term record;
  configuration record;
  source_student_count integer := 0;
  generated_count integer := 0;
  missing_school_fee_count integer := 0;
  missing_prospectus_count integer := 0;
begin
  if (select auth.uid()) is null
    or not (select private.has_permission('finance.end_term_invoices.read')) then
    raise exception using errcode = '42501', message = 'End-of-term invoice read permission is required.';
  end if;

  select term.id, term.academic_year_id, term.name, term.sequence, year.name as academic_year_name
  into source_term
  from public.academic_terms term
  join public.academic_years year on year.id = term.academic_year_id
  where term.id = coalesce(
    target_source_academic_term_id,
    (select id from public.academic_terms where is_current limit 1)
  );
  if source_term.id is null then
    raise exception using errcode = '22023', message = 'Choose a valid source academic term.';
  end if;

  select * into target_term from private.next_active_academic_term(source_term.id);
  if target_term.academic_term_id is null then
    return jsonb_build_object(
      'ready', false,
      'sourceTermId', source_term.id,
      'sourceTermName', source_term.name,
      'sourceAcademicYearName', source_term.academic_year_name,
      'reason', 'The next active academic term has not been configured.'
    );
  end if;

  select * into configuration
  from public.end_term_invoice_configurations config
  where config.source_academic_term_id = source_term.id
    and config.target_academic_term_id = target_term.academic_term_id;

  with candidates as (
    select enrollment.student_id, enrollment.class_id, enrollment.school_location_id
    from public.student_enrollments enrollment
    join public.students student on student.id = enrollment.student_id
    where source_term.academic_year_id = target_term.academic_year_id
      and enrollment.academic_term_id = source_term.id
      and enrollment.status = 'active'
      and student.status = 'active'
    union all
    select enrollment.student_id, enrollment.class_id, enrollment.school_location_id
    from public.student_enrollments enrollment
    join public.students student on student.id = enrollment.student_id
    where source_term.academic_year_id <> target_term.academic_year_id
      and enrollment.academic_term_id = target_term.academic_term_id
      and enrollment.status = 'active'
      and student.status = 'active'
  )
  select
    count(*)::integer,
    count(*) filter (where base_rate.id is null or transport_rate.id is null)::integer,
    count(*) filter (where prospectus_rate.id is null)::integer
  into source_student_count, missing_school_fee_count, missing_prospectus_count
  from candidates candidate
  left join public.fee_components base_component on base_component.code = 'base_class_fee'
  left join public.fee_component_rates base_rate
    on base_rate.fee_component_id = base_component.id
    and base_rate.academic_year_id = target_term.academic_year_id
    and base_rate.academic_term_id = target_term.academic_term_id
    and base_rate.class_id = candidate.class_id
    and base_rate.status = 'active'
  left join public.fee_components transport_component on transport_component.code = 'location_transport_charge'
  left join public.fee_component_rates transport_rate
    on transport_rate.fee_component_id = transport_component.id
    and transport_rate.academic_year_id = target_term.academic_year_id
    and transport_rate.academic_term_id = target_term.academic_term_id
    and transport_rate.school_location_id = candidate.school_location_id
    and transport_rate.status = 'active'
  left join public.library_term_rates prospectus_rate
    on prospectus_rate.academic_term_id = target_term.academic_term_id
    and prospectus_rate.class_id = candidate.class_id;

  if configuration.id is not null then
    select count(*)::integer into generated_count
    from public.invoices invoice
    where invoice.end_term_configuration_id = configuration.id
      and invoice.invoice_kind = 'end_of_term'
      and invoice.status <> 'cancelled';
  end if;

  return jsonb_build_object(
    'ready', configuration.id is not null
      and source_student_count > 0
      and missing_school_fee_count = 0
      and missing_prospectus_count = 0,
    'sourceTermId', source_term.id,
    'sourceTermName', source_term.name,
    'sourceAcademicYearId', source_term.academic_year_id,
    'sourceAcademicYearName', source_term.academic_year_name,
    'targetTermId', target_term.academic_term_id,
    'targetTermName', target_term.academic_term_name,
    'targetAcademicYearId', target_term.academic_year_id,
    'targetAcademicYearName', target_term.academic_year_name,
    'configurationId', configuration.id,
    'parentNotes', coalesce(configuration.parent_notes, ''),
    'studentCount', source_student_count,
    'generatedCount', generated_count,
    'remainingCount', greatest(source_student_count - generated_count, 0),
    'missingSchoolFeeCount', missing_school_fee_count,
    'missingProspectusCount', missing_prospectus_count,
    'reason', case
      when configuration.id is null then 'Save the parent note before generation.'
      when source_student_count = 0 then 'No active students are available for the next-term invoice run.'
      when missing_school_fee_count > 0 then 'Next-term school fees are incomplete for one or more student classes or locations.'
      when missing_prospectus_count > 0 then 'Next-term Books & Prospectus settings are incomplete for one or more classes.'
      else null
    end
  );
end;
$$;
revoke all on function public.get_end_term_invoice_setup(bigint)
  from public, anon, authenticated;
grant execute on function public.get_end_term_invoice_setup(bigint) to authenticated;

create function public.save_end_term_invoice_configuration(
  target_source_academic_term_id bigint,
  target_parent_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_term record;
  existing_configuration record;
  saved_id bigint;
  clean_notes text := btrim(coalesce(target_parent_notes, ''));
begin
  if actor_id is null
    or not (select private.has_permission('finance.end_term_invoices.manage')) then
    raise exception using errcode = '42501', message = 'End-of-term invoice management permission is required.';
  end if;
  if char_length(clean_notes) > 2000 then
    raise exception using errcode = '22023', message = 'The parent note must be 2,000 characters or fewer.';
  end if;

  select * into target_term from private.next_active_academic_term(target_source_academic_term_id);
  if target_term.academic_term_id is null then
    raise exception using errcode = '22023', message = 'Configure the next active academic term first.';
  end if;

  select * into existing_configuration
  from public.end_term_invoice_configurations config
  where config.source_academic_term_id = target_source_academic_term_id
    and config.target_academic_term_id = target_term.academic_term_id
  for update;

  if existing_configuration.id is not null and exists (
    select 1 from public.invoices invoice
    where invoice.end_term_configuration_id = existing_configuration.id
      and invoice.invoice_kind = 'end_of_term'
  ) then
    if existing_configuration.parent_notes is distinct from clean_notes then
      raise exception using errcode = '22023',
        message = 'The parent note is locked because invoices have already been generated.';
    end if;
    saved_id := existing_configuration.id;
  elsif existing_configuration.id is not null then
    update public.end_term_invoice_configurations
    set parent_notes = clean_notes, updated_by = actor_id
    where id = existing_configuration.id
    returning id into saved_id;
  else
    insert into public.end_term_invoice_configurations (
      source_academic_term_id, target_academic_term_id, parent_notes, created_by, updated_by
    ) values (
      target_source_academic_term_id, target_term.academic_term_id, clean_notes, actor_id, actor_id
    ) returning id into saved_id;
  end if;

  return jsonb_build_object('ok', true, 'configurationId', saved_id);
end;
$$;
revoke all on function public.save_end_term_invoice_configuration(bigint, text)
  from public, anon, authenticated;
grant execute on function public.save_end_term_invoice_configuration(bigint, text) to authenticated;

create function private.generate_end_term_invoice_for_student(
  target_student_id bigint,
  source_term_id bigint,
  target_term_id bigint,
  configuration_id bigint,
  actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_year_id bigint;
  target_year_id bigint;
  enrollment record;
  student record;
  base_rate record;
  transport_rate record;
  prospectus_rate record;
  configuration record;
  previous_balance numeric(14, 2) := 0;
  new_invoice_id bigint;
  new_invoice_number text;
  transport_label text;
begin
  select academic_year_id into source_year_id from public.academic_terms where id = source_term_id;
  select academic_year_id into target_year_id from public.academic_terms where id = target_term_id;

  if exists (
    select 1 from public.invoices
    where student_id = target_student_id
      and academic_year_id = target_year_id
      and academic_term_id = target_term_id
      and status <> 'cancelled'
  ) then
    return jsonb_build_object(
      'studentId', target_student_id,
      'status', 'skipped',
      'reason', 'An active invoice already exists for this student and next term.'
    );
  end if;

  select enrollment_row.class_id, enrollment_row.school_location_id
  into enrollment
  from public.student_enrollments enrollment_row
  where enrollment_row.student_id = target_student_id
    and enrollment_row.academic_term_id = case
      when source_year_id = target_year_id then source_term_id else target_term_id
    end
    and enrollment_row.status = 'active';
  if enrollment.class_id is null then
    return jsonb_build_object(
      'studentId', target_student_id,
      'status', 'skipped',
      'reason', 'No eligible active enrollment is available for this student.'
    );
  end if;

  select active_student.id, active_student.admission_number,
    concat_ws(' ', active_student.first_name, active_student.middle_name, active_student.last_name) as full_name
  into student
  from public.students active_student
  where active_student.id = target_student_id and active_student.status = 'active';
  if student.id is null then
    return jsonb_build_object(
      'studentId', target_student_id,
      'status', 'skipped',
      'reason', 'The student is not active.'
    );
  end if;

  select rate.id, rate.amount, component.id as component_id
  into base_rate
  from public.fee_component_rates rate
  join public.fee_components component on component.id = rate.fee_component_id
  where component.code = 'base_class_fee'
    and rate.class_id = enrollment.class_id
    and rate.academic_year_id = target_year_id
    and rate.academic_term_id = target_term_id
    and rate.status = 'active';

  select rate.id, rate.amount, component.id as component_id
  into transport_rate
  from public.fee_component_rates rate
  join public.fee_components component on component.id = rate.fee_component_id
  where component.code = 'location_transport_charge'
    and rate.school_location_id = enrollment.school_location_id
    and rate.academic_year_id = target_year_id
    and rate.academic_term_id = target_term_id
    and rate.status = 'active';

  select rate.id, rate.charge_status, rate.amount
  into prospectus_rate
  from public.library_term_rates rate
  where rate.academic_term_id = target_term_id
    and rate.class_id = enrollment.class_id;

  if base_rate.amount is null or transport_rate.amount is null then
    return jsonb_build_object(
      'studentId', target_student_id,
      'status', 'skipped',
      'reason', 'Next-term school fees are not configured for this class or location.'
    );
  end if;
  if prospectus_rate.id is null then
    return jsonb_build_object(
      'studentId', target_student_id,
      'status', 'skipped',
      'reason', 'Next-term Books & Prospectus is not configured for this class.'
    );
  end if;

  select * into configuration
  from public.end_term_invoice_configurations config
  where config.id = configuration_id
    and config.source_academic_term_id = source_term_id
    and config.target_academic_term_id = target_term_id;
  if configuration.id is null then
    raise exception using errcode = '22023', message = 'The end-of-term invoice setup is unavailable.';
  end if;

  select coalesce(sum(invoice.outstanding), 0)
  into previous_balance
  from public.invoices invoice
  where invoice.student_id = target_student_id
    and invoice.academic_term_id = source_term_id
    and invoice.status <> 'cancelled';

  select location_charge_label into transport_label from public.school_settings where id = 1;
  new_invoice_number := private.allocate_document_number('INV');

  insert into public.invoices (
    invoice_number, student_id, academic_year_id, academic_term_id, class_id, school_location_id,
    student_name_snapshot, admission_number_snapshot, class_name_snapshot, location_name_snapshot,
    subtotal, total, invoice_kind, end_term_configuration_id, source_academic_term_id,
    previous_balance_snapshot, prospectus_amount_snapshot, parent_notes_snapshot,
    created_by, updated_by
  )
  select
    new_invoice_number, student.id, target_year_id, target_term_id,
    enrollment.class_id, enrollment.school_location_id,
    student.full_name, student.admission_number, class.name, location.name,
    base_rate.amount + transport_rate.amount, base_rate.amount + transport_rate.amount,
    'end_of_term', configuration.id, source_term_id, previous_balance,
    case when prospectus_rate.charge_status = 'chargeable' then prospectus_rate.amount else 0 end,
    nullif(configuration.parent_notes, ''), actor_id, actor_id
  from public.classes class
  cross join public.school_locations location
  where class.id = enrollment.class_id and location.id = enrollment.school_location_id
  returning id into new_invoice_id;

  insert into public.invoice_lines (
    invoice_id, fee_component_id, description, amount, sort_order, created_by, updated_by
  ) values
    (new_invoice_id, base_rate.component_id, 'Base Class Fee', base_rate.amount, 1, actor_id, actor_id),
    (new_invoice_id, transport_rate.component_id,
      coalesce(transport_label, 'Location / Transport Charge'), transport_rate.amount, 2, actor_id, actor_id);

  return jsonb_build_object(
    'studentId', student.id,
    'status', 'created',
    'invoiceId', new_invoice_id,
    'invoiceNumber', new_invoice_number
  );
exception when unique_violation then
  return jsonb_build_object(
    'studentId', target_student_id,
    'status', 'skipped',
    'reason', 'An active invoice already exists for this student and next term.'
  );
end;
$$;
revoke all on function private.generate_end_term_invoice_for_student(bigint, bigint, bigint, bigint, uuid)
  from public, anon, authenticated;

create function public.generate_end_term_invoices(
  target_source_academic_term_id bigint,
  target_class_id bigint default null,
  after_student_id bigint default null,
  target_batch_size integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  source_year_id bigint;
  target_term record;
  configuration record;
  candidate record;
  outcome jsonb;
  created_rows jsonb := '[]'::jsonb;
  skipped_rows jsonb := '[]'::jsonb;
  last_student_id bigint;
  more_rows boolean := false;
begin
  if actor_id is null
    or not (select private.has_permission('finance.end_term_invoices.manage')) then
    raise exception using errcode = '42501', message = 'End-of-term invoice management permission is required.';
  end if;
  if target_batch_size < 1 or target_batch_size > 100 then
    raise exception using errcode = '22023', message = 'Choose a batch size from 1 to 100.';
  end if;

  select academic_year_id into source_year_id
  from public.academic_terms where id = target_source_academic_term_id and status = 'active';
  if source_year_id is null then
    raise exception using errcode = '22023', message = 'Choose an active source academic term.';
  end if;
  select * into target_term from private.next_active_academic_term(target_source_academic_term_id);
  if target_term.academic_term_id is null then
    raise exception using errcode = '22023', message = 'Configure the next active academic term first.';
  end if;

  select * into configuration
  from public.end_term_invoice_configurations config
  where config.source_academic_term_id = target_source_academic_term_id
    and config.target_academic_term_id = target_term.academic_term_id;
  if configuration.id is null then
    raise exception using errcode = '22023', message = 'Save the end-of-term invoice setup before generation.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('end-term-invoices:' || configuration.id::text, 0));

  for candidate in
    with candidates as (
      select enrollment.student_id, enrollment.class_id
      from public.student_enrollments enrollment
      join public.students student on student.id = enrollment.student_id
      where source_year_id = target_term.academic_year_id
        and enrollment.academic_term_id = target_source_academic_term_id
        and enrollment.status = 'active'
        and student.status = 'active'
      union all
      select enrollment.student_id, enrollment.class_id
      from public.student_enrollments enrollment
      join public.students student on student.id = enrollment.student_id
      where source_year_id <> target_term.academic_year_id
        and enrollment.academic_term_id = target_term.academic_term_id
        and enrollment.status = 'active'
        and student.status = 'active'
    )
    select distinct student_id, class_id
    from candidates
    where student_id > coalesce(after_student_id, 0)
      and (target_class_id is null or class_id = target_class_id)
    order by student_id
    limit target_batch_size
  loop
    last_student_id := candidate.student_id;
    begin
      outcome := private.generate_end_term_invoice_for_student(
        candidate.student_id,
        target_source_academic_term_id,
        target_term.academic_term_id,
        configuration.id,
        actor_id
      );
    exception when others then
      outcome := jsonb_build_object(
        'studentId', candidate.student_id,
        'status', 'skipped',
        'reason', sqlerrm
      );
    end;
    if outcome->>'status' = 'created' then
      created_rows := created_rows || jsonb_build_array(outcome);
    else
      skipped_rows := skipped_rows || jsonb_build_array(outcome);
    end if;
  end loop;

  if last_student_id is not null then
    with candidates as (
      select enrollment.student_id, enrollment.class_id
      from public.student_enrollments enrollment
      join public.students student on student.id = enrollment.student_id
      where source_year_id = target_term.academic_year_id
        and enrollment.academic_term_id = target_source_academic_term_id
        and enrollment.status = 'active'
        and student.status = 'active'
      union all
      select enrollment.student_id, enrollment.class_id
      from public.student_enrollments enrollment
      join public.students student on student.id = enrollment.student_id
      where source_year_id <> target_term.academic_year_id
        and enrollment.academic_term_id = target_term.academic_term_id
        and enrollment.status = 'active'
        and student.status = 'active'
    )
    select exists (
      select 1 from candidates
      where student_id > last_student_id
        and (target_class_id is null or class_id = target_class_id)
    ) into more_rows;
  end if;

  return jsonb_build_object(
    'createdCount', jsonb_array_length(created_rows),
    'created', created_rows,
    'skipped', skipped_rows,
    'nextCursor', last_student_id,
    'hasMore', more_rows,
    'batchSize', target_batch_size
  );
end;
$$;
revoke all on function public.generate_end_term_invoices(bigint, bigint, bigint, integer)
  from public, anon, authenticated;
grant execute on function public.generate_end_term_invoices(bigint, bigint, bigint, integer)
  to authenticated;

comment on table public.end_term_invoice_configurations is
  'One immutable parent-note configuration per source and next academic term; direct writes are closed.';
comment on function public.generate_end_term_invoices(bigint, bigint, bigint, integer) is
  'Generates at most 100 retry-safe next-term invoices per call and returns a student cursor for the next batch.';
