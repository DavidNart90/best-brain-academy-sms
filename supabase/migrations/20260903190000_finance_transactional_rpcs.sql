-- Phase 3 finance core (P3-04): transactional payment, receipt, and expense RPCs.
-- These are the authoritative write paths for posted financial records. They use the
-- request-key idempotency table to make retries safe and reject changed payloads.

create or replace function private.persist_finance_request(
  request_key uuid,
  target_operation text,
  actor_id uuid,
  target_fingerprint text,
  target_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
  on conflict (request_key) do nothing
  returning * into inserted_request;

  if inserted_request is not null then
    return target_result;
  end if;

  select * into existing_request
  from private.finance_requests
  where request_key = request_key
  for update;

  if existing_request.operation <> target_operation then
    raise exception using errcode = '23505',
      message = 'This request key is already in use for a different operation.';
  end if;
  if existing_request.fingerprint <> target_fingerprint then
    raise exception using errcode = '23505',
      message = 'This request key was already used with different data.';
  end if;

  return existing_request.result;
end;
$$;
revoke all on function private.persist_finance_request(uuid, text, uuid, text, jsonb)
  from public, anon, authenticated;

create or replace function public.record_school_fee_payment(
  request_key uuid,
  request_fingerprint text,
  target_invoice_id bigint,
  payment_amount numeric(14,2),
  target_payment_method_id bigint,
  target_business_date date,
  target_external_reference text default null,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if payment_amount is null or payment_amount <= 0 then
    raise exception using errcode = '22023', message = 'The payment amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
  end if;

  select i.*, s.admission_number, s.first_name, s.middle_name, s.last_name into invoice_record
  from public.invoices i
  join public.students s on s.id = i.student_id
  where i.id = target_invoice_id
  for update;

  if invoice_record.id is null then
    raise exception using errcode = '23503', message = 'The invoice could not be found.';
  end if;
  if invoice_record.status = 'cancelled' then
    raise exception using errcode = '22023', message = 'Cancelled invoices cannot accept payments.';
  end if;
  if payment_amount > invoice_record.outstanding then
    raise exception using errcode = '22023', message = 'The payment exceeds the outstanding balance.';
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
  if request_result->>'status' = 'pending' and request_result->>'invoiceId' = target_invoice_id::text then
    null;
  elsif request_result->>'status' = 'pending' then
    null;
  else
    return request_result;
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
    concat_ws(' ', invoice_record.first_name, invoice_record.middle_name, invoice_record.last_name),
    invoice_record.admission_number,
    (select name from public.classes where id = invoice_record.class_id),
    (select name from public.academic_years where id = invoice_record.academic_year_id),
    (select name from public.academic_terms where id = invoice_record.academic_term_id),
    invoice_record.invoice_number,
    payment_method_name,
    (select coalesce(concat(first_name, ' ', last_name), 'School Office')
     from public.profiles where id = actor_id),
    payment_amount,
    previous_balance,
    previous_balance - payment_amount,
    target_business_date,
    actor_id,
    actor_id;

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
    'receiptId', (select id from public.receipts where payment_id = payment_id),
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
$$;
revoke all on function public.record_school_fee_payment(uuid, text, bigint, numeric, bigint, date, text, text)
  from public, anon, authenticated;
grant execute on function public.record_school_fee_payment(uuid, text, bigint, numeric, bigint, date, text, text)
  to authenticated;

create or replace function public.record_feeding_receipt(
  request_key uuid,
  request_fingerprint text,
  target_student_id bigint,
  receipt_amount numeric(14,2),
  target_business_date date,
  target_payment_method_id bigint,
  target_external_reference text default null,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  student_record record;
  payment_method_name text;
  receipt_number text;
  receipt_id bigint;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if receipt_amount is null or receipt_amount <= 0 then
    raise exception using errcode = '22023', message = 'The receipt amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
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
  if request_result->>'status' = 'pending' and request_result->>'studentId' = target_student_id::text then
    null;
  else
    return request_result;
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
$$;
revoke all on function public.record_feeding_receipt(uuid, text, bigint, numeric, date, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.record_feeding_receipt(uuid, text, bigint, numeric, date, bigint, text, text)
  to authenticated;

create or replace function public.record_admission_receipt(
  request_key uuid,
  request_fingerprint text,
  target_student_id bigint,
  receipt_amount numeric(14,2),
  target_business_date date,
  target_payment_method_id bigint,
  target_external_reference text default null,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  student_record record;
  payment_method_name text;
  receipt_number text;
  receipt_id bigint;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if receipt_amount is null or receipt_amount <= 0 then
    raise exception using errcode = '22023', message = 'The receipt amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
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
  if request_result->>'status' = 'pending' and request_result->>'studentId' = target_student_id::text then
    null;
  else
    return request_result;
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
$$;
revoke all on function public.record_admission_receipt(uuid, text, bigint, numeric, date, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.record_admission_receipt(uuid, text, bigint, numeric, date, bigint, text, text)
  to authenticated;

create or replace function public.record_misc_receipt(
  request_key uuid,
  request_fingerprint text,
  target_misc_income_category_id bigint,
  target_description text,
  receipt_amount numeric(14,2),
  target_business_date date,
  target_payment_method_id bigint,
  target_student_id bigint default null,
  target_payer_name text default null,
  target_external_reference text default null,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_description, '')), '') is null then
    raise exception using errcode = '22023', message = 'A description is required.';
  end if;
  if receipt_amount is null or receipt_amount <= 0 then
    raise exception using errcode = '22023', message = 'The receipt amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
  end if;

  select id, name into category_record
  from public.misc_income_categories
  where id = target_misc_income_category_id and status = 'active';
  if category_record.id is null then
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
  if request_result->>'status' = 'pending' and request_result->>'categoryId' = target_misc_income_category_id::text then
    null;
  else
    return request_result;
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
$$;
revoke all on function public.record_misc_receipt(uuid, text, bigint, text, numeric, date, bigint, bigint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_misc_receipt(uuid, text, bigint, text, numeric, date, bigint, bigint, text, text, text)
  to authenticated;

create or replace function public.record_expense(
  request_key uuid,
  request_fingerprint text,
  target_expense_category_id bigint,
  expense_amount numeric(14,2),
  target_business_date date,
  target_description text,
  target_payment_method_id bigint,
  target_external_reference text default null,
  target_attachment_path text default null,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  category_record record;
  payment_method_name text;
  expense_number text;
  expense_id bigint;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_description, '')), '') is null then
    raise exception using errcode = '22023', message = 'A description is required.';
  end if;
  if expense_amount is null or expense_amount <= 0 then
    raise exception using errcode = '22023', message = 'The expense amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
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
  if request_result->>'status' = 'pending' and request_result->>'categoryId' = target_expense_category_id::text then
    null;
  else
    return request_result;
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
$$;
revoke all on function public.record_expense(uuid, text, bigint, numeric, date, text, bigint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_expense(uuid, text, bigint, numeric, date, text, bigint, text, text, text)
  to authenticated;

create or replace function public.reverse_school_fee_payment(
  request_key uuid,
  request_fingerprint text,
  target_payment_id bigint,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  payment_record record;
  receipt_record record;
  request_result jsonb;
  result jsonb;
  remaining_amount_paid numeric(14,2);
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_reason, '')), '') is null then
    raise exception using errcode = '22023', message = 'A reversal reason is required.';
  end if;

  select * into payment_record
  from public.payments
  where id = target_payment_id
  for update;
  if payment_record.id is null then
    raise exception using errcode = '23503', message = 'The payment could not be found.';
  end if;
  if payment_record.status = 'reversed' then
    raise exception using errcode = '23505', message = 'This payment has already been reversed.';
  end if;

  select * into receipt_record
  from public.receipts
  where payment_id = target_payment_id
  for update;
  if receipt_record.id is null then
    raise exception using errcode = '23503', message = 'The payment receipt could not be found.';
  end if;

  request_result := private.persist_finance_request(
    request_key,
    'school_fee_payment_reversal',
    actor_id,
    request_fingerprint,
    jsonb_build_object('status', 'pending', 'paymentId', target_payment_id)
  );
  if request_result->>'status' <> 'pending' then
    return request_result;
  end if;

  update public.payments
  set status = 'reversed', reversed_at = now(), reversed_by = actor_id,
      reversal_reason = btrim(target_reason), updated_by = actor_id
  where id = target_payment_id;

  update public.receipts
  set status = 'reversed', reversed_at = now(), reversed_by = actor_id,
      reversal_reason = btrim(target_reason), updated_by = actor_id
  where id = receipt_record.id;

  select coalesce(sum(amount), 0)::numeric(14,2) into remaining_amount_paid
  from public.payments
  where invoice_id = payment_record.invoice_id and status = 'active';

  update public.invoices
  set amount_paid = remaining_amount_paid,
      status = case
        when remaining_amount_paid >= total then 'paid'
        when remaining_amount_paid > 0 then 'partially_paid'
        else 'unpaid'
      end,
      updated_by = actor_id
  where id = payment_record.invoice_id;

  result := jsonb_build_object(
    'status', 'reversed',
    'paymentId', target_payment_id,
    'receiptId', receipt_record.id,
    'invoiceId', payment_record.invoice_id,
    'amount', payment_record.amount,
    'reason', btrim(target_reason)
  );
  return private.persist_finance_request(
    request_key, 'school_fee_payment_reversal', actor_id, request_fingerprint, result
  );
end;
$$;
revoke all on function public.reverse_school_fee_payment(uuid, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.reverse_school_fee_payment(uuid, text, bigint, text)
  to authenticated;

create or replace function public.reverse_feeding_receipt(
  request_key uuid,
  request_fingerprint text,
  target_receipt_id bigint,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  receipt_record record;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_reason, '')), '') is null then
    raise exception using errcode = '22023', message = 'A reversal reason is required.';
  end if;

  select * into receipt_record from public.feeding_receipts where id = target_receipt_id for update;
  if receipt_record.id is null then
    raise exception using errcode = '23503', message = 'The feeding receipt could not be found.';
  end if;
  if receipt_record.status = 'reversed' then
    raise exception using errcode = '23505', message = 'This feeding receipt has already been reversed.';
  end if;

  request_result := private.persist_finance_request(
    request_key, 'feeding_receipt_reversal', actor_id, request_fingerprint,
    jsonb_build_object('status', 'pending', 'receiptId', target_receipt_id)
  );
  if request_result->>'status' <> 'pending' then return request_result; end if;

  update public.feeding_receipts
  set status = 'reversed', reversed_at = now(), reversed_by = actor_id,
      reversal_reason = btrim(target_reason), updated_by = actor_id
  where id = target_receipt_id;
  result := jsonb_build_object('status', 'reversed', 'receiptId', target_receipt_id,
    'receiptNumber', receipt_record.receipt_number, 'amount', receipt_record.amount,
    'reason', btrim(target_reason));
  return private.persist_finance_request(
    request_key, 'feeding_receipt_reversal', actor_id, request_fingerprint, result
  );
end;
$$;
revoke all on function public.reverse_feeding_receipt(uuid, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.reverse_feeding_receipt(uuid, text, bigint, text) to authenticated;

create or replace function public.reverse_admission_receipt(
  request_key uuid,
  request_fingerprint text,
  target_receipt_id bigint,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  receipt_record record;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_reason, '')), '') is null then
    raise exception using errcode = '22023', message = 'A reversal reason is required.';
  end if;
  select * into receipt_record from public.admission_receipts where id = target_receipt_id for update;
  if receipt_record.id is null then
    raise exception using errcode = '23503', message = 'The admission receipt could not be found.';
  end if;
  if receipt_record.status = 'reversed' then
    raise exception using errcode = '23505', message = 'This admission receipt has already been reversed.';
  end if;
  request_result := private.persist_finance_request(
    request_key, 'admission_receipt_reversal', actor_id, request_fingerprint,
    jsonb_build_object('status', 'pending', 'receiptId', target_receipt_id)
  );
  if request_result->>'status' <> 'pending' then return request_result; end if;
  update public.admission_receipts
  set status = 'reversed', reversed_at = now(), reversed_by = actor_id,
      reversal_reason = btrim(target_reason), updated_by = actor_id
  where id = target_receipt_id;
  result := jsonb_build_object('status', 'reversed', 'receiptId', target_receipt_id,
    'receiptNumber', receipt_record.receipt_number, 'amount', receipt_record.amount,
    'reason', btrim(target_reason));
  return private.persist_finance_request(
    request_key, 'admission_receipt_reversal', actor_id, request_fingerprint, result
  );
end;
$$;
revoke all on function public.reverse_admission_receipt(uuid, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.reverse_admission_receipt(uuid, text, bigint, text) to authenticated;

create or replace function public.reverse_misc_receipt(
  request_key uuid,
  request_fingerprint text,
  target_receipt_id bigint,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  receipt_record record;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_reason, '')), '') is null then
    raise exception using errcode = '22023', message = 'A reversal reason is required.';
  end if;
  select * into receipt_record from public.misc_receipts where id = target_receipt_id for update;
  if receipt_record.id is null then
    raise exception using errcode = '23503', message = 'The miscellaneous receipt could not be found.';
  end if;
  if receipt_record.status = 'reversed' then
    raise exception using errcode = '23505', message = 'This miscellaneous receipt has already been reversed.';
  end if;
  request_result := private.persist_finance_request(
    request_key, 'misc_receipt_reversal', actor_id, request_fingerprint,
    jsonb_build_object('status', 'pending', 'receiptId', target_receipt_id)
  );
  if request_result->>'status' <> 'pending' then return request_result; end if;
  update public.misc_receipts
  set status = 'reversed', reversed_at = now(), reversed_by = actor_id,
      reversal_reason = btrim(target_reason), updated_by = actor_id
  where id = target_receipt_id;
  result := jsonb_build_object('status', 'reversed', 'receiptId', target_receipt_id,
    'receiptNumber', receipt_record.receipt_number, 'amount', receipt_record.amount,
    'reason', btrim(target_reason));
  return private.persist_finance_request(
    request_key, 'misc_receipt_reversal', actor_id, request_fingerprint, result
  );
end;
$$;
revoke all on function public.reverse_misc_receipt(uuid, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.reverse_misc_receipt(uuid, text, bigint, text) to authenticated;

create or replace function public.void_expense(
  request_key uuid,
  request_fingerprint text,
  target_expense_id bigint,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  expense_record record;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_reason, '')), '') is null then
    raise exception using errcode = '22023', message = 'A void reason is required.';
  end if;
  select * into expense_record from public.expenses where id = target_expense_id for update;
  if expense_record.id is null then
    raise exception using errcode = '23503', message = 'The expense could not be found.';
  end if;
  if expense_record.status = 'reversed' then
    raise exception using errcode = '23505', message = 'This expense has already been voided.';
  end if;
  request_result := private.persist_finance_request(
    request_key, 'expense_void', actor_id, request_fingerprint,
    jsonb_build_object('status', 'pending', 'expenseId', target_expense_id)
  );
  if request_result->>'status' <> 'pending' then return request_result; end if;
  update public.expenses
  set status = 'reversed', reversed_at = now(), reversed_by = actor_id,
      reversal_reason = btrim(target_reason), updated_by = actor_id
  where id = target_expense_id;
  result := jsonb_build_object('status', 'voided', 'expenseId', target_expense_id,
    'expenseNumber', expense_record.expense_number, 'amount', expense_record.amount,
    'reason', btrim(target_reason));
  return private.persist_finance_request(
    request_key, 'expense_void', actor_id, request_fingerprint, result
  );
end;
$$;
revoke all on function public.void_expense(uuid, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.void_expense(uuid, text, bigint, text) to authenticated;
