-- Phase 5 P5-01: bounded weekly finance totals complement the daily/monthly/term snapshot.

create or replace function public.get_financial_weekly_totals(
  report_start date,
  report_end date
)
returns table (
  period_start date,
  gross_receipts numeric(14, 2),
  expenses numeric(14, 2),
  salary_deductions numeric(14, 2),
  operating_net numeric(14, 2),
  final_position numeric(14, 2)
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_permission('financials.read') then
    raise exception using errcode = '42501', message = 'You do not have permission to view financial reports.';
  end if;

  if report_start is null or report_end is null or report_end < report_start then
    raise exception using errcode = '22023', message = 'Choose a valid report date range.';
  end if;

  if report_end - report_start > 730 then
    raise exception using errcode = '22023', message = 'Report ranges cannot exceed two years.';
  end if;

  return query
  with weekly as (
    select
      date_trunc('week', activity.business_date)::date as week_start,
      coalesce(sum(activity.amount) filter (
        where activity.record_kind = 'income' and activity.status = 'active'
      ), 0)::numeric(14, 2) as income_amount,
      coalesce(sum(activity.amount) filter (
        where activity.record_kind = 'expense' and activity.status = 'active'
      ), 0)::numeric(14, 2) as expense_amount,
      coalesce(sum(activity.amount) filter (
        where activity.record_kind = 'deduction' and activity.status = 'active'
      ), 0)::numeric(14, 2) as deduction_amount
    from public.financial_activity_report activity
    where activity.business_date between report_start and report_end
    group by date_trunc('week', activity.business_date)
  )
  select
    weekly.week_start,
    weekly.income_amount,
    weekly.expense_amount,
    weekly.deduction_amount,
    (weekly.income_amount - weekly.expense_amount)::numeric(14, 2),
    (weekly.income_amount - weekly.expense_amount - weekly.deduction_amount)::numeric(14, 2)
  from weekly
  order by weekly.week_start;
end;
$$;

revoke all on function public.get_financial_weekly_totals(date, date)
  from public, anon, authenticated;
grant execute on function public.get_financial_weekly_totals(date, date)
  to authenticated;

comment on function public.get_financial_weekly_totals(date, date) is
  'Permission-gated weekly gross receipts, expenses, salary deductions, operating net and final position.';
