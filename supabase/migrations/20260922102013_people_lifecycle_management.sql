set lock_timeout = '5s';

insert into public.permissions (code, description)
values (
  'people.lifecycle.manage',
  'Remove staff and students from active school operations while preserving audited history'
)
on conflict (code) do update
set description = excluded.description;

delete from public.role_permissions
where permission_code = 'people.lifecycle.manage'
  and role_code not in ('SUPER_ADMIN', 'MANAGEMENT');

insert into public.role_permissions (role_code, permission_code)
values
  ('SUPER_ADMIN', 'people.lifecycle.manage'),
  ('MANAGEMENT', 'people.lifecycle.manage')
on conflict (role_code, permission_code) do nothing;

alter table public.staff
  add column employment_ended_on date,
  add column removal_reason text,
  add column removed_at timestamptz,
  add column removed_by uuid references public.profiles(id) on delete restrict,
  add constraint staff_removal_reason_check check (
    removal_reason is null
    or char_length(btrim(removal_reason)) between 5 and 300
  );

create index staff_removed_by_idx
  on public.staff (removed_by)
  where removed_by is not null;

alter table public.students
  add column school_exit_on date,
  add column school_exit_reason text,
  add column school_exit_recorded_at timestamptz,
  add column school_exit_recorded_by uuid references public.profiles(id) on delete restrict,
  add constraint students_school_exit_reason_check check (
    school_exit_reason is null
    or char_length(btrim(school_exit_reason)) between 5 and 300
  );

create index students_school_exit_recorded_by_idx
  on public.students (school_exit_recorded_by)
  where school_exit_recorded_by is not null;

create or replace function private.ensure_active_staff_salary_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_status text;
begin
  select status into staff_status
  from public.staff
  where id = new.staff_id
  for update;

  if staff_status is distinct from 'active' then
    raise exception using errcode = '23514',
      message = 'Salary records can only be posted for active staff.';
  end if;

  return new;
end;
$$;

revoke all on function private.ensure_active_staff_salary_record()
  from public, anon, authenticated;

create trigger salary_records_active_staff_guard
before insert on public.salary_records
for each row execute function private.ensure_active_staff_salary_record();

create or replace function private.ensure_active_student_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_status text;
begin
  select status into student_status
  from public.students
  where id = new.student_id
  for update;

  if student_status is distinct from 'active' then
    raise exception using errcode = '23514',
      message = 'Invoices can only be generated for active students.';
  end if;

  return new;
end;
$$;

revoke all on function private.ensure_active_student_invoice()
  from public, anon, authenticated;

create trigger invoices_active_student_guard
before insert on public.invoices
for each row execute function private.ensure_active_student_invoice();

create or replace function public.remove_staff_from_school(
  target_staff_id bigint,
  target_effective_on date,
  target_reason text,
  target_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_name text;
  staff_record public.staff%rowtype;
  normalized_reason text := nullif(btrim(target_reason), '');
  salary_end_month date;
  reversible_salary_ids bigint[] := '{}'::bigint[];
  assignment_count integer := 0;
  salary_configuration_count integer := 0;
  reversed_salary_count integer := 0;
  preserved_salary_count integer := 0;
begin
  if actor_id is null
    or not (select private.has_permission('people.lifecycle.manage')) then
    raise exception using errcode = '42501',
      message = 'People lifecycle permission is required.';
  end if;

  if target_effective_on is null or target_effective_on > current_date then
    raise exception using errcode = '22023',
      message = 'Choose today or an earlier employment end date.';
  end if;

  if normalized_reason is null
    or char_length(normalized_reason) not between 5 and 300 then
    raise exception using errcode = '22023',
      message = 'Enter a removal reason between 5 and 300 characters.';
  end if;

  select * into staff_record
  from public.staff
  where id = target_staff_id
  for update;

  if not found or staff_record.status <> 'active' then
    raise exception using errcode = '22023',
      message = 'Choose an active staff member.';
  end if;

  if lower(btrim(coalesce(target_confirmation, '')))
    <> lower(staff_record.staff_number) then
    raise exception using errcode = '22023',
      message = 'Type the staff ID exactly to confirm removal.';
  end if;

  if staff_record.date_joined is not null
    and target_effective_on < staff_record.date_joined then
    raise exception using errcode = '22023',
      message = 'The employment end date cannot be before the join date.';
  end if;

  perform 1
  from public.staff_assignments
  where staff_id = target_staff_id and status = 'active'
  order by id
  for update;

  perform 1
  from public.staff_salary_configurations
  where staff_id = target_staff_id and status = 'active'
  order by id
  for update;

  perform 1
  from public.salary_records
  where staff_id = target_staff_id and status = 'active'
  order by id
  for update;

  select coalesce(array_agg(record.id order by record.id), '{}'::bigint[])
  into reversible_salary_ids
  from public.salary_records record
  where record.staff_id = target_staff_id
    and record.status = 'active'
    and not exists (
      select 1
      from public.expenses expense
      where expense.salary_record_id = record.id
        and expense.status = 'active'
    );

  select count(*)::integer
  into preserved_salary_count
  from public.salary_records record
  where record.staff_id = target_staff_id
    and record.status = 'active'
    and exists (
      select 1
      from public.expenses expense
      where expense.salary_record_id = record.id
        and expense.status = 'active'
    );

  select coalesce(nullif(btrim(display_name), ''), 'Authorized administrator')
  into actor_name
  from public.profiles
  where id = actor_id;

  update public.salary_deductions
  set
    status = 'reversed',
    reversal_number = private.allocate_document_number('REV'),
    reversal_reason = left(
      'Staff removed from active school operations: ' || normalized_reason,
      500
    ),
    reversed_at = now(),
    reversed_by = actor_id,
    reversed_by_name_snapshot = actor_name,
    updated_by = actor_id
  where salary_record_id = any(reversible_salary_ids)
    and status = 'active';

  update public.salary_records
  set
    status = 'reversed',
    reversal_number = private.allocate_document_number('REV'),
    reversal_reason = left(
      'Staff removed from active school operations: ' || normalized_reason,
      500
    ),
    reversed_at = now(),
    reversed_by = actor_id,
    reversed_by_name_snapshot = actor_name,
    updated_by = actor_id
  where id = any(reversible_salary_ids)
    and status = 'active';
  get diagnostics reversed_salary_count = row_count;

  update public.staff_assignments
  set
    status = 'completed',
    ended_on = greatest(target_effective_on, started_on),
    updated_by = actor_id
  where staff_id = target_staff_id
    and status = 'active';
  get diagnostics assignment_count = row_count;

  salary_end_month := date_trunc('month', target_effective_on)::date;
  update public.staff_salary_configurations
  set
    status = 'ended',
    effective_to = greatest(salary_end_month, effective_from),
    end_reason = left(
      'Staff removed from active school operations: ' || normalized_reason,
      500
    ),
    updated_by = actor_id
  where staff_id = target_staff_id
    and status = 'active';
  get diagnostics salary_configuration_count = row_count;

  update public.staff
  set
    status = 'archived',
    employment_ended_on = target_effective_on,
    removal_reason = normalized_reason,
    removed_at = now(),
    removed_by = actor_id,
    updated_by = actor_id
  where id = target_staff_id;

  return jsonb_build_object(
    'staffId', target_staff_id,
    'assignmentsEnded', assignment_count,
    'salaryConfigurationsEnded', salary_configuration_count,
    'unpaidSalaryRecordsReversed', reversed_salary_count,
    'paidSalaryRecordsPreserved', preserved_salary_count
  );
end;
$$;

revoke all on function public.remove_staff_from_school(bigint, date, text, text)
  from public, anon, authenticated;
grant execute on function public.remove_staff_from_school(bigint, date, text, text)
  to authenticated;

create or replace function public.end_student_active_status(
  target_student_id bigint,
  target_exit_status text,
  target_effective_on date,
  target_reason text,
  target_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  student_record public.students%rowtype;
  enrollment_record public.student_enrollments%rowtype;
  normalized_reason text := nullif(btrim(target_reason), '');
  enrollment_status text;
  cancelled_invoice_count integer := 0;
  paid_invoice_count integer := 0;
begin
  if actor_id is null
    or not (select private.has_permission('people.lifecycle.manage')) then
    raise exception using errcode = '42501',
      message = 'People lifecycle permission is required.';
  end if;

  if target_exit_status not in ('inactive', 'graduated', 'withdrawn') then
    raise exception using errcode = '22023',
      message = 'Choose inactive, graduated or withdrawn.';
  end if;

  if target_effective_on is null or target_effective_on > current_date then
    raise exception using errcode = '22023',
      message = 'Choose today or an earlier school exit date.';
  end if;

  if normalized_reason is null
    or char_length(normalized_reason) not between 5 and 300 then
    raise exception using errcode = '22023',
      message = 'Enter an exit reason between 5 and 300 characters.';
  end if;

  select * into student_record
  from public.students
  where id = target_student_id
  for update;

  if not found or student_record.status <> 'active' then
    raise exception using errcode = '22023',
      message = 'Choose an active student.';
  end if;

  if lower(btrim(coalesce(target_confirmation, '')))
    <> lower(student_record.admission_number) then
    raise exception using errcode = '22023',
      message = 'Type the admission number exactly to confirm the exit.';
  end if;

  select * into enrollment_record
  from public.student_enrollments
  where student_id = target_student_id and status = 'active'
  for update;

  if not found then
    raise exception using errcode = '22023',
      message = 'The student has no active enrollment to end.';
  end if;

  if target_effective_on < enrollment_record.started_on then
    raise exception using errcode = '22023',
      message = 'The school exit date cannot be before the enrollment start date.';
  end if;

  perform 1
  from public.invoices
  where student_id = target_student_id
    and status in ('unpaid', 'partially_paid')
  order by id
  for update;

  enrollment_status := case
    when target_exit_status = 'graduated' then 'completed'
    else 'withdrawn'
  end;

  update public.student_enrollments
  set
    status = enrollment_status,
    ended_on = target_effective_on,
    updated_by = actor_id
  where id = enrollment_record.id;

  update public.invoices
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = actor_id,
    cancellation_reason = left(
      'Student left active school operations: ' || normalized_reason,
      500
    ),
    updated_by = actor_id
  where student_id = target_student_id
    and status in ('unpaid', 'partially_paid');
  get diagnostics cancelled_invoice_count = row_count;

  select count(*)::integer
  into paid_invoice_count
  from public.invoices
  where student_id = target_student_id
    and status = 'paid';

  update public.students
  set
    status = target_exit_status,
    school_exit_on = target_effective_on,
    school_exit_reason = normalized_reason,
    school_exit_recorded_at = now(),
    school_exit_recorded_by = actor_id,
    updated_by = actor_id
  where id = target_student_id;

  return jsonb_build_object(
    'studentId', target_student_id,
    'status', target_exit_status,
    'invoicesCancelled', cancelled_invoice_count,
    'paidInvoicesPreserved', paid_invoice_count
  );
end;
$$;

revoke all on function public.end_student_active_status(bigint, text, date, text, text)
  from public, anon, authenticated;
grant execute on function public.end_student_active_status(bigint, text, date, text, text)
  to authenticated;

reset lock_timeout;
