-- Phase 5 P5-01: academic-term assignment is authoritative for billed and outstanding totals.
-- Cash activity remains bounded by its business date in the reporting core.

alter function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  set schema private;
alter function private.get_financial_reporting_snapshot(date, date, bigint, bigint)
  rename to get_financial_reporting_snapshot_core;

revoke all on function private.get_financial_reporting_snapshot_core(date, date, bigint, bigint)
  from public, anon, authenticated;

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
  expected_fees numeric(14, 2);
  outstanding_fees numeric(14, 2);
begin
  result := private.get_financial_reporting_snapshot_core(
    report_start,
    report_end,
    target_academic_year_id,
    target_academic_term_id
  );

  select
    coalesce(sum(invoice.total), 0)::numeric(14, 2),
    coalesce(sum(invoice.outstanding), 0)::numeric(14, 2)
  into expected_fees, outstanding_fees
  from public.invoices invoice
  where invoice.status <> 'cancelled'
    and (
      (target_academic_term_id is not null and invoice.academic_term_id = target_academic_term_id)
      or
      (target_academic_term_id is null and invoice.issued_on between report_start and report_end)
    )
    and (
      target_academic_year_id is null
      or invoice.academic_year_id = target_academic_year_id
    );

  result := jsonb_set(result, '{summary,expectedFees}', to_jsonb(expected_fees));
  result := jsonb_set(result, '{summary,outstandingFees}', to_jsonb(outstanding_fees));
  return result;
end;
$$;

revoke all on function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.get_financial_reporting_snapshot(date, date, bigint, bigint)
  to authenticated;

comment on function public.get_financial_reporting_snapshot(date, date, bigint, bigint) is
  'Permission-gated financial snapshot. Term-scoped invoice totals follow invoice term assignment; cash activity follows business dates.';
