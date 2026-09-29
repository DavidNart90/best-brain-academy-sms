-- Include within-township daily transport receipts in every financial reporting
-- aggregate while preserving the existing payroll cash/liability reconciliation.

set lock_timeout = '5s';

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
  result jsonb;
  daily_result jsonb;
  monthly_result jsonb;
  recent_result jsonb;
  ordinary_expenses numeric(14, 2) := 0;
  salary_payments numeric(14, 2) := 0;
  ssnit_remittances numeric(14, 2) := 0;
  ssnit_withheld numeric(14, 2) := 0;
  ssnit_remitted_to_date numeric(14, 2) := 0;
  ssnit_outstanding numeric(14, 2) := 0;
  township_transport_collected numeric(14, 2) := 0;
  township_transport_count bigint := 0;
  reversed_township_transport numeric(14, 2) := 0;
  reversed_township_transport_count bigint := 0;
begin
  if auth.uid() is null
    or not private.has_permission('financials.read')
  then
    raise exception using
      errcode = '42501',
      message = 'You do not have permission to view financial reports.';
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
    coalesce(
      (select sum(deduction.amount) from scoped_ssnit deduction),
      0
    )::numeric(14, 2),
    coalesce(
      (select remittance.amount from scoped_remittances remittance),
      0
    )::numeric(14, 2)
  into ssnit_withheld, ssnit_remitted_to_date;

  ssnit_outstanding := greatest(
    ssnit_withheld - ssnit_remitted_to_date,
    0
  )::numeric(14, 2);

  select
    coalesce(sum(receipt.amount), 0)::numeric(14, 2),
    count(*)::bigint
  into township_transport_collected, township_transport_count
  from public.township_transport_receipts receipt
  where receipt.status = 'active'
    and receipt.business_date between report_start and report_end;

  select
    coalesce(sum(receipt.amount), 0)::numeric(14, 2),
    count(*)::bigint
  into reversed_township_transport, reversed_township_transport_count
  from public.township_transport_receipts receipt
  where receipt.status = 'reversed'
    and receipt.business_date between report_start and report_end;

  result := jsonb_set(
    result,
    '{summary,townshipTransportCollected}',
    to_jsonb(township_transport_collected),
    true
  );
  result := jsonb_set(
    result,
    '{summary,grossReceipts}',
    to_jsonb(
      (result #>> '{summary,grossReceipts}')::numeric
        + township_transport_collected
    ),
    false
  );
  result := jsonb_set(
    result,
    '{summary,operatingNet}',
    to_jsonb(
      (result #>> '{summary,operatingNet}')::numeric
        + township_transport_collected
    ),
    false
  );
  result := jsonb_set(
    result,
    '{summary,finalPosition}',
    to_jsonb(
      (result #>> '{summary,finalPosition}')::numeric
        + township_transport_collected
    ),
    false
  );
  result := jsonb_set(
    result,
    '{summary,receiptCount}',
    to_jsonb(
      (result #>> '{summary,receiptCount}')::bigint
        + township_transport_count
    ),
    false
  );
  result := jsonb_set(
    result,
    '{summary,reversalCount}',
    to_jsonb(
      (result #>> '{summary,reversalCount}')::bigint
        + reversed_township_transport_count
    ),
    false
  );

  with transport_by_day as (
    select
      receipt.business_date,
      sum(receipt.amount)::numeric(14, 2) as amount
    from public.township_transport_receipts receipt
    where receipt.status = 'active'
      and receipt.business_date between report_start and report_end
    group by receipt.business_date
  ),
  items as (
    select
      daily.item,
      daily.item_order,
      (daily.item->>'periodStart')::date as period_start
    from jsonb_array_elements(result->'daily')
      with ordinality as daily(item, item_order)
  )
  select coalesce(
    jsonb_agg(
      item || jsonb_build_object(
        'grossReceipts',
          (item->>'grossReceipts')::numeric + coalesce(transport.amount, 0),
        'operatingNet',
          (item->>'operatingNet')::numeric + coalesce(transport.amount, 0),
        'finalPosition',
          (item->>'finalPosition')::numeric + coalesce(transport.amount, 0)
      )
      order by item_order
    ),
    '[]'::jsonb
  )
  into daily_result
  from items
  left join transport_by_day transport
    on transport.business_date = items.period_start;

  with transport_by_month as (
    select
      date_trunc('month', receipt.business_date)::date as period_start,
      sum(receipt.amount)::numeric(14, 2) as amount
    from public.township_transport_receipts receipt
    where receipt.status = 'active'
      and receipt.business_date between report_start and report_end
    group by date_trunc('month', receipt.business_date)
  ),
  items as (
    select
      monthly.item,
      monthly.item_order,
      (monthly.item->>'periodStart')::date as period_start
    from jsonb_array_elements(result->'monthly')
      with ordinality as monthly(item, item_order)
  )
  select coalesce(
    jsonb_agg(
      item || jsonb_build_object(
        'grossReceipts',
          (item->>'grossReceipts')::numeric + coalesce(transport.amount, 0),
        'operatingNet',
          (item->>'operatingNet')::numeric + coalesce(transport.amount, 0),
        'finalPosition',
          (item->>'finalPosition')::numeric + coalesce(transport.amount, 0)
      )
      order by item_order
    ),
    '[]'::jsonb
  )
  into monthly_result
  from items
  left join transport_by_month transport
    on transport.period_start = items.period_start;

  result := jsonb_set(result, '{daily}', daily_result, false);
  result := jsonb_set(result, '{monthly}', monthly_result, false);

  if township_transport_count > 0 then
    result := jsonb_set(
      result,
      '{incomeBreakdown}',
      (result->'incomeBreakdown') || jsonb_build_array(
        jsonb_build_object(
          'label', 'Township transport',
          'count', township_transport_count,
          'amount', township_transport_collected
        )
      ),
      false
    );
  end if;

  if reversed_township_transport_count > 0 then
    result := jsonb_set(
      result,
      '{reversals}',
      (result->'reversals') || jsonb_build_array(
        jsonb_build_object(
          'label', 'Reversed township transport receipts',
          'count', reversed_township_transport_count,
          'amount', reversed_township_transport
        )
      ),
      false
    );
  end if;

  with existing as (
    select
      item->>'source' as source,
      item->>'reference' as reference,
      (item->>'businessDate')::date as business_date,
      (item->>'amount')::numeric(14, 2) as amount,
      item->>'personName' as person_name,
      nullif(item->>'className', '') as class_name,
      item->>'paymentMethod' as payment_method
    from jsonb_array_elements(result->'recentCollections') item
  ),
  combined as (
    select * from existing
    union all
    select
      'Township transport',
      receipt.receipt_number,
      receipt.business_date,
      receipt.amount,
      'Daily aggregate',
      null::text,
      receipt.payment_method_name_snapshot
    from public.township_transport_receipts receipt
    where receipt.status = 'active'
      and receipt.business_date between report_start and report_end
  ),
  recent as (
    select *
    from combined
    order by business_date desc, reference desc
    limit 10
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'source', source,
        'reference', reference,
        'businessDate', business_date,
        'amount', amount,
        'personName', person_name,
        'className', class_name,
        'paymentMethod', payment_method
      )
      order by business_date desc, reference desc
    ),
    '[]'::jsonb
  )
  into recent_result
  from recent;

  result := jsonb_set(result, '{recentCollections}', recent_result, false);

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

revoke all on function public.get_financial_reporting_snapshot(
  date, date, bigint, bigint
) from public, anon, authenticated;
grant execute on function public.get_financial_reporting_snapshot(
  date, date, bigint, bigint
) to authenticated;

comment on function public.get_financial_reporting_snapshot(
  date, date, bigint, bigint
) is
  'Permission-gated financial snapshot including daily township transport, ordinary expenses, salary payments, SSNIT remittances, and SSNIT liability totals.';
