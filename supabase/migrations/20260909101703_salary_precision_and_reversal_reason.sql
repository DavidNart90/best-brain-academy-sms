-- Phase 4 hardening: enforce numeric precision at the public RPC boundary and
-- leave enough room for the whole-salary context added to child reversals.

alter table public.salary_deduction_types
  add constraint salary_deduction_types_fixed_scale_check check (
    calculation_type <> 'fixed'
    or default_value is null
    or default_value = round(default_value, 2)
  );

alter table public.salary_deductions
  drop constraint salary_deductions_reversal_reason_check;
alter table public.salary_deductions
  add constraint salary_deductions_reversal_reason_check check (
    reversal_reason is null or char_length(btrim(reversal_reason)) between 2 and 540
  );

alter function public.record_salary_record(uuid, bigint, date, numeric)
  rename to record_salary_record_core;
alter function public.record_salary_record_core(uuid, bigint, date, numeric)
  set schema private;
revoke all on function private.record_salary_record_core(uuid, bigint, date, numeric)
  from public, anon, authenticated;

create function public.record_salary_record(
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
begin
  if target_gross_salary is null or target_gross_salary <= 0
    or target_gross_salary <> round(target_gross_salary, 2) then
    raise exception using errcode = '22023',
      message = 'Gross salary must be a positive amount with no more than two decimal places.';
  end if;
  return private.record_salary_record_core(
    request_key, target_staff_id, target_payroll_month, target_gross_salary
  );
end;
$$;
revoke all on function public.record_salary_record(uuid, bigint, date, numeric)
  from public, anon, authenticated;
grant execute on function public.record_salary_record(uuid, bigint, date, numeric)
  to authenticated;

alter function public.record_salary_deduction(uuid, bigint, bigint, numeric, text)
  rename to record_salary_deduction_core;
alter function public.record_salary_deduction_core(uuid, bigint, bigint, numeric, text)
  set schema private;
revoke all on function private.record_salary_deduction_core(uuid, bigint, bigint, numeric, text)
  from public, anon, authenticated;

create function public.record_salary_deduction(
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
  calculation text;
begin
  if (select auth.uid()) is null
    or not private.has_permission('finance.transactions.manage') then
    raise exception using errcode = '42501', message = 'You cannot record salary deductions.';
  end if;
  select calculation_type into calculation
  from public.salary_deduction_types
  where id = target_deduction_type_id;
  if target_configured_value is not null and (
    (calculation = 'percentage' and target_configured_value <> round(target_configured_value, 4))
    or (calculation = 'fixed' and target_configured_value <> round(target_configured_value, 2))
  ) then
    raise exception using errcode = '22023',
      message = 'Fixed deductions allow two decimal places; percentages allow four.';
  end if;
  return private.record_salary_deduction_core(
    request_key, target_salary_record_id, target_deduction_type_id,
    target_configured_value, target_reason
  );
end;
$$;
revoke all on function public.record_salary_deduction(uuid, bigint, bigint, numeric, text)
  from public, anon, authenticated;
grant execute on function public.record_salary_deduction(uuid, bigint, bigint, numeric, text)
  to authenticated;
