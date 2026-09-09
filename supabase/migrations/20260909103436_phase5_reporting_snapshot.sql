-- Phase 5 P5-01: one permission-gated, reconstructible reporting snapshot.
-- Aggregates are derived from authoritative posted records; no cached totals are accounting truth.

create or replace function public.get_financial_reporting_snapshot(
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
  actor_id uuid := auth.uid();
  result jsonb;
begin
  if actor_id is null or not private.has_permission('financials.read') then
    raise exception using errcode = '42501', message = 'You do not have permission to view financial reports.';
  end if;

  if report_start is null or report_end is null or report_end < report_start then
    raise exception using errcode = '22023', message = 'Choose a valid report date range.';
  end if;

  if report_end - report_start > 730 then
    raise exception using errcode = '22023', message = 'Report ranges cannot exceed two years.';
  end if;

  if target_academic_term_id is not null and not exists (
    select 1
    from public.academic_terms term
    where term.id = target_academic_term_id
      and (target_academic_year_id is null or term.academic_year_id = target_academic_year_id)
  ) then
    raise exception using errcode = '22023', message = 'The selected academic term is invalid.';
  end if;

  with
  scoped_invoices as materialized (
    select
      invoice.id,
      invoice.total,
      invoice.amount_paid,
      invoice.outstanding,
      invoice.class_name_snapshot,
      invoice.academic_year_id,
      invoice.academic_term_id,
      invoice.issued_on
    from public.invoices invoice
    where invoice.status <> 'cancelled'
      and invoice.issued_on between report_start and report_end
      and (target_academic_year_id is null or invoice.academic_year_id = target_academic_year_id)
      and (target_academic_term_id is null or invoice.academic_term_id = target_academic_term_id)
  ),
  school_fee_records as materialized (
    select
      payment.id,
      coalesce(receipt.receipt_number, payment.payment_number) as reference,
      payment.business_date,
      payment.amount,
      invoice.class_name_snapshot as class_name,
      coalesce(receipt.student_name_snapshot, invoice.class_name_snapshot, 'School-fee payer') as person_name,
      coalesce(receipt.payment_method_name_snapshot, method.name, 'Not recorded') as payment_method
    from public.payments payment
    join public.invoices invoice on invoice.id = payment.invoice_id
    left join public.receipts receipt on receipt.payment_id = payment.id
    left join public.payment_methods method on method.id = payment.payment_method_id
    where payment.status = 'active'
      and payment.business_date between report_start and report_end
      and (target_academic_year_id is null or invoice.academic_year_id = target_academic_year_id)
      and (target_academic_term_id is null or invoice.academic_term_id = target_academic_term_id)
  ),
  income_records as materialized (
    select
      'School fees'::text as category,
      record.reference,
      record.business_date,
      record.amount,
      record.person_name,
      record.class_name,
      record.payment_method
    from school_fee_records record
    union all
    select
      'Feeding',
      receipt.receipt_number,
      receipt.business_date,
      receipt.amount,
      coalesce(receipt.student_name_snapshot, 'Daily aggregate'),
      receipt.class_name_snapshot,
      receipt.payment_method_name_snapshot
    from public.feeding_receipts receipt
    where receipt.status = 'active'
      and receipt.business_date between report_start and report_end
    union all
    select
      'Admission',
      receipt.receipt_number,
      receipt.business_date,
      receipt.amount,
      coalesce(receipt.student_name_snapshot, 'Daily aggregate'),
      receipt.class_name_snapshot,
      receipt.payment_method_name_snapshot
    from public.admission_receipts receipt
    where receipt.status = 'active'
      and receipt.business_date between report_start and report_end
    union all
    select
      'Miscellaneous',
      receipt.receipt_number,
      receipt.business_date,
      receipt.amount,
      coalesce(receipt.payer_name, 'Unattributed payer'),
      null,
      receipt.payment_method_name_snapshot
    from public.misc_receipts receipt
    where receipt.status = 'active'
      and receipt.business_date between report_start and report_end
  ),
  expense_records as materialized (
    select
      expense.expense_number as reference,
      expense.business_date,
      expense.amount,
      expense.expense_category_name_snapshot as category,
      expense.description,
      expense.payment_method_name_snapshot as payment_method
    from public.expenses expense
    where expense.status = 'active'
      and expense.business_date between report_start and report_end
  ),
  deduction_records as materialized (
    select
      deduction.deduction_number as reference,
      salary.payroll_month,
      deduction.amount,
      deduction.deduction_type_name_snapshot as category,
      salary.staff_name_snapshot as staff_name
    from public.salary_deductions deduction
    join public.salary_records salary on salary.id = deduction.salary_record_id
    where deduction.status = 'active'
      and salary.status = 'active'
      and salary.payroll_month between date_trunc('month', report_start)::date
        and date_trunc('month', report_end)::date
  ),
  reversed_records as materialized (
    select 'Cancelled invoices'::text as category, invoice.total as amount
    from public.invoices invoice
    where invoice.status = 'cancelled'
      and invoice.issued_on between report_start and report_end
      and (target_academic_year_id is null or invoice.academic_year_id = target_academic_year_id)
      and (target_academic_term_id is null or invoice.academic_term_id = target_academic_term_id)
    union all
    select 'Reversed school-fee payments', payment.amount
    from public.payments payment
    join public.invoices invoice on invoice.id = payment.invoice_id
    where payment.status = 'reversed'
      and payment.business_date between report_start and report_end
      and (target_academic_year_id is null or invoice.academic_year_id = target_academic_year_id)
      and (target_academic_term_id is null or invoice.academic_term_id = target_academic_term_id)
    union all
    select 'Reversed feeding receipts', receipt.amount
    from public.feeding_receipts receipt
    where receipt.status = 'reversed' and receipt.business_date between report_start and report_end
    union all
    select 'Reversed admission receipts', receipt.amount
    from public.admission_receipts receipt
    where receipt.status = 'reversed' and receipt.business_date between report_start and report_end
    union all
    select 'Reversed miscellaneous receipts', receipt.amount
    from public.misc_receipts receipt
    where receipt.status = 'reversed' and receipt.business_date between report_start and report_end
    union all
    select 'Reversed expenses', expense.amount
    from public.expenses expense
    where expense.status = 'reversed' and expense.business_date between report_start and report_end
    union all
    select 'Reversed salary deductions', deduction.amount
    from public.salary_deductions deduction
    join public.salary_records salary on salary.id = deduction.salary_record_id
    where deduction.status = 'reversed'
      and salary.payroll_month between date_trunc('month', report_start)::date
        and date_trunc('month', report_end)::date
  ),
  totals as (
    select
      coalesce((select sum(total) from scoped_invoices), 0)::numeric(14, 2) as expected_fees,
      coalesce((select sum(amount) from school_fee_records), 0)::numeric(14, 2) as school_fees_collected,
      coalesce((select sum(outstanding) from scoped_invoices), 0)::numeric(14, 2) as outstanding_fees,
      coalesce((select sum(amount) from income_records where category = 'Feeding'), 0)::numeric(14, 2) as feeding_collected,
      coalesce((select sum(amount) from income_records where category = 'Admission'), 0)::numeric(14, 2) as admission_collected,
      coalesce((select sum(amount) from income_records where category = 'Miscellaneous'), 0)::numeric(14, 2) as miscellaneous_collected,
      coalesce((select sum(amount) from income_records), 0)::numeric(14, 2) as gross_receipts,
      coalesce((select sum(amount) from expense_records), 0)::numeric(14, 2) as total_expenses,
      coalesce((select sum(amount) from deduction_records), 0)::numeric(14, 2) as salary_deductions,
      coalesce((select count(*) from income_records), 0)::bigint as receipt_count,
      coalesce((select count(*) from expense_records), 0)::bigint as expense_count,
      coalesce((select count(*) from deduction_records), 0)::bigint as deduction_count,
      coalesce((select count(*) from reversed_records), 0)::bigint as reversal_count
  ),
  daily_income as (
    select business_date, sum(amount)::numeric(14, 2) as amount
    from income_records
    group by business_date
  ),
  daily_expenses as (
    select business_date, sum(amount)::numeric(14, 2) as amount
    from expense_records
    group by business_date
  ),
  daily_deductions as (
    select payroll_month as business_date, sum(amount)::numeric(14, 2) as amount
    from deduction_records
    group by payroll_month
  ),
  daily_trend as materialized (
    select
      day::date as period_start,
      coalesce(income.amount, 0)::numeric(14, 2) as gross_receipts,
      coalesce(expense.amount, 0)::numeric(14, 2) as expenses,
      coalesce(deduction.amount, 0)::numeric(14, 2) as salary_deductions,
      (coalesce(income.amount, 0) - coalesce(expense.amount, 0))::numeric(14, 2) as operating_net,
      (coalesce(income.amount, 0) - coalesce(expense.amount, 0) - coalesce(deduction.amount, 0))::numeric(14, 2) as final_position
    from generate_series(report_start, report_end, interval '1 day') day
    left join daily_income income on income.business_date = day::date
    left join daily_expenses expense on expense.business_date = day::date
    left join daily_deductions deduction on deduction.business_date = day::date
  ),
  monthly_trend as (
    select
      date_trunc('month', period_start)::date as period_start,
      sum(gross_receipts)::numeric(14, 2) as gross_receipts,
      sum(expenses)::numeric(14, 2) as expenses,
      sum(salary_deductions)::numeric(14, 2) as salary_deductions,
      sum(operating_net)::numeric(14, 2) as operating_net,
      sum(final_position)::numeric(14, 2) as final_position
    from daily_trend
    group by date_trunc('month', period_start)
    order by period_start
  ),
  income_breakdown as (
    select category, count(*)::bigint as record_count, sum(amount)::numeric(14, 2) as amount
    from income_records
    group by category
    order by category
  ),
  expense_breakdown as (
    select category, count(*)::bigint as record_count, sum(amount)::numeric(14, 2) as amount
    from expense_records
    group by category
    order by amount desc, category
  ),
  deduction_breakdown as (
    select category, count(*)::bigint as record_count, sum(amount)::numeric(14, 2) as amount
    from deduction_records
    group by category
    order by amount desc, category
  ),
  class_breakdown as (
    select class_name as category, count(*)::bigint as record_count, sum(amount)::numeric(14, 2) as amount
    from school_fee_records
    group by class_name
    order by amount desc, class_name
  ),
  reversal_breakdown as (
    select category, count(*)::bigint as record_count, sum(amount)::numeric(14, 2) as amount
    from reversed_records
    group by category
    order by category
  ),
  recent_collections as (
    select category, reference, business_date, amount, person_name, class_name, payment_method
    from income_records
    order by business_date desc, reference desc
    limit 10
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'start', report_start,
      'end', report_end,
      'academicYearId', target_academic_year_id,
      'academicTermId', target_academic_term_id
    ),
    'summary', (
      select jsonb_build_object(
        'expectedFees', expected_fees,
        'schoolFeesCollected', school_fees_collected,
        'outstandingFees', outstanding_fees,
        'feedingCollected', feeding_collected,
        'admissionCollected', admission_collected,
        'miscellaneousCollected', miscellaneous_collected,
        'grossReceipts', gross_receipts,
        'totalExpenses', total_expenses,
        'operatingNet', (gross_receipts - total_expenses)::numeric(14, 2),
        'salaryDeductions', salary_deductions,
        'finalPosition', (gross_receipts - total_expenses - salary_deductions)::numeric(14, 2),
        'receiptCount', receipt_count,
        'expenseCount', expense_count,
        'deductionCount', deduction_count,
        'reversalCount', reversal_count
      ) from totals
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'periodStart', period_start,
        'grossReceipts', gross_receipts,
        'expenses', expenses,
        'salaryDeductions', salary_deductions,
        'operatingNet', operating_net,
        'finalPosition', final_position
      ) order by period_start)
      from daily_trend
    ), '[]'::jsonb),
    'monthly', coalesce((
      select jsonb_agg(jsonb_build_object(
        'periodStart', period_start,
        'grossReceipts', gross_receipts,
        'expenses', expenses,
        'salaryDeductions', salary_deductions,
        'operatingNet', operating_net,
        'finalPosition', final_position
      ) order by period_start)
      from monthly_trend
    ), '[]'::jsonb),
    'incomeBreakdown', coalesce((
      select jsonb_agg(jsonb_build_object('label', category, 'count', record_count, 'amount', amount) order by category)
      from income_breakdown
    ), '[]'::jsonb),
    'expenseBreakdown', coalesce((
      select jsonb_agg(jsonb_build_object('label', category, 'count', record_count, 'amount', amount) order by amount desc, category)
      from expense_breakdown
    ), '[]'::jsonb),
    'deductionBreakdown', coalesce((
      select jsonb_agg(jsonb_build_object('label', category, 'count', record_count, 'amount', amount) order by amount desc, category)
      from deduction_breakdown
    ), '[]'::jsonb),
    'classCollections', coalesce((
      select jsonb_agg(jsonb_build_object('label', category, 'count', record_count, 'amount', amount) order by amount desc, category)
      from class_breakdown
    ), '[]'::jsonb),
    'reversals', coalesce((
      select jsonb_agg(jsonb_build_object('label', category, 'count', record_count, 'amount', amount) order by category)
      from reversal_breakdown
    ), '[]'::jsonb),
    'recentCollections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source', category,
        'reference', reference,
        'businessDate', business_date,
        'amount', amount,
        'personName', person_name,
        'className', class_name,
        'paymentMethod', payment_method
      ) order by business_date desc, reference desc)
      from recent_collections
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  to authenticated;
