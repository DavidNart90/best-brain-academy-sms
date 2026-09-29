-- Correct the existing-invoice record initialization in the unpaid invoice refresh helper.

create or replace function private.generate_invoice_for_student(
  target_student_id bigint,
  target_academic_year_id bigint,
  target_academic_term_id bigint,
  actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  enrollment record;
  student record;
  existing_invoice record;
  fee_rate record;
  base_line record;
  transport_line record;
  base_component_id bigint;
  transport_component_id bigint;
  base_rate_amount numeric(14, 2);
  transport_rate_amount numeric(14, 2);
  refreshed_total numeric(14, 2);
  new_invoice_id bigint;
  new_invoice_number text;
  transport_label text;
  changed_components text[] := array[]::text[];
begin
  -- Keep the fee schedule stable for the whole invoice-generation transaction.
  -- Direct fee edits take a conflicting table lock and therefore wait.
  lock table public.fee_component_rates in share mode;

  -- This lock serializes a rate refresh with payment posting, which also locks
  -- the invoice row before changing its paid amount and status.
  select
    invoice.id,
    invoice.invoice_number,
    invoice.invoice_kind,
    invoice.status,
    invoice.amount_paid,
    invoice.subtotal,
    invoice.total,
    invoice.class_id,
    invoice.school_location_id
  into existing_invoice
  from public.invoices invoice
  where invoice.student_id = target_student_id
    and invoice.academic_year_id = target_academic_year_id
    and invoice.academic_term_id = target_academic_term_id
    and invoice.status <> 'cancelled'
  order by invoice.id desc
  limit 1
  for update;

  if existing_invoice.id is not null then
    if existing_invoice.invoice_kind <> 'term' then
      return jsonb_build_object(
        'studentId', target_student_id,
        'status', 'skipped',
        'reason', 'The active invoice is an end-of-term invoice and cannot be refreshed by term billing.'
      );
    end if;

    if existing_invoice.status <> 'unpaid' or existing_invoice.amount_paid <> 0 then
      return jsonb_build_object(
        'studentId', target_student_id,
        'status', 'skipped',
        'reason', 'The invoice has payment history and keeps its original fee amounts.'
      );
    end if;

    -- Preserve the class and location that were billed on the invoice. A later
    -- enrollment move must not silently change the invoice's billing scope.
    select
      existing_invoice.class_id as class_id,
      existing_invoice.school_location_id as school_location_id
    into enrollment;
  else
    select enrollment_row.class_id, enrollment_row.school_location_id
    into enrollment
    from public.student_enrollments enrollment_row
    where enrollment_row.student_id = target_student_id
      and enrollment_row.academic_year_id = target_academic_year_id
      and enrollment_row.academic_term_id = target_academic_term_id
      and enrollment_row.status = 'active';

    if enrollment.class_id is null then
      return jsonb_build_object(
        'studentId', target_student_id,
        'status', 'skipped',
        'reason', 'No active enrollment for this academic year and term.'
      );
    end if;
  end if;

  select
    student_row.id,
    student_row.admission_number,
    concat_ws(
      ' ',
      student_row.first_name,
      student_row.middle_name,
      student_row.last_name
    ) as full_name
  into student
  from public.students student_row
  where student_row.id = target_student_id
    and student_row.status = 'active';

  if student.id is null then
    return jsonb_build_object(
      'studentId', target_student_id,
      'status', 'skipped',
      'reason', 'The student is not active.'
    );
  end if;

  select component.id
  into base_component_id
  from public.fee_components component
  where component.code = 'base_class_fee';

  select component.id
  into transport_component_id
  from public.fee_components component
  where component.code = 'location_transport_charge';

  -- Read and lock both component rates in one ordered statement so an invoice
  -- cannot be assembled from two different rate revisions.
  for fee_rate in
    select component.code, rate.amount
    from public.fee_component_rates rate
    join public.fee_components component
      on component.id = rate.fee_component_id
    where rate.academic_year_id = target_academic_year_id
      and rate.academic_term_id = target_academic_term_id
      and rate.status = 'active'
      and (
        (
          component.code = 'base_class_fee'
          and rate.class_id = enrollment.class_id
        )
        or (
          component.code = 'location_transport_charge'
          and rate.school_location_id = enrollment.school_location_id
        )
      )
    order by rate.id
    for share of rate
  loop
    if fee_rate.code = 'base_class_fee' then
      base_rate_amount := fee_rate.amount;
    elsif fee_rate.code = 'location_transport_charge' then
      transport_rate_amount := fee_rate.amount;
    end if;
  end loop;

  if base_rate_amount is null or transport_rate_amount is null then
    return jsonb_build_object(
      'studentId', target_student_id,
      'status', 'skipped',
      'reason', 'Base class fee or transport charge is not configured for this class/location and term.'
    );
  end if;

  select settings.location_charge_label
  into transport_label
  from public.school_settings settings
  where settings.id = 1;

  refreshed_total := base_rate_amount + transport_rate_amount;

  if existing_invoice.id is not null then
    perform 1
    from public.invoice_lines line
    where line.invoice_id = existing_invoice.id
    order by line.id
    for update;

    select line.id, line.amount
    into base_line
    from public.invoice_lines line
    where line.invoice_id = existing_invoice.id
      and line.fee_component_id = base_component_id
    order by line.id
    limit 1;

    select line.id, line.amount
    into transport_line
    from public.invoice_lines line
    where line.invoice_id = existing_invoice.id
      and line.fee_component_id = transport_component_id
    order by line.id
    limit 1;

    if base_line.id is null then
      insert into public.invoice_lines (
        invoice_id,
        fee_component_id,
        description,
        amount,
        sort_order,
        created_by,
        updated_by
      ) values (
        existing_invoice.id,
        base_component_id,
        'Base Class Fee',
        base_rate_amount,
        1,
        actor_id,
        actor_id
      );
      changed_components := array_append(changed_components, 'baseClassFee');
    elsif base_line.amount is distinct from base_rate_amount then
      update public.invoice_lines
      set amount = base_rate_amount,
          updated_by = actor_id
      where id = base_line.id;
      changed_components := array_append(changed_components, 'baseClassFee');
    end if;

    if transport_rate_amount > 0 then
      if transport_line.id is null then
        insert into public.invoice_lines (
          invoice_id,
          fee_component_id,
          description,
          amount,
          sort_order,
          created_by,
          updated_by
        ) values (
          existing_invoice.id,
          transport_component_id,
          coalesce(transport_label, 'Location / Transport Charge'),
          transport_rate_amount,
          2,
          actor_id,
          actor_id
        );
        changed_components := array_append(changed_components, 'transportCharge');
      elsif transport_line.amount is distinct from transport_rate_amount then
        update public.invoice_lines
        set amount = transport_rate_amount,
            updated_by = actor_id
        where id = transport_line.id;
        changed_components := array_append(changed_components, 'transportCharge');
      end if;
    elsif transport_line.id is not null then
      delete from public.invoice_lines
      where id = transport_line.id;
      changed_components := array_append(changed_components, 'transportCharge');
    end if;

    if cardinality(changed_components) = 0
      and existing_invoice.subtotal is not distinct from refreshed_total
      and existing_invoice.total is not distinct from refreshed_total
    then
      return jsonb_build_object(
        'studentId', student.id,
        'status', 'skipped',
        'reason', 'The existing unpaid invoice already matches the current fee rates.'
      );
    end if;

    update public.invoices
    set subtotal = refreshed_total,
        total = refreshed_total,
        updated_by = actor_id
    where id = existing_invoice.id;

    return jsonb_build_object(
      'studentId', student.id,
      'status', 'updated',
      'invoiceId', existing_invoice.id,
      'invoiceNumber', existing_invoice.invoice_number,
      'changedComponents', to_jsonb(changed_components),
      'previousTotal', existing_invoice.total,
      'newTotal', refreshed_total
    );
  end if;

  new_invoice_number := private.allocate_document_number('INV');
  insert into public.invoices (
    invoice_number,
    student_id,
    academic_year_id,
    academic_term_id,
    class_id,
    school_location_id,
    student_name_snapshot,
    admission_number_snapshot,
    class_name_snapshot,
    location_name_snapshot,
    subtotal,
    total,
    created_by,
    updated_by
  )
  select
    new_invoice_number,
    student.id,
    target_academic_year_id,
    target_academic_term_id,
    enrollment.class_id,
    enrollment.school_location_id,
    student.full_name,
    student.admission_number,
    (select name from public.classes where id = enrollment.class_id),
    (select name from public.school_locations where id = enrollment.school_location_id),
    refreshed_total,
    refreshed_total,
    actor_id,
    actor_id
  returning id into new_invoice_id;

  insert into public.invoice_lines (
    invoice_id,
    fee_component_id,
    description,
    amount,
    sort_order,
    created_by,
    updated_by
  ) values (
    new_invoice_id,
    base_component_id,
    'Base Class Fee',
    base_rate_amount,
    1,
    actor_id,
    actor_id
  );

  if transport_rate_amount > 0 then
    insert into public.invoice_lines (
      invoice_id,
      fee_component_id,
      description,
      amount,
      sort_order,
      created_by,
      updated_by
    ) values (
      new_invoice_id,
      transport_component_id,
      coalesce(transport_label, 'Location / Transport Charge'),
      transport_rate_amount,
      2,
      actor_id,
      actor_id
    );
  end if;

  return jsonb_build_object(
    'studentId', student.id,
    'status', 'created',
    'invoiceId', new_invoice_id,
    'invoiceNumber', new_invoice_number
  );
end;
$$;

revoke all on function private.generate_invoice_for_student(
  bigint, bigint, bigint, uuid
) from public, anon, authenticated;

comment on function private.generate_invoice_for_student(bigint, bigint, bigint, uuid) is
  'Creates a term invoice or refreshes its base and transport lines when it is unpaid with no payment history; payment-bearing and end-of-term invoices remain immutable.';
