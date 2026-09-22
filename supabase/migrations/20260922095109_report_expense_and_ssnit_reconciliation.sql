-- Keep the cash reconciliation explicit: ordinary expenses, employee salary
-- payments, and SSNIT remittances are separate cash movements. SSNIT withheld
-- from gross salary remains a liability until a remittance expense is posted.

alter function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  set schema private;
alter function private.get_financial_reporting_snapshot(date, date, bigint, bigint)
  rename to get_financial_reporting_snapshot_with_cash_position;

revoke all on function private.get_financial_reporting_snapshot_with_cash_position(
  date,
  date,
  bigint,
  bigint
) from public, anon, authenticated;

create function public.get_financial_reporting_snapshot(
  report_start date,
  report_end date,
  target_academic_year_id bigint default null,
  target_academic_term_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  ordinary_expenses numeric(14, 2) := 0;
  salary_payments numeric(14, 2) := 0;
  ssnit_remittances numeric(14, 2) := 0;
  ssnit_withheld numeric(14, 2) := 0;
  ssnit_remitted_to_date numeric(14, 2) := 0;
  ssnit_outstanding numeric(14, 2) := 0;
begin
  if auth.uid() is null or not private.has_permission('financials.read') then
    raise exception using errcode = '42501', message = 'You do not have permission to view financial reports.';
  end if;

  result := private.get_financial_reporting_snapshot_with_cash_position(
    report_start,
    report_end,
    target_academic_year_id,
    target_academic_term_id
  );

  select
    coalesce(sum(expense.amount) filter (
      where expense.payroll_cash_kind is null
    ), 0)::numeric(14, 2),
    coalesce(sum(expense.amount) filter (
      where expense.payroll_cash_kind = 'salary_payment'
    ), 0)::numeric(14, 2),
    coalesce(sum(expense.amount) filter (
      where expense.payroll_cash_kind = 'ssnit_remittance'
    ), 0)::numeric(14, 2)
  into ordinary_expenses, salary_payments, ssnit_remittances
  from public.expenses expense
  where expense.status = 'active'
    and expense.business_date between report_start and report_end;

  with scoped_ssnit as (
    select deduction.id, deduction.amount
    from public.salary_deductions deduction
    join public.salary_deduction_types deduction_type
      on deduction_type.id = deduction.deduction_type_id
    join public.salary_records salary
      on salary.id = deduction.salary_record_id
    where deduction.status = 'active'
      and salary.status = 'active'
      and deduction_type.code = 'SSNIT'
      and salary.payroll_month between
        date_trunc('month', report_start)::date
        and date_trunc('month', report_end)::date
  ),
  scoped_remittances as (
    select coalesce(sum(expense.amount), 0)::numeric(14, 2) as amount
    from public.expenses expense
    join scoped_ssnit deduction
      on deduction.id = expense.salary_deduction_id
    where expense.status = 'active'
      and expense.payroll_cash_kind = 'ssnit_remittance'
  )
  select
    coalesce((select sum(deduction.amount) from scoped_ssnit deduction), 0)::numeric(14, 2),
    coalesce((select remittance.amount from scoped_remittances remittance), 0)::numeric(14, 2)
  into ssnit_withheld, ssnit_remitted_to_date;

  ssnit_outstanding := greatest(
    ssnit_withheld - ssnit_remitted_to_date,
    0
  )::numeric(14, 2);

  result := jsonb_set(
    result,
    '{summary,otherExpenses}',
    to_jsonb(ordinary_expenses),
    true
  );
  result := jsonb_set(
    result,
    '{summary,salaryPayments}',
    to_jsonb(salary_payments),
    true
  );
  result := jsonb_set(
    result,
    '{summary,ssnitRemittances}',
    to_jsonb(ssnit_remittances),
    true
  );
  result := jsonb_set(
    result,
    '{summary,ssnitWithheld}',
    to_jsonb(ssnit_withheld),
    true
  );
  result := jsonb_set(
    result,
    '{summary,ssnitRemittedToDate}',
    to_jsonb(ssnit_remitted_to_date),
    true
  );
  result := jsonb_set(
    result,
    '{summary,ssnitOutstanding}',
    to_jsonb(ssnit_outstanding),
    true
  );

  return result;
end;
$$;

revoke all on function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  to authenticated;

comment on function public.get_financial_reporting_snapshot(date, date, bigint, bigint) is
  'Permission-gated financial snapshot with separate ordinary-expense, salary-payment, SSNIT-remittance, and SSNIT-liability totals.';

comment on function private.get_financial_reporting_snapshot_with_cash_position(
  date,
  date,
  bigint,
  bigint
) is
  'Private compatibility implementation used by the public expense and SSNIT reconciliation wrapper.';
