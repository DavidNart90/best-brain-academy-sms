-- Keep a single permissive SELECT policy per invoice table while preserving
-- finance-wide, outstanding-balance, and end-of-term read boundaries.

drop policy if exists invoices_read_finance on public.invoices;
drop policy if exists invoices_read_outstanding_balances on public.invoices;
drop policy if exists invoices_read_end_term_authorized on public.invoices;

create policy invoices_read_authorized
on public.invoices
for select
to authenticated
using (
  (select private.has_permission('financials.read'))
  or (
    status in ('unpaid', 'partially_paid')
    and outstanding > 0
    and (select private.has_permission('finance.outstanding.read'))
  )
  or (
    invoice_kind = 'end_of_term'
    and (select private.has_permission('finance.end_term_invoices.read'))
  )
);

drop policy if exists invoice_lines_read_finance on public.invoice_lines;
drop policy if exists invoice_lines_read_end_term_authorized on public.invoice_lines;

create policy invoice_lines_read_authorized
on public.invoice_lines
for select
to authenticated
using (
  (select private.has_permission('financials.read'))
  or (
    (select private.has_permission('finance.end_term_invoices.read'))
    and exists (
      select 1
      from public.invoices invoice
      where invoice.id = invoice_lines.invoice_id
        and invoice.invoice_kind = 'end_of_term'
    )
  )
);
