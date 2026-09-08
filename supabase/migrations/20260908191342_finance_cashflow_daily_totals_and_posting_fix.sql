-- P3-04/P3-05: preserve posted history while supporting daily aggregate collections.
-- Forward recovery: revert application entry modes if needed; retain the nullable
-- student links, receipts and audit trail. Never delete posted records to roll back.
CREATE OR REPLACE FUNCTION private.persist_finance_request(request_key uuid, target_operation text, actor_id uuid, target_fingerprint text, target_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  inserted_request record;
  existing_request record;
begin
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(target_fingerprint), '') is null then
    raise exception using errcode = '22023', message = 'The request fingerprint is required.';
  end if;

  insert into private.finance_requests (
    request_key, actor_id, operation, fingerprint, result
  ) values (
    request_key, actor_id, target_operation, target_fingerprint, target_result
  )
  on conflict on constraint finance_requests_pkey do nothing
  returning * into inserted_request;

  if inserted_request is not null then
    return target_result;
  end if;

  select * into existing_request
  from private.finance_requests fr
  where fr.request_key = persist_finance_request.request_key
  for update;

  if existing_request.actor_id is distinct from actor_id then
    raise exception using errcode = '42501', message = 'This request belongs to another operator.';
  end if;
  if existing_request.operation <> target_operation then
    raise exception using errcode = '23505', message = 'This request key is already in use for a different operation.';
  end if;
  if existing_request.fingerprint <> target_fingerprint then
    raise exception using errcode = '23505', message = 'This request key was already used with different data.';
  end if;

  if existing_request.result->>'status' = 'pending' then
    update private.finance_requests fr
    set result = target_result
    where fr.request_key = persist_finance_request.request_key;
    return target_result;
  end if;

  return existing_request.result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_school_fee_payment(request_key uuid, request_fingerprint text, target_invoice_id bigint, payment_amount numeric, target_payment_method_id bigint, target_business_date date, target_external_reference text DEFAULT NULL::text, target_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor_id uuid := (select auth.uid());
  invoice_record record;
  payment_method_name text;
  payment_number text;
  receipt_number text;
  payment_id bigint;
  receipt_id bigint;
  previous_balance numeric(14,2);
  new_amount_paid numeric(14,2);
  request_result jsonb;
  receipt_result jsonb;
begin
  -- Derive replay identity from all actual arguments, never a caller-supplied label.
  request_fingerprint := jsonb_build_array(target_invoice_id, payment_amount, target_payment_method_id, target_business_date, target_external_reference, target_notes)::text;
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if payment_amount is null or payment_amount <= 0 or payment_amount >= 1000000000000 or payment_amount <> round(payment_amount, 2) then
    raise exception using errcode = '22023', message = 'The payment amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
  end if;

  request_result := private.persist_finance_request(
    request_key,
    'school_fee_payment',
    actor_id,
    request_fingerprint,
    jsonb_build_object(
      'status', 'pending',
      'invoiceId', target_invoice_id,
      'amount', payment_amount,
      'businessDate', target_business_date::text
    )
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
  end if;

  select i.*, s.admission_number, s.first_name, s.middle_name, s.last_name into invoice_record
  from public.invoices i
  join public.students s on s.id = i.student_id
  where i.id = target_invoice_id
  for update of i;

  if invoice_record.id is null then
    raise exception using errcode = '23503', message = 'The invoice could not be found.';
  end if;
  if invoice_record.status = 'cancelled' then
    raise exception using errcode = '22023', message = 'Cancelled invoices cannot accept payments.';
  end if;
  if payment_amount > invoice_record.outstanding then
    raise exception using errcode = '22023', message = 'The payment exceeds the outstanding balance.';
  end if;



  select name into payment_method_name
  from public.payment_methods
  where id = target_payment_method_id and status = 'active';
  if payment_method_name is null then
    raise exception using errcode = '23503', message = 'The payment method is unavailable.';
  end if;
  if (select requires_reference from public.payment_methods where id = target_payment_method_id)
    and nullif(btrim(coalesce(target_external_reference, '')), '') is null then
    raise exception using errcode = '23514', message = 'This payment method requires an external reference.';
  end if;

  previous_balance := invoice_record.outstanding;
  new_amount_paid := invoice_record.amount_paid + payment_amount;

  payment_number := private.allocate_document_number('PAY');
  insert into public.payments (
    payment_number, invoice_id, amount, payment_method_id, external_reference, notes,
    business_date, created_by, updated_by
  ) values (
    payment_number, target_invoice_id, payment_amount, target_payment_method_id,
    nullif(btrim(coalesce(target_external_reference, '')), ''),
    nullif(btrim(coalesce(target_notes, '')), ''),
    target_business_date, actor_id, actor_id
  ) returning id into payment_id;

  receipt_number := private.allocate_document_number('RCT');
  insert into public.receipts (
    receipt_number, payment_id, student_name_snapshot, admission_number_snapshot,
    class_name_snapshot, academic_year_name_snapshot, academic_term_name_snapshot,
    invoice_number_snapshot, payment_method_name_snapshot, collected_by_snapshot,
    amount, previous_balance, remaining_balance, business_date, created_by, updated_by
  )
  select
    receipt_number,
    payment_id,
    invoice_record.student_name_snapshot,
    invoice_record.admission_number_snapshot,
    invoice_record.class_name_snapshot,
    (select name from public.academic_years where id = invoice_record.academic_year_id),
    (select name from public.academic_terms where id = invoice_record.academic_term_id),
    invoice_record.invoice_number,
    payment_method_name,
    (select coalesce(display_name, 'School Office')
     from public.profiles where id = actor_id),
    payment_amount,
    previous_balance,
    previous_balance - payment_amount,
    target_business_date,
    actor_id,
    actor_id
  returning id into receipt_id;

  update public.invoices
  set amount_paid = new_amount_paid,
      status = case
        when new_amount_paid >= total then 'paid'
        when new_amount_paid > 0 then 'partially_paid'
        else 'unpaid'
      end,
      updated_by = actor_id
  where id = target_invoice_id;

  receipt_result := jsonb_build_object(
    'paymentId', payment_id,
    'paymentNumber', payment_number,
    'receiptId', receipt_id,
    'receiptNumber', receipt_number,
    'invoiceId', target_invoice_id,
    'invoiceNumber', invoice_record.invoice_number,
    'amount', payment_amount,
    'previousOutstanding', previous_balance,
    'remainingOutstanding', previous_balance - payment_amount,
    'businessDate', target_business_date::text
  );

  return private.persist_finance_request(
    request_key,
    'school_fee_payment',
    actor_id,
    request_fingerprint,
    receipt_result
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_feeding_receipt(request_key uuid, request_fingerprint text, target_student_id bigint, receipt_amount numeric, target_business_date date, target_payment_method_id bigint, target_external_reference text DEFAULT NULL::text, target_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor_id uuid := (select auth.uid());
  student_record record;
  payment_method_name text;
  receipt_number text;
  receipt_id bigint;
  request_result jsonb;
  result jsonb;
begin
  -- Derive replay identity from all actual arguments, never a caller-supplied label.
  request_fingerprint := jsonb_build_array(target_student_id, receipt_amount, target_business_date, target_payment_method_id, target_external_reference, target_notes)::text;
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if receipt_amount is null or receipt_amount <= 0 or receipt_amount >= 1000000000000 or receipt_amount <> round(receipt_amount, 2) then
    raise exception using errcode = '22023', message = 'The receipt amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
  end if;

  request_result := private.persist_finance_request(
    request_key,
    'feeding_receipt',
    actor_id,
    request_fingerprint,
    jsonb_build_object(
      'status', 'pending',
      'studentId', target_student_id,
      'amount', receipt_amount,
      'businessDate', target_business_date::text
    )
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
  end if;

  select s.id, s.admission_number,
    concat_ws(' ', s.first_name, s.middle_name, s.last_name) as full_name,
    e.class_id, c.name as class_name
    into student_record
  from public.students s
  left join public.student_enrollments e
    on e.student_id = s.id
   and e.status = 'active'
   and e.academic_year_id = (select id from public.academic_years where is_current and status = 'active' limit 1)
   and e.academic_term_id = (select id from public.academic_terms where is_current and status = 'active' limit 1)
  left join public.classes c on c.id = e.class_id
  where s.id = target_student_id and s.status = 'active';

  if student_record.id is null then
    raise exception using errcode = '23503', message = 'The student is unavailable.';
  end if;

  select name into payment_method_name
  from public.payment_methods
  where id = target_payment_method_id and status = 'active';
  if payment_method_name is null then
    raise exception using errcode = '23503', message = 'The payment method is unavailable.';
  end if;
  if (select requires_reference from public.payment_methods where id = target_payment_method_id)
    and nullif(btrim(coalesce(target_external_reference, '')), '') is null then
    raise exception using errcode = '23514', message = 'This payment method requires an external reference.';
  end if;

  if exists (
    select 1 from public.feeding_receipts
    where student_id = target_student_id and business_date = target_business_date and status = 'active'
  ) then
    raise exception using errcode = '23505',
      message = 'A feeding receipt already exists for this student on the selected business date.';
  end if;



  receipt_number := private.allocate_document_number('RCT');
  insert into public.feeding_receipts (
    receipt_number, student_id, amount, business_date, payment_method_id,
    external_reference, notes, student_name_snapshot, admission_number_snapshot,
    class_name_snapshot, created_by, updated_by
  ) values (
    receipt_number,
    target_student_id,
    receipt_amount,
    target_business_date,
    target_payment_method_id,
    nullif(btrim(coalesce(target_external_reference, '')), ''),
    nullif(btrim(coalesce(target_notes, '')), ''),
    student_record.full_name,
    student_record.admission_number,
    coalesce(student_record.class_name, 'Unassigned'),
    actor_id,
    actor_id
  ) returning id into receipt_id;

  result := jsonb_build_object(
    'receiptId', receipt_id,
    'receiptNumber', receipt_number,
    'studentId', target_student_id,
    'amount', receipt_amount,
    'businessDate', target_business_date::text,
    'status', 'posted'
  );

  return private.persist_finance_request(
    request_key,
    'feeding_receipt',
    actor_id,
    request_fingerprint,
    result
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_admission_receipt(request_key uuid, request_fingerprint text, target_student_id bigint, receipt_amount numeric, target_business_date date, target_payment_method_id bigint, target_external_reference text DEFAULT NULL::text, target_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor_id uuid := (select auth.uid());
  student_record record;
  payment_method_name text;
  receipt_number text;
  receipt_id bigint;
  request_result jsonb;
  result jsonb;
begin
  -- Derive replay identity from all actual arguments, never a caller-supplied label.
  request_fingerprint := jsonb_build_array(target_student_id, receipt_amount, target_business_date, target_payment_method_id, target_external_reference, target_notes)::text;
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if receipt_amount is null or receipt_amount <= 0 or receipt_amount >= 1000000000000 or receipt_amount <> round(receipt_amount, 2) then
    raise exception using errcode = '22023', message = 'The receipt amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
  end if;

  request_result := private.persist_finance_request(
    request_key,
    'admission_receipt',
    actor_id,
    request_fingerprint,
    jsonb_build_object(
      'status', 'pending',
      'studentId', target_student_id,
      'amount', receipt_amount,
      'businessDate', target_business_date::text
    )
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
  end if;

  select s.id, s.admission_number,
    concat_ws(' ', s.first_name, s.middle_name, s.last_name) as full_name,
    e.class_id, c.name as class_name
    into student_record
  from public.students s
  left join public.student_enrollments e
    on e.student_id = s.id
   and e.status = 'active'
   and e.academic_year_id = (select id from public.academic_years where is_current and status = 'active' limit 1)
   and e.academic_term_id = (select id from public.academic_terms where is_current and status = 'active' limit 1)
  left join public.classes c on c.id = e.class_id
  where s.id = target_student_id and s.status = 'active';

  if student_record.id is null then
    raise exception using errcode = '23503', message = 'The student is unavailable.';
  end if;
  if exists (
    select 1 from public.admission_receipts
    where student_id = target_student_id and status = 'active'
  ) then
    raise exception using errcode = '23505',
      message = 'An admission receipt already exists for this student.';
  end if;



  select name into payment_method_name
  from public.payment_methods
  where id = target_payment_method_id and status = 'active';
  if payment_method_name is null then
    raise exception using errcode = '23503', message = 'The payment method is unavailable.';
  end if;
  if (select requires_reference from public.payment_methods where id = target_payment_method_id)
    and nullif(btrim(coalesce(target_external_reference, '')), '') is null then
    raise exception using errcode = '23514', message = 'This payment method requires an external reference.';
  end if;

  receipt_number := private.allocate_document_number('RCT');
  insert into public.admission_receipts (
    receipt_number, student_id, amount, business_date, payment_method_id,
    external_reference, notes, student_name_snapshot, admission_number_snapshot,
    class_name_snapshot, created_by, updated_by
  ) values (
    receipt_number,
    target_student_id,
    receipt_amount,
    target_business_date,
    target_payment_method_id,
    nullif(btrim(coalesce(target_external_reference, '')), ''),
    nullif(btrim(coalesce(target_notes, '')), ''),
    student_record.full_name,
    student_record.admission_number,
    coalesce(student_record.class_name, 'Unassigned'),
    actor_id,
    actor_id
  ) returning id into receipt_id;

  result := jsonb_build_object(
    'receiptId', receipt_id,
    'receiptNumber', receipt_number,
    'studentId', target_student_id,
    'amount', receipt_amount,
    'businessDate', target_business_date::text,
    'status', 'posted'
  );

  return private.persist_finance_request(
    request_key,
    'admission_receipt',
    actor_id,
    request_fingerprint,
    result
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_misc_receipt(request_key uuid, request_fingerprint text, target_misc_income_category_id bigint, target_description text, receipt_amount numeric, target_business_date date, target_payment_method_id bigint, target_student_id bigint DEFAULT NULL::bigint, target_payer_name text DEFAULT NULL::text, target_external_reference text DEFAULT NULL::text, target_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor_id uuid := (select auth.uid());
  category_record record;
  student_record record;
  payment_method_name text;
  receipt_number text;
  receipt_id bigint;
  request_result jsonb;
  result jsonb;
begin
  -- Derive replay identity from all actual arguments, never a caller-supplied label.
  request_fingerprint := jsonb_build_array(target_misc_income_category_id, target_description, receipt_amount, target_business_date, target_payment_method_id, target_student_id, target_payer_name, target_external_reference, target_notes)::text;
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_description, '')), '') is null then
    raise exception using errcode = '22023', message = 'A description is required.';
  end if;
  if receipt_amount is null or receipt_amount <= 0 or receipt_amount >= 1000000000000 or receipt_amount <> round(receipt_amount, 2) then
    raise exception using errcode = '22023', message = 'The receipt amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
  end if;

  request_result := private.persist_finance_request(
    request_key,
    'misc_receipt',
    actor_id,
    request_fingerprint,
    jsonb_build_object(
      'status', 'pending',
      'categoryId', target_misc_income_category_id,
      'amount', receipt_amount,
      'businessDate', target_business_date::text
    )
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
  end if;

  select id, name into category_record
  from public.misc_income_categories
  where id = target_misc_income_category_id and status = 'active';
  if target_misc_income_category_id is not null and category_record.id is null then
    raise exception using errcode = '23503', message = 'The miscellaneous income category is unavailable.';
  end if;

  if target_student_id is not null then
    select s.id, concat_ws(' ', s.first_name, s.middle_name, s.last_name) as full_name
      into student_record
    from public.students s
    where s.id = target_student_id and s.status = 'active';
    if student_record.id is null then
      raise exception using errcode = '23503', message = 'The selected student is unavailable.';
    end if;
  end if;

  select name into payment_method_name
  from public.payment_methods
  where id = target_payment_method_id and status = 'active';
  if payment_method_name is null then
    raise exception using errcode = '23503', message = 'The payment method is unavailable.';
  end if;
  if (select requires_reference from public.payment_methods where id = target_payment_method_id)
    and nullif(btrim(coalesce(target_external_reference, '')), '') is null then
    raise exception using errcode = '23514', message = 'This payment method requires an external reference.';
  end if;



  receipt_number := private.allocate_document_number('RCT');
  insert into public.misc_receipts (
    receipt_number, misc_income_category_id, student_id, payer_name, description,
    amount, business_date, payment_method_id, external_reference, notes,
    created_by, updated_by
  ) values (
    receipt_number,
    target_misc_income_category_id,
    target_student_id,
    nullif(btrim(coalesce(target_payer_name, '')), ''),
    btrim(target_description),
    receipt_amount,
    target_business_date,
    target_payment_method_id,
    nullif(btrim(coalesce(target_external_reference, '')), ''),
    nullif(btrim(coalesce(target_notes, '')), ''),
    actor_id,
    actor_id
  ) returning id into receipt_id;

  result := jsonb_build_object(
    'receiptId', receipt_id,
    'receiptNumber', receipt_number,
    'categoryId', target_misc_income_category_id,
    'studentId', target_student_id,
    'amount', receipt_amount,
    'businessDate', target_business_date::text,
    'status', 'posted'
  );

  return private.persist_finance_request(
    request_key,
    'misc_receipt',
    actor_id,
    request_fingerprint,
    result
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_expense(request_key uuid, request_fingerprint text, target_expense_category_id bigint, expense_amount numeric, target_business_date date, target_description text, target_payment_method_id bigint, target_external_reference text DEFAULT NULL::text, target_attachment_path text DEFAULT NULL::text, target_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor_id uuid := (select auth.uid());
  category_record record;
  payment_method_name text;
  expense_number text;
  expense_id bigint;
  request_result jsonb;
  result jsonb;
begin
  -- Derive replay identity from all actual arguments, never a caller-supplied label.
  request_fingerprint := jsonb_build_array(target_expense_category_id, expense_amount, target_business_date, target_description, target_payment_method_id, target_external_reference, target_attachment_path, target_notes)::text;
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_description, '')), '') is null then
    raise exception using errcode = '22023', message = 'A description is required.';
  end if;
  if expense_amount is null or expense_amount <= 0 or expense_amount >= 1000000000000 or expense_amount <> round(expense_amount, 2) then
    raise exception using errcode = '22023', message = 'The expense amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
  end if;

  request_result := private.persist_finance_request(
    request_key,
    'expense',
    actor_id,
    request_fingerprint,
    jsonb_build_object(
      'status', 'pending',
      'categoryId', target_expense_category_id,
      'amount', expense_amount,
      'businessDate', target_business_date::text
    )
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
  end if;

  select id, name into category_record
  from public.expense_categories
  where id = target_expense_category_id and status = 'active';
  if category_record.id is null then
    raise exception using errcode = '23503', message = 'The expense category is unavailable.';
  end if;

  select name into payment_method_name
  from public.payment_methods
  where id = target_payment_method_id and status = 'active';
  if payment_method_name is null then
    raise exception using errcode = '23503', message = 'The payment method is unavailable.';
  end if;
  if (select requires_reference from public.payment_methods where id = target_payment_method_id)
    and nullif(btrim(coalesce(target_external_reference, '')), '') is null then
    raise exception using errcode = '23514', message = 'This payment method requires an external reference.';
  end if;



  expense_number := private.allocate_document_number('EXP');
  insert into public.expenses (
    expense_number, expense_category_id, amount, business_date, description,
    payment_method_id, external_reference, attachment_path, created_by, updated_by
  ) values (
    expense_number,
    target_expense_category_id,
    expense_amount,
    target_business_date,
    btrim(target_description),
    target_payment_method_id,
    nullif(btrim(coalesce(target_external_reference, '')), ''),
    nullif(btrim(coalesce(target_attachment_path, '')), ''),
    actor_id,
    actor_id
  ) returning id into expense_id;

  result := jsonb_build_object(
    'expenseId', expense_id,
    'expenseNumber', expense_number,
    'categoryId', target_expense_category_id,
    'amount', expense_amount,
    'businessDate', target_business_date::text,
    'status', 'posted'
  );

  return private.persist_finance_request(
    request_key,
    'expense',
    actor_id,
    request_fingerprint,
    result
  );
end;
$function$;


-- Existing per-student receipts retain their references and duplicate constraints.
alter table public.feeding_receipts
  alter column student_id drop not null,
  alter column student_name_snapshot drop not null,
  alter column admission_number_snapshot drop not null,
  alter column class_name_snapshot drop not null,
  add column collection_scope text not null default 'student',
  add column payment_method_name_snapshot text,
  add constraint feeding_collection_scope_check check (
    (collection_scope = 'student' and student_id is not null
      and student_name_snapshot is not null and admission_number_snapshot is not null and class_name_snapshot is not null)
    or (collection_scope = 'daily_total' and student_id is null
      and student_name_snapshot is null and admission_number_snapshot is null and class_name_snapshot is null
      and payment_method_name_snapshot is not null));
alter table public.admission_receipts
  alter column student_id drop not null,
  alter column student_name_snapshot drop not null,
  alter column admission_number_snapshot drop not null,
  alter column class_name_snapshot drop not null,
  add column collection_scope text not null default 'student',
  add column payment_method_name_snapshot text,
  add constraint admission_collection_scope_check check (
    (collection_scope = 'student' and student_id is not null
      and student_name_snapshot is not null and admission_number_snapshot is not null and class_name_snapshot is not null)
    or (collection_scope = 'daily_total' and student_id is null
      and student_name_snapshot is null and admission_number_snapshot is null and class_name_snapshot is null
      and payment_method_name_snapshot is not null));
-- A daily total is entered once per payment method; corrections use reversal.
create unique index feeding_daily_total_unique on public.feeding_receipts(business_date, payment_method_id)
  where collection_scope = 'daily_total' and status = 'active';
create unique index admission_daily_total_unique on public.admission_receipts(business_date, payment_method_id)
  where collection_scope = 'daily_total' and status = 'active';
-- Staff name the income on the receipt instead of creating a settings category.
alter table public.misc_receipts alter column misc_income_category_id drop not null;

create or replace function public.record_daily_collection(
  request_key uuid, collection_type text, receipt_amount numeric,
  target_business_date date, target_payment_method_id bigint,
  target_external_reference text default null, target_notes text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  fingerprint text;
  request_result jsonb;
  result jsonb;
  method_name text;
  document_number text;
  receipt_id bigint;
  target_table text;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if collection_type is null or collection_type not in ('feeding_receipt','admission_receipt') then
    raise exception using errcode = '22023', message = 'Choose feeding or admission collections.';
  end if;
  if receipt_amount is null or receipt_amount <= 0 or receipt_amount >= 1000000000000
    or receipt_amount <> round(receipt_amount, 2) or target_business_date is null then
    raise exception using errcode = '22023', message = 'Enter a positive amount with at most two decimal places and a business date.';
  end if;
  fingerprint := jsonb_build_array('daily_total',collection_type,receipt_amount,target_business_date,
    target_payment_method_id,target_external_reference,target_notes)::text;
  request_result := private.persist_finance_request(request_key,collection_type,actor_id,fingerprint,
    jsonb_build_object('status','pending'));
  if request_result->>'status' is distinct from 'pending' then return request_result; end if;
  select name into method_name from public.payment_methods
    where id=target_payment_method_id and status='active';
  if method_name is null then
    raise exception using errcode = '23503', message = 'The payment method is unavailable.';
  end if;
  target_table := case collection_type when 'feeding_receipt' then 'feeding_receipts' else 'admission_receipts' end;
  -- Identifiers come exclusively from the allowlist above; all values are bound.
  document_number := private.allocate_document_number('RCT');
  execute format('insert into public.%I
    (receipt_number,amount,business_date,payment_method_id,external_reference,notes,
     collection_scope,payment_method_name_snapshot,created_by,updated_by)
    values ($1,$2,$3,$4,$5,$6,''daily_total'',$7,$8,$8) returning id', target_table)
    into receipt_id
    using document_number,receipt_amount,target_business_date,target_payment_method_id,
      nullif(btrim(target_external_reference),''),nullif(btrim(target_notes),''),method_name,actor_id;
  result := jsonb_build_object('status','posted','receiptId',receipt_id,'receiptNumber',document_number,
    'amount',receipt_amount,'businessDate',target_business_date,'collectionScope','daily_total');
  return private.persist_finance_request(request_key,collection_type,actor_id,fingerprint,result);
end;
$function$;
revoke all on function public.record_daily_collection(uuid,text,numeric,date,bigint,text,text) from public,anon,authenticated;
grant execute on function public.record_daily_collection(uuid,text,numeric,date,bigint,text,text) to authenticated;
