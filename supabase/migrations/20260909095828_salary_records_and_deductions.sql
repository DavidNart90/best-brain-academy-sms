-- Phase 4 salary register: effective-dated deduction settings, monthly salary
-- snapshots, retry-safe posting and audited reversals. This is deliberately not
-- a tax, pension, payslip or automated payroll engine.

set lock_timeout = '5s';

alter table private.document_number_counters
  drop constraint if exists document_number_counters_document_type_check;
alter table private.document_number_counters
  add constraint document_number_counters_document_type_check check (
    document_type in ('INV', 'PAY', 'RCT', 'EXP', 'REV', 'SAL', 'DED')
  );

create or replace function private.allocate_document_number(target_document_type text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_year smallint := extract(year from current_date)::smallint;
  allocated bigint;
  prefix text;
begin
  prefix := case target_document_type
    when 'INV' then 'BBA/INV'
    when 'PAY' then 'BBA/PAY'
    when 'RCT' then 'BBA/RCT'
    when 'EXP' then 'BBA/EXP'
    when 'REV' then 'BBA/REV'
    when 'SAL' then 'BBA/SAL'
    when 'DED' then 'BBA/DED'
    else null
  end;
  if prefix is null then
    raise exception using errcode = '22023', message = 'Unknown document type.';
  end if;
  insert into private.document_number_counters (document_type, counter_year, next_value)
  values (target_document_type, current_year, 1)
  on conflict (document_type, counter_year) do nothing;
  update private.document_number_counters
  set next_value = next_value + 1
  where document_type = target_document_type and counter_year = current_year
  returning next_value - 1 into allocated;
  return prefix || '/' || current_year || '/' || lpad(allocated::text, 5, '0');
end;
$$;
revoke all on function private.allocate_document_number(text) from public, anon, authenticated;

alter table private.finance_requests
  drop constraint if exists finance_requests_operation_check;
alter table private.finance_requests
  add constraint finance_requests_operation_check check (
    operation in (
      'school_fee_payment', 'feeding_receipt', 'admission_receipt', 'misc_receipt', 'expense',
      'school_fee_payment_reversal', 'feeding_receipt_reversal',
      'admission_receipt_reversal', 'misc_receipt_reversal', 'expense_void',
      'salary_record', 'salary_deduction', 'salary_record_reversal',
      'salary_deduction_reversal'
    )
  );

create table public.salary_deduction_types (
  id bigint generated always as identity primary key,
  code text not null check (code ~ '^[A-Z0-9_]{2,24}$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  calculation_type text not null check (calculation_type in ('percentage', 'fixed')),
  default_value numeric(14, 4),
  auto_apply boolean not null default false,
  effective_from date not null,
  effective_to date,
  notes text check (notes is null or char_length(btrim(notes)) between 2 and 500),
  sort_order smallint not null check (sort_order between 1 and 999),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  unique (sort_order),
  constraint salary_deduction_types_name_unique unique (name),
  constraint salary_deduction_types_dates_check check (
    effective_to is null or effective_to >= effective_from
  ),
  constraint salary_deduction_types_value_check check (
    default_value is null or
    (calculation_type = 'percentage' and default_value > 0 and default_value <= 100) or
    (calculation_type = 'fixed' and default_value > 0)
  ),
  constraint salary_deduction_types_auto_value_check check (
    not auto_apply or default_value is not null
  )
);
create index salary_deduction_types_status_effective_idx
  on public.salary_deduction_types (status, effective_from, effective_to, sort_order, id);
create index salary_deduction_types_created_by_idx on public.salary_deduction_types (created_by);
create index salary_deduction_types_updated_by_idx on public.salary_deduction_types (updated_by);

create table public.salary_records (
  id bigint generated always as identity primary key,
  salary_number text not null unique,
  staff_id bigint not null references public.staff(id) on delete restrict,
  payroll_month date not null,
  gross_salary numeric(14, 2) not null check (gross_salary > 0),
  total_deductions numeric(14, 2) not null default 0 check (
    total_deductions >= 0 and total_deductions <= gross_salary
  ),
  net_salary numeric(14, 2) generated always as (gross_salary - total_deductions) stored,
  staff_number_snapshot text not null check (char_length(btrim(staff_number_snapshot)) between 1 and 40),
  staff_name_snapshot text not null check (char_length(btrim(staff_name_snapshot)) between 1 and 242),
  staff_position_snapshot text not null check (char_length(btrim(staff_position_snapshot)) between 2 and 120),
  recorded_by_snapshot text not null check (char_length(btrim(recorded_by_snapshot)) between 1 and 160),
  status text not null default 'active' check (status in ('active', 'reversed')),
  reversal_number text unique,
  reversal_reason text check (
    reversal_reason is null or char_length(btrim(reversal_reason)) between 2 and 500
  ),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  reversed_by_name_snapshot text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salary_records_month_check check (payroll_month = date_trunc('month', payroll_month)::date),
  constraint salary_records_reversal_fields_check check (
    (status = 'reversed') =
    (reversal_number is not null and reversal_reason is not null and reversed_at is not null
      and reversed_by is not null and reversed_by_name_snapshot is not null)
  )
);
create unique index salary_records_active_staff_month_unique
  on public.salary_records (staff_id, payroll_month) where status = 'active';
create index salary_records_month_status_idx
  on public.salary_records (payroll_month desc, status, id desc);
create index salary_records_staff_history_idx
  on public.salary_records (staff_id, payroll_month desc, id desc);
create index salary_records_created_by_idx on public.salary_records (created_by);
create index salary_records_updated_by_idx on public.salary_records (updated_by);
create index salary_records_reversed_by_idx on public.salary_records (reversed_by)
  where reversed_by is not null;

create table public.salary_deductions (
  id bigint generated always as identity primary key,
  deduction_number text not null unique,
  salary_record_id bigint not null references public.salary_records(id) on delete restrict,
  deduction_type_id bigint not null references public.salary_deduction_types(id) on delete restrict,
  deduction_type_name_snapshot text not null check (
    char_length(btrim(deduction_type_name_snapshot)) between 2 and 80
  ),
  calculation_type_snapshot text not null check (
    calculation_type_snapshot in ('percentage', 'fixed')
  ),
  configured_value_snapshot numeric(14, 4) not null check (configured_value_snapshot > 0),
  gross_salary_snapshot numeric(14, 2) not null check (gross_salary_snapshot > 0),
  amount numeric(14, 2) not null check (amount > 0),
  reason text check (reason is null or char_length(btrim(reason)) between 2 and 500),
  recorded_by_snapshot text not null check (char_length(btrim(recorded_by_snapshot)) between 1 and 160),
  status text not null default 'active' check (status in ('active', 'reversed')),
  reversal_number text unique,
  reversal_reason text check (
    reversal_reason is null or char_length(btrim(reversal_reason)) between 2 and 500
  ),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  reversed_by_name_snapshot text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salary_deductions_reversal_fields_check check (
    (status = 'reversed') =
    (reversal_number is not null and reversal_reason is not null and reversed_at is not null
      and reversed_by is not null and reversed_by_name_snapshot is not null)
  )
);
create unique index salary_deductions_active_type_unique
  on public.salary_deductions (salary_record_id, deduction_type_id) where status = 'active';
create index salary_deductions_salary_idx
  on public.salary_deductions (salary_record_id, status, id);
create index salary_deductions_type_idx on public.salary_deductions (deduction_type_id);
create index salary_deductions_created_by_idx on public.salary_deductions (created_by);
create index salary_deductions_updated_by_idx on public.salary_deductions (updated_by);
create index salary_deductions_reversed_by_idx on public.salary_deductions (reversed_by)
  where reversed_by is not null;

create trigger salary_deduction_types_stamp
before insert or update on public.salary_deduction_types
for each row execute function private.stamp_configuration_record();
create trigger salary_deduction_types_audit
after insert or update or delete on public.salary_deduction_types
for each row execute function private.write_configuration_audit();

create or replace function private.preserve_salary_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.salary_number := old.salary_number;
  new.staff_id := old.staff_id;
  new.payroll_month := old.payroll_month;
  new.gross_salary := old.gross_salary;
  new.staff_number_snapshot := old.staff_number_snapshot;
  new.staff_name_snapshot := old.staff_name_snapshot;
  new.staff_position_snapshot := old.staff_position_snapshot;
  new.recorded_by_snapshot := old.recorded_by_snapshot;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  if old.status = 'reversed' then
    new.status := old.status;
    new.reversal_number := old.reversal_number;
    new.reversal_reason := old.reversal_reason;
    new.reversed_at := old.reversed_at;
    new.reversed_by := old.reversed_by;
    new.reversed_by_name_snapshot := old.reversed_by_name_snapshot;
  end if;
  return new;
end;
$$;
revoke all on function private.preserve_salary_record() from public, anon, authenticated;

create or replace function private.preserve_salary_deduction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.deduction_number := old.deduction_number;
  new.salary_record_id := old.salary_record_id;
  new.deduction_type_id := old.deduction_type_id;
  new.deduction_type_name_snapshot := old.deduction_type_name_snapshot;
  new.calculation_type_snapshot := old.calculation_type_snapshot;
  new.configured_value_snapshot := old.configured_value_snapshot;
  new.gross_salary_snapshot := old.gross_salary_snapshot;
  new.amount := old.amount;
  new.reason := old.reason;
  new.recorded_by_snapshot := old.recorded_by_snapshot;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  if old.status = 'reversed' then
    new.status := old.status;
    new.reversal_number := old.reversal_number;
    new.reversal_reason := old.reversal_reason;
    new.reversed_at := old.reversed_at;
    new.reversed_by := old.reversed_by;
    new.reversed_by_name_snapshot := old.reversed_by_name_snapshot;
  end if;
  return new;
end;
$$;
revoke all on function private.preserve_salary_deduction() from public, anon, authenticated;

create trigger salary_records_preserve before update on public.salary_records
for each row execute function private.preserve_salary_record();
create trigger salary_records_audit after insert or update on public.salary_records
for each row execute function private.write_configuration_audit();
create trigger salary_deductions_preserve before update on public.salary_deductions
for each row execute function private.preserve_salary_deduction();
create trigger salary_deductions_audit after insert or update on public.salary_deductions
for each row execute function private.write_configuration_audit();

alter table public.salary_deduction_types enable row level security;
alter table public.salary_records enable row level security;
alter table public.salary_deductions enable row level security;

revoke all on public.salary_deduction_types, public.salary_records, public.salary_deductions
  from public, anon, authenticated;
grant select, insert, update on public.salary_deduction_types to authenticated;
grant select on public.salary_records, public.salary_deductions to authenticated;
grant usage, select on sequence public.salary_deduction_types_id_seq to authenticated;

create policy salary_deduction_types_read_finance
on public.salary_deduction_types for select to authenticated
using ((select private.has_permission('financials.read')));
create policy salary_deduction_types_insert_settings
on public.salary_deduction_types for insert to authenticated
with check ((select private.has_permission('finance.settings.manage')));
create policy salary_deduction_types_update_settings
on public.salary_deduction_types for update to authenticated
using ((select private.has_permission('finance.settings.manage')))
with check ((select private.has_permission('finance.settings.manage')));
create policy salary_records_read_finance
on public.salary_records for select to authenticated
using ((select private.has_permission('financials.read')));
create policy salary_deductions_read_finance
on public.salary_deductions for select to authenticated
using ((select private.has_permission('financials.read')));

insert into public.salary_deduction_types
  (code, name, calculation_type, default_value, auto_apply, effective_from, notes, sort_order)
values
  ('SSNIT', 'SSNIT employee contribution', 'percentage', 5.5000, true, '2026-08-01',
    'Employee contribution supplied for the August 2026 salary structure.', 10),
  ('SALARY_ADVANCE', 'Salary advance', 'fixed', null, false, '2026-08-01', null, 20),
  ('STAFF_LOAN', 'Staff loan', 'fixed', null, false, '2026-08-01', null, 30),
  ('ABSENCE', 'Absence', 'fixed', null, false, '2026-08-01', null, 40),
  ('WELFARE', 'Welfare', 'fixed', null, false, '2026-08-01', null, 50),
  ('OTHER', 'Other deduction', 'fixed', null, false, '2026-08-01', null, 60);

create or replace function private.refresh_salary_totals(target_salary_record_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deductions numeric(14, 2);
begin
  select coalesce(sum(amount), 0)::numeric(14, 2) into deductions
  from public.salary_deductions
  where salary_record_id = target_salary_record_id and status = 'active';
  update public.salary_records
  set total_deductions = deductions
  where id = target_salary_record_id and status = 'active';
end;
$$;
revoke all on function private.refresh_salary_totals(bigint) from public, anon, authenticated;

create or replace function public.record_salary_record(
  request_key uuid,
  target_staff_id bigint,
  target_payroll_month date,
  target_gross_salary numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_name text;
  staff_record record;
  salary_id bigint;
  salary_number text;
  deduction_type record;
  deduction_amount numeric(14, 2);
  fingerprint text;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not private.has_permission('finance.transactions.manage') then
    raise exception using errcode = '42501', message = 'You cannot record salary entries.';
  end if;
  fingerprint := concat_ws('|', target_staff_id, target_payroll_month, target_gross_salary::numeric(14,2));
  request_result := private.persist_finance_request(
    request_key, 'salary_record', actor_id, fingerprint, jsonb_build_object('status', 'pending')
  );
  if request_result->>'status' <> 'pending' then return request_result; end if;
  if target_payroll_month is null or target_payroll_month <> date_trunc('month', target_payroll_month)::date then
    raise exception using errcode = '22023', message = 'Choose the first day of the salary month.';
  end if;
  if target_gross_salary is null or target_gross_salary <= 0 then
    raise exception using errcode = '22023', message = 'Gross salary must be greater than zero.';
  end if;
  select s.id, s.staff_number,
    coalesce(nullif(btrim(s.recorded_name), ''), nullif(btrim(concat_ws(' ', s.first_name, s.middle_name, s.last_name)), '')) as full_name,
    s.position
  into staff_record
  from public.staff s where s.id = target_staff_id and s.status = 'active';
  if not found then
    raise exception using errcode = '23503', message = 'Choose an active staff member.';
  end if;
  select coalesce(nullif(btrim(display_name), ''), 'Authorized administrator') into actor_name
  from public.profiles where id = actor_id;
  salary_number := private.allocate_document_number('SAL');
  insert into public.salary_records (
    salary_number, staff_id, payroll_month, gross_salary,
    staff_number_snapshot, staff_name_snapshot, staff_position_snapshot,
    recorded_by_snapshot, created_by, updated_by
  ) values (
    salary_number, staff_record.id, target_payroll_month, target_gross_salary::numeric(14,2),
    staff_record.staff_number, staff_record.full_name, staff_record.position,
    actor_name, actor_id, actor_id
  ) returning id into salary_id;

  for deduction_type in
    select * from public.salary_deduction_types
    where status = 'active' and auto_apply and default_value is not null
      and effective_from <= target_payroll_month
      and (effective_to is null or effective_to >= target_payroll_month)
    order by sort_order, id
  loop
    deduction_amount := case deduction_type.calculation_type
      when 'percentage' then round((target_gross_salary * deduction_type.default_value / 100)::numeric, 2)
      else deduction_type.default_value::numeric(14,2)
    end;
    if deduction_amount <= 0 then
      raise exception using errcode = '23514', message = 'An automatic deduction calculated to zero.';
    end if;
    insert into public.salary_deductions (
      deduction_number, salary_record_id, deduction_type_id,
      deduction_type_name_snapshot, calculation_type_snapshot,
      configured_value_snapshot, gross_salary_snapshot, amount, reason,
      recorded_by_snapshot, created_by, updated_by
    ) values (
      private.allocate_document_number('DED'), salary_id, deduction_type.id,
      deduction_type.name, deduction_type.calculation_type,
      deduction_type.default_value, target_gross_salary::numeric(14,2), deduction_amount,
      'Automatically applied from the active deduction setting.',
      actor_name, actor_id, actor_id
    );
  end loop;
  perform private.refresh_salary_totals(salary_id);
  select jsonb_build_object(
    'status', 'completed', 'salaryRecordId', id, 'salaryNumber', salary_number,
    'grossSalary', gross_salary, 'totalDeductions', total_deductions, 'netSalary', net_salary
  ) into result from public.salary_records where id = salary_id;
  return private.persist_finance_request(request_key, 'salary_record', actor_id, fingerprint, result);
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'An active salary record already exists for this staff member and month.';
end;
$$;

create or replace function public.record_salary_deduction(
  request_key uuid,
  target_salary_record_id bigint,
  target_deduction_type_id bigint,
  target_configured_value numeric,
  target_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_name text;
  salary_record record;
  deduction_type record;
  configured_value numeric(14, 4);
  deduction_amount numeric(14, 2);
  deduction_id bigint;
  fingerprint text;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not private.has_permission('finance.transactions.manage') then
    raise exception using errcode = '42501', message = 'You cannot record salary deductions.';
  end if;
  fingerprint := concat_ws('|', target_salary_record_id, target_deduction_type_id,
    target_configured_value::numeric(14,4), coalesce(btrim(target_reason), ''));
  request_result := private.persist_finance_request(
    request_key, 'salary_deduction', actor_id, fingerprint, jsonb_build_object('status', 'pending')
  );
  if request_result->>'status' <> 'pending' then return request_result; end if;
  select * into salary_record from public.salary_records
  where id = target_salary_record_id for update;
  if not found or salary_record.status <> 'active' then
    raise exception using errcode = '23503', message = 'Choose an active salary record.';
  end if;
  select * into deduction_type from public.salary_deduction_types
  where id = target_deduction_type_id and status = 'active'
    and effective_from <= salary_record.payroll_month
    and (effective_to is null or effective_to >= salary_record.payroll_month);
  if not found then
    raise exception using errcode = '23503', message = 'Choose an active deduction type for this salary month.';
  end if;
  configured_value := coalesce(target_configured_value, deduction_type.default_value);
  if configured_value is null or configured_value <= 0
    or (deduction_type.calculation_type = 'percentage' and configured_value > 100) then
    raise exception using errcode = '22023', message = 'Enter a valid deduction value.';
  end if;
  deduction_amount := case deduction_type.calculation_type
    when 'percentage' then round((salary_record.gross_salary * configured_value / 100)::numeric, 2)
    else configured_value::numeric(14,2)
  end;
  if salary_record.total_deductions + deduction_amount > salary_record.gross_salary then
    raise exception using errcode = '23514', message = 'Total deductions cannot exceed gross salary.';
  end if;
  select coalesce(nullif(btrim(display_name), ''), 'Authorized administrator') into actor_name
  from public.profiles where id = actor_id;
  insert into public.salary_deductions (
    deduction_number, salary_record_id, deduction_type_id,
    deduction_type_name_snapshot, calculation_type_snapshot,
    configured_value_snapshot, gross_salary_snapshot, amount, reason,
    recorded_by_snapshot, created_by, updated_by
  ) values (
    private.allocate_document_number('DED'), salary_record.id, deduction_type.id,
    deduction_type.name, deduction_type.calculation_type,
    configured_value, salary_record.gross_salary, deduction_amount,
    nullif(btrim(target_reason), ''), actor_name, actor_id, actor_id
  ) returning id into deduction_id;
  perform private.refresh_salary_totals(salary_record.id);
  select jsonb_build_object(
    'status', 'completed', 'deductionId', deduction_id,
    'salaryRecordId', id, 'totalDeductions', total_deductions, 'netSalary', net_salary
  ) into result from public.salary_records where id = salary_record.id;
  return private.persist_finance_request(request_key, 'salary_deduction', actor_id, fingerprint, result);
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'That deduction type is already active on this salary record.';
end;
$$;

create or replace function public.reverse_salary_deduction(
  request_key uuid,
  target_deduction_id bigint,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_name text;
  deduction_record record;
  fingerprint text := concat_ws('|', target_deduction_id, btrim(target_reason));
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not private.has_permission('finance.transactions.manage') then
    raise exception using errcode = '42501', message = 'You cannot reverse salary deductions.';
  end if;
  request_result := private.persist_finance_request(
    request_key, 'salary_deduction_reversal', actor_id, fingerprint, jsonb_build_object('status', 'pending')
  );
  if request_result->>'status' <> 'pending' then return request_result; end if;
  if nullif(btrim(target_reason), '') is null or char_length(btrim(target_reason)) > 500 then
    raise exception using errcode = '22023', message = 'A reversal reason is required.';
  end if;
  select d.*, s.status as salary_status into deduction_record
  from public.salary_deductions d join public.salary_records s on s.id = d.salary_record_id
  where d.id = target_deduction_id for update of d, s;
  if not found or deduction_record.status <> 'active' or deduction_record.salary_status <> 'active' then
    raise exception using errcode = '23514', message = 'Only a deduction on an active salary record can be reversed.';
  end if;
  select coalesce(nullif(btrim(display_name), ''), 'Authorized administrator') into actor_name
  from public.profiles where id = actor_id;
  update public.salary_deductions set
    status = 'reversed', reversal_number = private.allocate_document_number('REV'),
    reversal_reason = btrim(target_reason), reversed_at = now(), reversed_by = actor_id,
    reversed_by_name_snapshot = actor_name, updated_by = actor_id
  where id = target_deduction_id;
  perform private.refresh_salary_totals(deduction_record.salary_record_id);
  result := jsonb_build_object('status', 'completed', 'deductionId', target_deduction_id,
    'salaryRecordId', deduction_record.salary_record_id);
  return private.persist_finance_request(
    request_key, 'salary_deduction_reversal', actor_id, fingerprint, result
  );
end;
$$;

create or replace function public.reverse_salary_record(
  request_key uuid,
  target_salary_record_id bigint,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_name text;
  salary_record record;
  fingerprint text := concat_ws('|', target_salary_record_id, btrim(target_reason));
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not private.has_permission('finance.transactions.manage') then
    raise exception using errcode = '42501', message = 'You cannot reverse salary records.';
  end if;
  request_result := private.persist_finance_request(
    request_key, 'salary_record_reversal', actor_id, fingerprint, jsonb_build_object('status', 'pending')
  );
  if request_result->>'status' <> 'pending' then return request_result; end if;
  if nullif(btrim(target_reason), '') is null or char_length(btrim(target_reason)) > 500 then
    raise exception using errcode = '22023', message = 'A reversal reason is required.';
  end if;
  select * into salary_record from public.salary_records
  where id = target_salary_record_id for update;
  if not found or salary_record.status <> 'active' then
    raise exception using errcode = '23514', message = 'Only an active salary record can be reversed.';
  end if;
  select coalesce(nullif(btrim(display_name), ''), 'Authorized administrator') into actor_name
  from public.profiles where id = actor_id;
  update public.salary_deductions set
    status = 'reversed', reversal_number = private.allocate_document_number('REV'),
    reversal_reason = 'Salary record reversed: ' || btrim(target_reason),
    reversed_at = now(), reversed_by = actor_id,
    reversed_by_name_snapshot = actor_name, updated_by = actor_id
  where salary_record_id = target_salary_record_id and status = 'active';
  update public.salary_records set
    status = 'reversed', reversal_number = private.allocate_document_number('REV'),
    reversal_reason = btrim(target_reason), reversed_at = now(), reversed_by = actor_id,
    reversed_by_name_snapshot = actor_name, updated_by = actor_id
  where id = target_salary_record_id;
  result := jsonb_build_object('status', 'completed', 'salaryRecordId', target_salary_record_id);
  return private.persist_finance_request(
    request_key, 'salary_record_reversal', actor_id, fingerprint, result
  );
end;
$$;

revoke all on function public.record_salary_record(uuid, bigint, date, numeric)
  from public, anon, authenticated;
revoke all on function public.record_salary_deduction(uuid, bigint, bigint, numeric, text)
  from public, anon, authenticated;
revoke all on function public.reverse_salary_deduction(uuid, bigint, text)
  from public, anon, authenticated;
revoke all on function public.reverse_salary_record(uuid, bigint, text)
  from public, anon, authenticated;
grant execute on function public.record_salary_record(uuid, bigint, date, numeric) to authenticated;
grant execute on function public.record_salary_deduction(uuid, bigint, bigint, numeric, text) to authenticated;
grant execute on function public.reverse_salary_deduction(uuid, bigint, text) to authenticated;
grant execute on function public.reverse_salary_record(uuid, bigint, text) to authenticated;
