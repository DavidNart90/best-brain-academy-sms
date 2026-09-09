-- Effective-dated staff gross salary configuration. Posting remains a deliberate
-- per-staff/month action; configuration changes never create or rewrite salary records.

set lock_timeout = '5s';

alter table private.finance_requests
  drop constraint if exists finance_requests_operation_check;
alter table private.finance_requests
  add constraint finance_requests_operation_check check (
    operation in (
      'school_fee_payment', 'feeding_receipt', 'admission_receipt', 'misc_receipt', 'expense',
      'school_fee_payment_reversal', 'feeding_receipt_reversal',
      'admission_receipt_reversal', 'misc_receipt_reversal', 'expense_void',
      'salary_record', 'salary_deduction', 'salary_record_reversal',
      'salary_deduction_reversal', 'salary_configuration', 'salary_configuration_end'
    )
  );

create table public.staff_salary_configurations (
  id bigint generated always as identity primary key,
  staff_id bigint not null references public.staff(id) on delete restrict,
  gross_salary numeric(14, 2) not null check (
    gross_salary > 0 and gross_salary = round(gross_salary, 2)
  ),
  effective_from date not null,
  effective_to date,
  status text not null default 'active' check (status in ('active', 'ended')),
  notes text check (notes is null or char_length(btrim(notes)) between 2 and 500),
  end_reason text check (
    end_reason is null or char_length(btrim(end_reason)) between 2 and 500
  ),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_salary_configurations_months_check check (
    effective_from = date_trunc('month', effective_from)::date
    and (effective_to is null or effective_to = date_trunc('month', effective_to)::date)
    and (effective_to is null or effective_to >= effective_from)
  ),
  constraint staff_salary_configurations_state_check check (
    (status = 'active' and effective_to is null and end_reason is null)
    or (status = 'ended' and effective_to is not null and end_reason is not null)
  )
);

create unique index staff_salary_configurations_one_active_idx
  on public.staff_salary_configurations (staff_id) where status = 'active';
create index staff_salary_configurations_staff_history_idx
  on public.staff_salary_configurations (staff_id, effective_from desc, id desc);
create index staff_salary_configurations_effective_idx
  on public.staff_salary_configurations (effective_from, effective_to, staff_id);
create index staff_salary_configurations_created_by_idx
  on public.staff_salary_configurations (created_by);
create index staff_salary_configurations_updated_by_idx
  on public.staff_salary_configurations (updated_by);

create function private.validate_staff_salary_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.staff_salary_configurations other
    where other.staff_id = new.staff_id
      and other.id <> coalesce(new.id, 0)
      and other.effective_from <= coalesce(new.effective_to, 'infinity'::date)
      and coalesce(other.effective_to, 'infinity'::date) >= new.effective_from
  ) then
    raise exception using errcode = '23514',
      message = 'Salary effective periods cannot overlap for one staff member.';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_staff_salary_configuration()
  from public, anon, authenticated;

create trigger staff_salary_configurations_stamp
before insert or update on public.staff_salary_configurations
for each row execute function private.stamp_configuration_record();
create trigger staff_salary_configurations_validate
before insert or update on public.staff_salary_configurations
for each row execute function private.validate_staff_salary_configuration();
create trigger staff_salary_configurations_audit
after insert or update or delete on public.staff_salary_configurations
for each row execute function private.write_configuration_audit();

alter table public.staff_salary_configurations enable row level security;
revoke all on public.staff_salary_configurations from public, anon, authenticated;
grant select on public.staff_salary_configurations to authenticated;
create policy staff_salary_configurations_read_finance
on public.staff_salary_configurations for select to authenticated
using ((select private.has_permission('financials.read')));

create function public.set_staff_salary_configuration(
  request_key uuid,
  target_staff_id bigint,
  target_gross_salary numeric,
  target_effective_from date,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  current_configuration public.staff_salary_configurations;
  configuration_id bigint;
  fingerprint text;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not private.has_permission('finance.settings.manage') then
    raise exception using errcode = '42501', message = 'You cannot configure staff salaries.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if target_gross_salary is null or target_gross_salary <= 0
    or target_gross_salary <> round(target_gross_salary, 2) then
    raise exception using errcode = '22023',
      message = 'Gross salary must be a positive amount with no more than two decimal places.';
  end if;
  if target_effective_from is null
    or target_effective_from <> date_trunc('month', target_effective_from)::date then
    raise exception using errcode = '22023', message = 'Choose a valid effective month.';
  end if;
  if target_notes is not null and nullif(btrim(target_notes), '') is not null
    and char_length(btrim(target_notes)) not between 2 and 500 then
    raise exception using errcode = '22023', message = 'Salary notes must be between 2 and 500 characters.';
  end if;

  fingerprint := concat_ws(
    '|', target_staff_id, target_gross_salary::numeric(14, 2),
    target_effective_from, coalesce(nullif(btrim(target_notes), ''), '')
  );
  request_result := private.persist_finance_request(
    request_key, 'salary_configuration', actor_id, fingerprint,
    jsonb_build_object('status', 'pending')
  );
  if request_result->>'status' <> 'pending' then return request_result; end if;

  perform 1 from public.staff
  where id = target_staff_id and status = 'active'
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'Choose an active staff member.';
  end if;

  select * into current_configuration
  from public.staff_salary_configurations
  where staff_id = target_staff_id and status = 'active'
  for update;

  if current_configuration.id is not null then
    if target_effective_from < current_configuration.effective_from then
      raise exception using errcode = '23514',
        message = 'A salary change cannot begin before the current configuration.';
    end if;
    if exists (
      select 1 from public.salary_records
      where staff_id = target_staff_id and status = 'active'
        and payroll_month >= target_effective_from
    ) then
      raise exception using errcode = '23514',
        message = 'Choose a month after the latest posted salary record.';
    end if;

    if target_effective_from = current_configuration.effective_from then
      update public.staff_salary_configurations
      set gross_salary = target_gross_salary::numeric(14, 2),
        notes = nullif(btrim(target_notes), ''), updated_by = actor_id
      where id = current_configuration.id
      returning id into configuration_id;
    else
      update public.staff_salary_configurations
      set status = 'ended',
        effective_to = (target_effective_from - interval '1 month')::date,
        end_reason = 'Superseded by a salary change effective ' || target_effective_from::text || '.',
        updated_by = actor_id
      where id = current_configuration.id;
      insert into public.staff_salary_configurations (
        staff_id, gross_salary, effective_from, notes, created_by, updated_by
      ) values (
        target_staff_id, target_gross_salary::numeric(14, 2), target_effective_from,
        nullif(btrim(target_notes), ''), actor_id, actor_id
      ) returning id into configuration_id;
    end if;
  else
    if exists (
      select 1 from public.staff_salary_configurations
      where staff_id = target_staff_id
        and coalesce(effective_to, 'infinity'::date) >= target_effective_from
    ) then
      raise exception using errcode = '23514',
        message = 'The new salary must begin after the previous salary period.';
    end if;
    insert into public.staff_salary_configurations (
      staff_id, gross_salary, effective_from, notes, created_by, updated_by
    ) values (
      target_staff_id, target_gross_salary::numeric(14, 2), target_effective_from,
      nullif(btrim(target_notes), ''), actor_id, actor_id
    ) returning id into configuration_id;
  end if;

  result := jsonb_build_object(
    'status', 'completed', 'configurationId', configuration_id,
    'staffId', target_staff_id, 'grossSalary', target_gross_salary::numeric(14, 2),
    'effectiveFrom', target_effective_from
  );
  return private.persist_finance_request(
    request_key, 'salary_configuration', actor_id, fingerprint, result
  );
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'That staff member already has an active salary configuration.';
end;
$$;

create function public.end_staff_salary_configuration(
  request_key uuid,
  target_configuration_id bigint,
  target_effective_to date,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  configuration public.staff_salary_configurations;
  fingerprint text;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not private.has_permission('finance.settings.manage') then
    raise exception using errcode = '42501', message = 'You cannot end staff salary configurations.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if target_effective_to is null
    or target_effective_to <> date_trunc('month', target_effective_to)::date then
    raise exception using errcode = '22023', message = 'Choose a valid final salary month.';
  end if;
  if nullif(btrim(target_reason), '') is null
    or char_length(btrim(target_reason)) not between 2 and 500 then
    raise exception using errcode = '22023', message = 'A reason is required.';
  end if;

  fingerprint := concat_ws(
    '|', target_configuration_id, target_effective_to, btrim(target_reason)
  );
  request_result := private.persist_finance_request(
    request_key, 'salary_configuration_end', actor_id, fingerprint,
    jsonb_build_object('status', 'pending')
  );
  if request_result->>'status' <> 'pending' then return request_result; end if;

  select * into configuration
  from public.staff_salary_configurations
  where id = target_configuration_id
  for update;
  if configuration.id is null or configuration.status <> 'active' then
    raise exception using errcode = '23514', message = 'Choose an active salary configuration.';
  end if;
  perform 1 from public.staff where id = configuration.staff_id for update;
  if target_effective_to < configuration.effective_from then
    raise exception using errcode = '23514',
      message = 'The final salary month cannot be before the effective month.';
  end if;
  if exists (
    select 1 from public.salary_records
    where staff_id = configuration.staff_id and status = 'active'
      and payroll_month > target_effective_to
  ) then
    raise exception using errcode = '23514',
      message = 'The salary cannot end before an active posted salary record.';
  end if;

  update public.staff_salary_configurations
  set status = 'ended', effective_to = target_effective_to,
    end_reason = btrim(target_reason), updated_by = actor_id
  where id = configuration.id;

  result := jsonb_build_object(
    'status', 'completed', 'configurationId', configuration.id,
    'staffId', configuration.staff_id, 'effectiveTo', target_effective_to
  );
  return private.persist_finance_request(
    request_key, 'salary_configuration_end', actor_id, fingerprint, result
  );
end;
$$;

drop function public.record_salary_record(uuid, bigint, date, numeric);
create function public.record_salary_record(
  request_key uuid,
  target_staff_id bigint,
  target_payroll_month date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  configured_salary numeric(14, 2);
begin
  if (select auth.uid()) is null
    or not private.has_permission('finance.transactions.manage') then
    raise exception using errcode = '42501', message = 'You cannot record salary entries.';
  end if;
  if target_payroll_month is null
    or target_payroll_month <> date_trunc('month', target_payroll_month)::date then
    raise exception using errcode = '22023', message = 'Choose a valid salary month.';
  end if;
  select gross_salary into configured_salary
  from public.staff_salary_configurations
  where staff_id = target_staff_id
    and effective_from <= target_payroll_month
    and (effective_to is null or effective_to >= target_payroll_month);
  if configured_salary is null then
    raise exception using errcode = '23503',
      message = 'No gross salary is configured for this staff member and month.';
  end if;
  return private.record_salary_record_core(
    request_key, target_staff_id, target_payroll_month, configured_salary
  );
end;
$$;

revoke all on function public.set_staff_salary_configuration(uuid, bigint, numeric, date, text)
  from public, anon, authenticated;
revoke all on function public.end_staff_salary_configuration(uuid, bigint, date, text)
  from public, anon, authenticated;
revoke all on function public.record_salary_record(uuid, bigint, date)
  from public, anon, authenticated;
grant execute on function public.set_staff_salary_configuration(uuid, bigint, numeric, date, text)
  to authenticated;
grant execute on function public.end_staff_salary_configuration(uuid, bigint, date, text)
  to authenticated;
grant execute on function public.record_salary_record(uuid, bigint, date)
  to authenticated;

reset lock_timeout;
