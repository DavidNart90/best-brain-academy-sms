-- Focused salary-payment and SSNIT-remittance proof. Synthetic rows roll back.
begin;

do $$
declare
  actor uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  staff_id bigint;
begin
  insert into auth.users (id, email)
  values (actor, 'salary-cash-' || actor::text || '@example.invalid');
  update public.profiles
  set status = 'active', must_change_password = false,
      display_name = 'Synthetic Salary Cash Administrator'
  where id = actor;
  insert into public.user_roles (user_id, role_code) values (actor, 'SUPER_ADMIN');
  insert into auth.sessions (id, user_id, not_after)
  values (session_id, actor, now() + interval '10 minutes');
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', actor, 'role', 'authenticated', 'session_id', session_id
    )::text,
    true
  );
  insert into public.staff (
    staff_number, recorded_name, staff_type, position, status,
    known_subjects, created_by, updated_by
  ) values (
    'SYN-CASH-' || left(replace(actor::text, '-', ''), 12),
    'Synthetic Salary Cash Staff', 'non_teaching', 'Synthetic Cook', 'active',
    '{}', actor, actor
  ) returning id into staff_id;
  perform set_config('test.salary_cash_staff', staff_id::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  test_staff_id bigint := current_setting('test.salary_cash_staff')::bigint;
  cash_method_id bigint;
  other_type_id bigint;
  salary_id bigint;
  ssnit_deduction_id bigint;
  first_salary_expense_id bigint;
  second_salary_expense_id bigint;
  first_ssnit_expense_id bigint;
  second_ssnit_expense_id bigint;
  payment_key uuid := gen_random_uuid();
  payment_result jsonb;
  replay_result jsonb;
  report_result jsonb;
begin
  select id into cash_method_id
  from public.payment_methods
  where code = 'CASH' and status = 'active';
  select id into other_type_id
  from public.salary_deduction_types
  where code = 'OTHER';

  perform public.set_staff_salary_configuration(
    gen_random_uuid(), test_staff_id, 500.00, '2099-08-01',
    'Synthetic salary cash proof'
  );
  salary_id := (
    public.record_salary_record(gen_random_uuid(), test_staff_id, '2099-08-01')
      ->> 'salaryRecordId'
  )::bigint;
  select id into ssnit_deduction_id
  from public.salary_deductions
  where salary_record_id = salary_id and status = 'active';

  if not exists (
    select 1 from public.salary_cash_positions
    where salary_record_id = salary_id
      and net_salary = 472.50
      and salary_payment_status = 'unpaid'
      and salary_outstanding = 472.50
      and ssnit_due = 27.50
      and ssnit_status = 'due'
  ) then
    raise exception 'Initial salary cash position is incorrect';
  end if;

  payment_result := public.record_salary_cash_transaction(
    payment_key, salary_id, 'salary_payment', 200.00, '2099-08-15',
    cash_method_id, null, 'Synthetic partial salary payment'
  );
  first_salary_expense_id := (payment_result->>'expenseId')::bigint;
  replay_result := public.record_salary_cash_transaction(
    payment_key, salary_id, 'salary_payment', 200.00, '2099-08-15',
    cash_method_id, null, 'Synthetic partial salary payment'
  );
  if replay_result <> payment_result then
    raise exception 'Salary payment replay did not return the original result';
  end if;
  if (
    select count(*) from public.expenses
    where salary_record_id = salary_id and payroll_cash_kind = 'salary_payment'
  ) <> 1 then
    raise exception 'Salary payment replay duplicated the cash expense';
  end if;

  first_ssnit_expense_id := (
    public.record_salary_cash_transaction(
      gen_random_uuid(), salary_id, 'ssnit_remittance', 10.00, '2099-08-15',
      cash_method_id, null, 'Synthetic partial SSNIT remittance'
    )->>'expenseId'
  )::bigint;
  if not exists (
    select 1 from public.salary_cash_positions
    where salary_record_id = salary_id
      and salary_paid = 200.00
      and salary_outstanding = 272.50
      and salary_payment_status = 'partial'
      and ssnit_remitted = 10.00
      and ssnit_outstanding = 17.50
      and ssnit_status = 'partial'
  ) then
    raise exception 'Partial salary or SSNIT position is incorrect';
  end if;

  begin
    perform public.record_salary_cash_transaction(
      gen_random_uuid(), salary_id, 'salary_payment', 272.51, '2099-08-15',
      cash_method_id, null, null
    );
    raise exception 'Salary overpayment was allowed';
  exception when check_violation then null;
  end;
  begin
    perform public.record_salary_deduction(
      gen_random_uuid(), salary_id, other_type_id, 300.00,
      'Would reduce net below salary already paid'
    );
    raise exception 'A deduction reduced net salary below the paid amount';
  exception when check_violation then null;
  end;
  begin
    perform public.reverse_salary_deduction(
      gen_random_uuid(), ssnit_deduction_id, 'Cash dependency proof'
    );
    raise exception 'SSNIT deduction reversal ignored an active remittance';
  exception when check_violation then null;
  end;
  begin
    perform public.reverse_salary_record(
      gen_random_uuid(), salary_id, 'Cash dependency proof'
    );
    raise exception 'Salary reversal ignored active cash transactions';
  exception when check_violation then null;
  end;

  second_salary_expense_id := (
    public.record_salary_cash_transaction(
      gen_random_uuid(), salary_id, 'salary_payment', 272.50, '2099-08-16',
      cash_method_id, null, null
    )->>'expenseId'
  )::bigint;
  second_ssnit_expense_id := (
    public.record_salary_cash_transaction(
      gen_random_uuid(), salary_id, 'ssnit_remittance', 17.50, '2099-08-16',
      cash_method_id, null, null
    )->>'expenseId'
  )::bigint;

  if not exists (
    select 1 from public.salary_cash_positions
    where salary_record_id = salary_id
      and salary_paid = 472.50
      and salary_outstanding = 0
      and salary_payment_status = 'paid'
      and ssnit_remitted = 27.50
      and ssnit_outstanding = 0
      and ssnit_status = 'remitted'
  ) then
    raise exception 'Completed salary or SSNIT position is incorrect';
  end if;
  if (
    select coalesce(sum(amount), 0) from public.expenses
    where salary_record_id = salary_id and status = 'active'
  ) <> 500.00 then
    raise exception 'Salary cash entries were not recorded once in expenses';
  end if;

  report_result := public.get_financial_reporting_snapshot(
    '2099-08-01', '2099-08-31', null, null
  );
  if (report_result #>> '{summary,totalExpenses}')::numeric <> 500.00
    or (report_result #>> '{summary,operatingNet}')::numeric <> -500.00
    or (report_result #>> '{summary,finalPosition}')::numeric <> -500.00 then
    raise exception 'Recorded salary cash did not reduce report cash position exactly once';
  end if;

  perform public.void_expense(
    gen_random_uuid(), 'reverse salary payment 2', second_salary_expense_id,
    'Synthetic salary payment correction'
  );
  perform public.void_expense(
    gen_random_uuid(), 'reverse salary payment 1', first_salary_expense_id,
    'Synthetic salary payment correction'
  );
  perform public.void_expense(
    gen_random_uuid(), 'reverse SSNIT 2', second_ssnit_expense_id,
    'Synthetic SSNIT correction'
  );
  perform public.void_expense(
    gen_random_uuid(), 'reverse SSNIT 1', first_ssnit_expense_id,
    'Synthetic SSNIT correction'
  );

  if not exists (
    select 1 from public.salary_cash_positions
    where salary_record_id = salary_id
      and salary_payment_status = 'unpaid'
      and salary_paid = 0
      and ssnit_status = 'due'
      and ssnit_remitted = 0
  ) then
    raise exception 'Cash reversal did not restore salary liabilities';
  end if;

  perform public.reverse_salary_record(
    gen_random_uuid(), salary_id, 'Synthetic salary cash proof complete'
  );
  if not exists (
    select 1 from public.salary_cash_positions
    where salary_record_id = salary_id
      and salary_payment_status = 'reversed'
      and salary_outstanding = 0
      and ssnit_status = 'reversed'
      and ssnit_outstanding = 0
  ) then
    raise exception 'Reversed salary cash position is incorrect';
  end if;
end;
$$;

reset role;
select 'PASS: salary and SSNIT cash workflow is exact, retry-safe, reversible and report-backed' as result;
rollback;
