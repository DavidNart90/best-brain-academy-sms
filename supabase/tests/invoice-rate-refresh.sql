-- Rollback-only proof for current-term invoice rate refresh behavior.
-- Run against an isolated/test target that has at least one unpaid term invoice
-- whose base line differs from the active class rate and has transport > 0.

begin;

do $$
declare
  target_invoice record;
  base_component_id bigint;
  transport_component_id bigint;
  expected_base numeric(14, 2);
  expected_transport numeric(14, 2);
  outcome jsonb;
begin
  select
    invoice.id,
    invoice.student_id,
    invoice.academic_year_id,
    invoice.academic_term_id,
    invoice.class_id,
    invoice.school_location_id,
    invoice.total,
    invoice.updated_by
  into target_invoice
  from public.invoices invoice
  where invoice.invoice_kind = 'term'
    and invoice.status = 'unpaid'
    and invoice.amount_paid = 0
    and exists (
      select 1
      from public.invoice_lines line
      join public.fee_components component
        on component.id = line.fee_component_id
      join public.fee_component_rates rate
        on rate.fee_component_id = component.id
        and rate.academic_year_id = invoice.academic_year_id
        and rate.academic_term_id = invoice.academic_term_id
        and rate.class_id = invoice.class_id
        and rate.status = 'active'
      where line.invoice_id = invoice.id
        and component.code = 'base_class_fee'
        and line.amount is distinct from rate.amount
    )
    and exists (
      select 1
      from public.invoice_lines line
      join public.fee_components component
        on component.id = line.fee_component_id
      where line.invoice_id = invoice.id
        and component.code = 'location_transport_charge'
        and line.amount > 0
    )
  order by invoice.id
  limit 1
  for update;

  if target_invoice.id is null then
    raise exception 'Invoice refresh proof requires an unpaid mismatched invoice with transport.';
  end if;

  select id into base_component_id
  from public.fee_components
  where code = 'base_class_fee';

  select id into transport_component_id
  from public.fee_components
  where code = 'location_transport_charge';

  select amount into expected_base
  from public.fee_component_rates
  where fee_component_id = base_component_id
    and academic_year_id = target_invoice.academic_year_id
    and academic_term_id = target_invoice.academic_term_id
    and class_id = target_invoice.class_id
    and status = 'active';

  select amount into expected_transport
  from public.fee_component_rates
  where fee_component_id = transport_component_id
    and academic_year_id = target_invoice.academic_year_id
    and academic_term_id = target_invoice.academic_term_id
    and school_location_id = target_invoice.school_location_id
    and status = 'active';

  outcome := private.generate_invoice_for_student(
    target_invoice.student_id,
    target_invoice.academic_year_id,
    target_invoice.academic_term_id,
    target_invoice.updated_by
  );

  if outcome->>'status' <> 'updated'
    or outcome->'changedComponents' <> '["baseClassFee"]'::jsonb
  then
    raise exception 'Expected a base-only refresh, received %', outcome;
  end if;

  if not exists (
    select 1
    from public.invoices invoice
    where invoice.id = target_invoice.id
      and invoice.total = expected_base + expected_transport
      and invoice.subtotal = expected_base + expected_transport
  ) or not exists (
    select 1
    from public.invoice_lines line
    where line.invoice_id = target_invoice.id
      and line.fee_component_id = base_component_id
      and line.amount = expected_base
  ) then
    raise exception 'Base-only refresh did not reconcile the invoice total and line.';
  end if;

  outcome := private.generate_invoice_for_student(
    target_invoice.student_id,
    target_invoice.academic_year_id,
    target_invoice.academic_term_id,
    target_invoice.updated_by
  );

  if outcome->>'status' <> 'skipped'
    or outcome->>'reason' <> 'The existing unpaid invoice already matches the current fee rates.'
  then
    raise exception 'Expected an idempotent skip, received %', outcome;
  end if;

  update public.invoice_lines
  set amount = expected_transport - 1,
      updated_by = target_invoice.updated_by
  where invoice_id = target_invoice.id
    and fee_component_id = transport_component_id;

  update public.invoices
  set subtotal = expected_base + expected_transport - 1,
      total = expected_base + expected_transport - 1,
      updated_by = target_invoice.updated_by
  where id = target_invoice.id;

  outcome := private.generate_invoice_for_student(
    target_invoice.student_id,
    target_invoice.academic_year_id,
    target_invoice.academic_term_id,
    target_invoice.updated_by
  );

  if outcome->>'status' <> 'updated'
    or outcome->'changedComponents' <> '["transportCharge"]'::jsonb
  then
    raise exception 'Expected a transport-only refresh, received %', outcome;
  end if;

  update public.invoice_lines
  set amount = expected_base - 1,
      updated_by = target_invoice.updated_by
  where invoice_id = target_invoice.id
    and fee_component_id = base_component_id;

  update public.invoices
  set subtotal = expected_base + expected_transport - 1,
      total = expected_base + expected_transport - 1,
      amount_paid = 1,
      status = 'partially_paid',
      updated_by = target_invoice.updated_by
  where id = target_invoice.id;

  outcome := private.generate_invoice_for_student(
    target_invoice.student_id,
    target_invoice.academic_year_id,
    target_invoice.academic_term_id,
    target_invoice.updated_by
  );

  if outcome->>'status' <> 'skipped'
    or outcome->>'reason' <> 'The invoice has payment history and keeps its original fee amounts.'
  then
    raise exception 'Expected payment-history protection, received %', outcome;
  end if;

  if not exists (
    select 1
    from public.invoice_lines line
    where line.invoice_id = target_invoice.id
      and line.fee_component_id = base_component_id
      and line.amount = expected_base - 1
  ) then
    raise exception 'A payment-bearing invoice line was changed.';
  end if;
end;
$$;

select 'invoice rate refresh proof passed' as result;

rollback;
