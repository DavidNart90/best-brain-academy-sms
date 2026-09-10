-- Salary posting records a monthly calculation, not a cash payment.
-- Keep posted deductions visible for salary reporting while excluding them from
-- operating net and recorded cash position until an actual payment/remittance
-- ledger is implemented.

alter function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  set schema private;
alter function private.get_financial_reporting_snapshot(date, date, bigint, bigint)
  rename to get_financial_reporting_snapshot_with_posted_deductions;

revoke all on function private.get_financial_reporting_snapshot_with_posted_deductions(
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
  daily_result jsonb;
  monthly_result jsonb;
begin
  if auth.uid() is null or not private.has_permission('financials.read') then
    raise exception using errcode = '42501', message = 'You do not have permission to view financial reports.';
  end if;

  result := private.get_financial_reporting_snapshot_with_posted_deductions(
    report_start,
    report_end,
    target_academic_year_id,
    target_academic_term_id
  );

  result := jsonb_set(
    result,
    '{summary,finalPosition}',
    result #> '{summary,operatingNet}',
    false
  );

  select coalesce(
    jsonb_agg(
      item || jsonb_build_object('finalPosition', item->'operatingNet')
      order by item_order
    ),
    '[]'::jsonb
  )
  into daily_result
  from jsonb_array_elements(result->'daily') with ordinality as daily(item, item_order);

  select coalesce(
    jsonb_agg(
      item || jsonb_build_object('finalPosition', item->'operatingNet')
      order by item_order
    ),
    '[]'::jsonb
  )
  into monthly_result
  from jsonb_array_elements(result->'monthly') with ordinality as monthly(item, item_order);

  result := jsonb_set(result, '{daily}', daily_result, false);
  result := jsonb_set(result, '{monthly}', monthly_result, false);

  return result;
end;
$$;

revoke all on function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  to authenticated;

comment on function public.get_financial_reporting_snapshot(date, date, bigint, bigint) is
  'Permission-gated reporting snapshot. Posted salary deductions are informational and do not reduce operating net or recorded cash position.';

comment on function private.get_financial_reporting_snapshot_with_posted_deductions(
  date,
  date,
  bigint,
  bigint
) is
  'Private compatibility implementation used by the public cash-based reporting snapshot.';

alter function public.get_financial_weekly_totals(date, date)
  set schema private;
alter function private.get_financial_weekly_totals(date, date)
  rename to get_financial_weekly_totals_with_posted_deductions;

revoke all on function private.get_financial_weekly_totals_with_posted_deductions(date, date)
  from public, anon, authenticated;

create function public.get_financial_weekly_totals(
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

  return query
  select
    weekly.period_start,
    weekly.gross_receipts,
    weekly.expenses,
    weekly.salary_deductions,
    weekly.operating_net,
    weekly.operating_net as final_position
  from private.get_financial_weekly_totals_with_posted_deductions(
    report_start,
    report_end
  ) weekly;
end;
$$;

revoke all on function public.get_financial_weekly_totals(date, date)
  from public, anon, authenticated;
grant execute on function public.get_financial_weekly_totals(date, date)
  to authenticated;

comment on function public.get_financial_weekly_totals(date, date) is
  'Permission-gated weekly receipts, expenses, informational salary deductions, operating net and recorded cash position.';

comment on function private.get_financial_weekly_totals_with_posted_deductions(date, date) is
  'Private compatibility implementation used by the public cash-based weekly report.';
