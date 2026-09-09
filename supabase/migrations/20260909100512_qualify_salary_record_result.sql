-- Qualify salary-record result fields so PL/pgSQL never resolves the local
-- salary_number variable in place of the selected table column.

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
  allocated_salary_number text;
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
  allocated_salary_number := private.allocate_document_number('SAL');
  insert into public.salary_records (
    salary_number, staff_id, payroll_month, gross_salary,
    staff_number_snapshot, staff_name_snapshot, staff_position_snapshot,
    recorded_by_snapshot, created_by, updated_by
  ) values (
    allocated_salary_number, staff_record.id, target_payroll_month, target_gross_salary::numeric(14,2),
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
    'status', 'completed', 'salaryRecordId', salary.id, 'salaryNumber', salary.salary_number,
    'grossSalary', salary.gross_salary, 'totalDeductions', salary.total_deductions,
    'netSalary', salary.net_salary
  ) into result
  from public.salary_records salary
  where salary.id = salary_id;
  return private.persist_finance_request(request_key, 'salary_record', actor_id, fingerprint, result);
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'An active salary record already exists for this staff member and month.';
end;
$$;

revoke all on function public.record_salary_record(uuid, bigint, date, numeric)
  from public, anon, authenticated;
grant execute on function public.record_salary_record(uuid, bigint, date, numeric) to authenticated;
