-- Phase 3 finance core (P3-03): invoice generation and cancellation RPCs.
-- Bulk per-term generation (skips students who already have one) plus single-student generation,
-- per D-10. Snapshots identity/fee values so a later rename/rate change never rewrites this invoice.

insert into public.permissions(code, description)
values ('finance.transactions.manage', 'Generate invoices, record payments/receipts/expenses, and process reversals');
insert into public.role_permissions(role_code, permission_code)
values
  ('SUPER_ADMIN', 'finance.transactions.manage'),
  ('ADMINISTRATOR', 'finance.transactions.manage'),
  ('ACCOUNTANT', 'finance.transactions.manage');

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
  base_rate record;
  transport_rate record;
  new_invoice_id bigint;
  new_invoice_number text;
  transport_label text;
begin
  if exists (
    select 1 from public.invoices
    where student_id = target_student_id
      and academic_year_id = target_academic_year_id
      and academic_term_id = target_academic_term_id
      and status <> 'cancelled'
  ) then
    return jsonb_build_object(
      'studentId', target_student_id, 'status', 'skipped',
      'reason', 'An active invoice already exists for this student and term.'
    );
  end if;

  select se.class_id, se.school_location_id into enrollment
  from public.student_enrollments se
  where se.student_id = target_student_id
    and se.academic_year_id = target_academic_year_id
    and se.academic_term_id = target_academic_term_id
    and se.status = 'active';
  if enrollment.class_id is null then
    return jsonb_build_object(
      'studentId', target_student_id, 'status', 'skipped',
      'reason', 'No active enrollment for this academic year and term.'
    );
  end if;

  select s.id, s.admission_number,
    concat_ws(' ', s.first_name, s.middle_name, s.last_name) as full_name
    into student
  from public.students s
  where s.id = target_student_id and s.status = 'active';
  if student.id is null then
    return jsonb_build_object(
      'studentId', target_student_id, 'status', 'skipped',
      'reason', 'The student is not active.'
    );
  end if;

  select r.id, r.amount into base_rate
  from public.fee_component_rates r
  join public.fee_components fc on fc.id = r.fee_component_id
  where fc.code = 'base_class_fee' and r.class_id = enrollment.class_id
    and r.academic_year_id = target_academic_year_id
    and r.academic_term_id = target_academic_term_id
    and r.status = 'active';

  select r.id, r.amount into transport_rate
  from public.fee_component_rates r
  join public.fee_components fc on fc.id = r.fee_component_id
  where fc.code = 'location_transport_charge'
    and r.school_location_id = enrollment.school_location_id
    and r.academic_year_id = target_academic_year_id
    and r.academic_term_id = target_academic_term_id
    and r.status = 'active';

  if base_rate.amount is null or transport_rate.amount is null then
    return jsonb_build_object(
      'studentId', target_student_id, 'status', 'skipped',
      'reason', 'Base class fee or transport charge is not configured for this class/location and term.'
    );
  end if;

  select ss.location_charge_label into transport_label
  from public.school_settings ss where ss.id = 1;

  new_invoice_number := private.allocate_document_number('INV');

  insert into public.invoices (
    invoice_number, student_id, academic_year_id, academic_term_id, class_id, school_location_id,
    student_name_snapshot, admission_number_snapshot, class_name_snapshot, location_name_snapshot,
    subtotal, total, created_by, updated_by
  )
  select
    new_invoice_number, student.id, target_academic_year_id, target_academic_term_id,
    enrollment.class_id, enrollment.school_location_id,
    student.full_name, student.admission_number,
    (select name from public.classes where id = enrollment.class_id),
    (select name from public.school_locations where id = enrollment.school_location_id),
    base_rate.amount + transport_rate.amount, base_rate.amount + transport_rate.amount,
    actor_id, actor_id
  returning id into new_invoice_id;

  insert into public.invoice_lines (
    invoice_id, fee_component_id, description, amount, sort_order, created_by, updated_by
  )
  values
    (new_invoice_id, (select id from public.fee_components where code = 'base_class_fee'),
      'Base Class Fee', base_rate.amount, 1, actor_id, actor_id),
    (new_invoice_id, (select id from public.fee_components where code = 'location_transport_charge'),
      coalesce(transport_label, 'Location / Transport Charge'), transport_rate.amount, 2, actor_id, actor_id);

  return jsonb_build_object(
    'studentId', student.id, 'status', 'created',
    'invoiceId', new_invoice_id, 'invoiceNumber', new_invoice_number
  );
end;
$$;
revoke all on function private.generate_invoice_for_student(bigint, bigint, bigint, uuid)
  from public, anon, authenticated;

create or replace function public.generate_term_invoices(
  target_academic_year_id bigint,
  target_academic_term_id bigint,
  target_student_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  enrollment_row record;
  outcome jsonb;
  created_count integer := 0;
  skipped jsonb := '[]'::jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if not exists (
    select 1 from public.academic_terms t
    join public.academic_years y on y.id = t.academic_year_id
    where t.id = target_academic_term_id and y.id = target_academic_year_id
      and t.status = 'active' and y.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'Choose an active academic year and term.';
  end if;

  if target_student_id is not null then
    begin
      outcome := private.generate_invoice_for_student(
        target_student_id, target_academic_year_id, target_academic_term_id, actor_id
      );
    exception when others then
      outcome := jsonb_build_object('studentId', target_student_id, 'status', 'skipped', 'reason', sqlerrm);
    end;
    if outcome->>'status' = 'created' then
      created_count := 1;
    else
      skipped := jsonb_build_array(outcome);
    end if;
  else
    for enrollment_row in
      select distinct se.student_id
      from public.student_enrollments se
      where se.academic_year_id = target_academic_year_id
        and se.academic_term_id = target_academic_term_id
        and se.status = 'active'
      order by se.student_id
    loop
      begin
        outcome := private.generate_invoice_for_student(
          enrollment_row.student_id, target_academic_year_id, target_academic_term_id, actor_id
        );
      exception when others then
        outcome := jsonb_build_object(
          'studentId', enrollment_row.student_id, 'status', 'skipped', 'reason', sqlerrm
        );
      end;
      if outcome->>'status' = 'created' then
        created_count := created_count + 1;
      else
        skipped := skipped || jsonb_build_array(outcome);
      end if;
    end loop;
  end if;

  return jsonb_build_object('createdCount', created_count, 'skipped', skipped);
end;
$$;
revoke all on function public.generate_term_invoices(bigint, bigint, bigint) from public, anon, authenticated;
grant execute on function public.generate_term_invoices(bigint, bigint, bigint) to authenticated;

create or replace function public.cancel_invoice(target_invoice_id bigint, target_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  updated_id bigint;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if nullif(btrim(target_reason), '') is null then
    raise exception using errcode = '22023', message = 'A cancellation reason is required.';
  end if;
  update public.invoices
  set status = 'cancelled', cancelled_at = now(), cancelled_by = actor_id,
    cancellation_reason = btrim(target_reason), updated_by = actor_id
  where id = target_invoice_id and status <> 'cancelled' and amount_paid = 0
  returning id into updated_id;
  if updated_id is null then
    raise exception using errcode = '22023',
      message = 'The invoice is already cancelled, has payments recorded, or is unavailable.';
  end if;
  return jsonb_build_object('invoiceId', updated_id);
end;
$$;
revoke all on function public.cancel_invoice(bigint, text) from public, anon, authenticated;
grant execute on function public.cancel_invoice(bigint, text) to authenticated;
