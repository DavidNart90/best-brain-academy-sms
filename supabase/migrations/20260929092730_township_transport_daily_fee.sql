-- Add the Chief Engineer's GHS 6 daily within-township transport collection.
-- A zero configured township transport rate disables its public-facing display
-- and posting option. Feeding remains a daily aggregate for Nursery 1-Basic 6.

set lock_timeout = '5s';

alter table public.fee_components
  add column applies_to text;

update public.fee_components
set applies_to = case code
  when 'base_class_fee' then 'Students in the configured class'
  when 'location_transport_charge' then 'Students assigned to the configured transport location'
  when 'feeding_fee' then 'Nursery 1 through Basic 6'
  when 'admission_fee' then 'New students'
  else 'As configured by the school'
end;

alter table public.fee_components
  alter column applies_to set not null,
  add constraint fee_components_applies_to_check
    check (char_length(btrim(applies_to)) between 2 and 120);

insert into public.fee_components (
  code, name, scope, is_required, sort_order, status, applies_to
) values (
  'township_transport_fee',
  'Transportation Within Township',
  'flat',
  false,
  35,
  'active',
  'Students using daily in-and-out transport within the township'
);

insert into public.fee_component_rates (
  fee_component_id,
  academic_year_id,
  academic_term_id,
  amount,
  status
)
select
  component.id,
  year.id,
  term.id,
  6.00,
  'active'
from public.fee_components component
join public.academic_years year on year.name = '2026/2027'
join public.academic_terms term
  on term.academic_year_id = year.id and term.name = 'Term 1'
where component.code = 'township_transport_fee';

create or replace function private.validate_fee_component_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  component_scope text;
  component_code text;
begin
  select scope, code
  into component_scope, component_code
  from public.fee_components
  where id = new.fee_component_id;

  if component_scope is null then
    raise exception using errcode = '23503', message = 'Unknown fee component.';
  end if;
  if new.amount < 0 then
    raise exception using errcode = '23514', message = 'Fee amounts cannot be negative.';
  end if;
  if new.amount = 0
    and component_scope <> 'location'
    and component_code <> 'township_transport_fee'
  then
    raise exception using
      errcode = '23514',
      message = 'Only transport charges may have a zero amount.';
  end if;
  if not exists (
    select 1
    from public.academic_terms
    where id = new.academic_term_id
      and academic_year_id = new.academic_year_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'The term must belong to the selected academic year.';
  end if;
  if component_scope = 'class'
    and (new.class_id is null or new.school_location_id is not null)
  then
    raise exception using
      errcode = '23514',
      message = 'A class-scoped fee component requires a class and no location.';
  end if;
  if component_scope = 'location'
    and (new.school_location_id is null or new.class_id is not null)
  then
    raise exception using
      errcode = '23514',
      message = 'A location-scoped fee component requires a location and no class.';
  end if;
  if component_scope = 'flat'
    and (new.class_id is not null or new.school_location_id is not null)
  then
    raise exception using
      errcode = '23514',
      message = 'A flat fee component must not reference a class or location.';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_fee_component_rate()
  from public, anon, authenticated;

create table public.township_transport_receipts (
  id bigint generated always as identity primary key,
  receipt_number text not null,
  amount numeric(14, 2) not null check (amount > 0),
  business_date date not null,
  payment_method_id bigint not null references public.payment_methods(id) on delete restrict,
  external_reference text check (
    external_reference is null
    or char_length(btrim(external_reference)) between 1 and 120
  ),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 500),
  collection_scope text not null default 'daily_total'
    check (collection_scope = 'daily_total'),
  payment_method_name_snapshot text not null,
  status text not null default 'active' check (status in ('active', 'reversed')),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  reversal_reason text check (
    reversal_reason is null
    or char_length(btrim(reversal_reason)) between 2 and 500
  ),
  school_name_snapshot text,
  school_address_snapshot text,
  school_phone_snapshot text,
  school_email_snapshot text,
  school_motto_snapshot text,
  school_logo_path_snapshot text,
  recorded_by_snapshot text,
  reversal_number text,
  reversed_by_name_snapshot text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint township_transport_receipts_reversal_fields_check check (
    (status = 'reversed') = (
      reversed_at is not null
      and reversal_number is not null
      and reversed_by_name_snapshot is not null
    )
  )
);

create unique index township_transport_receipts_number_unique
  on public.township_transport_receipts (receipt_number);
create unique index township_transport_daily_total_unique
  on public.township_transport_receipts (business_date, payment_method_id)
  where status = 'active';
create unique index township_transport_receipts_reversal_number_unique
  on public.township_transport_receipts (reversal_number)
  where reversal_number is not null;
create index township_transport_receipts_business_date_idx
  on public.township_transport_receipts (business_date desc, id desc);
create index township_transport_receipts_status_idx
  on public.township_transport_receipts (status);
create index township_transport_receipts_payment_method_idx
  on public.township_transport_receipts (payment_method_id);
create index township_transport_receipts_created_by_idx
  on public.township_transport_receipts (created_by);
create index township_transport_receipts_updated_by_idx
  on public.township_transport_receipts (updated_by);
create index township_transport_receipts_reversed_by_idx
  on public.township_transport_receipts (reversed_by)
  where reversed_by is not null;

create trigger township_transport_receipts_stamp
before insert or update on public.township_transport_receipts
for each row execute function private.stamp_configuration_record();

create trigger township_transport_receipts_reference_check
before insert or update on public.township_transport_receipts
for each row execute function private.validate_payment_reference();

create trigger township_transport_receipts_document_snapshot
before insert on public.township_transport_receipts
for each row execute function private.populate_finance_document_snapshot();

create trigger township_transport_receipts_reference_snapshot
before insert on public.township_transport_receipts
for each row execute function private.populate_finance_reference_snapshot();

create trigger township_transport_receipts_reversal_snapshot
before update on public.township_transport_receipts
for each row execute function private.populate_finance_reversal_snapshot();

create trigger township_transport_receipts_preserve_document_snapshot
before update on public.township_transport_receipts
for each row execute function private.preserve_finance_document_snapshot();

create trigger township_transport_receipts_preserve_reference_snapshot
before update on public.township_transport_receipts
for each row execute function private.preserve_finance_reference_snapshot();

create trigger township_transport_receipts_audit
after insert or update or delete on public.township_transport_receipts
for each row execute function private.write_configuration_audit();

alter table public.township_transport_receipts enable row level security;

revoke all on public.township_transport_receipts
  from public, anon, authenticated;
grant select on public.township_transport_receipts to authenticated;

create policy township_transport_receipts_read_finance
on public.township_transport_receipts
for select
to authenticated
using ((select private.has_permission('financials.read')));

alter table private.finance_requests
  drop constraint finance_requests_operation_check;
alter table private.finance_requests
  add constraint finance_requests_operation_check check (
    operation in (
      'school_fee_payment',
      'feeding_receipt',
      'township_transport_receipt',
      'admission_receipt',
      'misc_receipt',
      'expense',
      'school_fee_payment_reversal',
      'feeding_receipt_reversal',
      'township_transport_receipt_reversal',
      'admission_receipt_reversal',
      'misc_receipt_reversal',
      'expense_void',
      'salary_record',
      'salary_deduction',
      'salary_record_reversal',
      'salary_deduction_reversal',
      'salary_configuration',
      'salary_configuration_end',
      'salary_payment',
      'ssnit_remittance',
      'salary_batch_post',
      'salary_batch_dispatch',
      'library_collection',
      'library_collection_reversal'
    )
  );

create or replace function public.record_daily_collection(
  request_key uuid,
  collection_type text,
  receipt_amount numeric,
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
  fingerprint text;
  request_result jsonb;
  result jsonb;
  method_name text;
  document_number text;
  receipt_id bigint;
  target_table text;
  target_term_id bigint;
  target_year_id bigint;
  admission_fee_amount numeric(14, 2);
  admissions_for_date bigint;
  expected_admission_total numeric(14, 2);
  daily_fee_amount numeric(14, 2);
  daily_fee_code text;
begin
  if actor_id is null
    or not (select private.has_permission('finance.transactions.manage'))
  then
    raise exception using
      errcode = '42501',
      message = 'Finance transaction permission is required.';
  end if;
  if collection_type is null
    or collection_type not in (
      'feeding_receipt',
      'township_transport_receipt',
      'admission_receipt'
    )
  then
    raise exception using
      errcode = '22023',
      message = 'Choose feeding, township transport, or admission collections.';
  end if;
  if receipt_amount is null
    or receipt_amount <= 0
    or receipt_amount >= 1000000000000
    or receipt_amount <> round(receipt_amount, 2)
    or target_business_date is null
  then
    raise exception using
      errcode = '22023',
      message = 'Enter a positive amount with at most two decimal places and a business date.';
  end if;

  fingerprint := jsonb_build_array(
    'daily_total',
    collection_type,
    receipt_amount,
    target_business_date,
    target_payment_method_id,
    target_external_reference,
    target_notes
  )::text;
  request_result := private.persist_finance_request(
    request_key,
    collection_type,
    actor_id,
    fingerprint,
    jsonb_build_object('status', 'pending')
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
  end if;

  if collection_type in ('feeding_receipt', 'township_transport_receipt') then
    select term.id, term.academic_year_id
    into target_term_id, target_year_id
    from public.academic_terms term
    join public.academic_years year on year.id = term.academic_year_id
    where term.status = 'active'
      and year.status = 'active'
      and term.starts_on is not null
      and term.ends_on is not null
      and target_business_date between term.starts_on and term.ends_on
    order by term.is_current desc, term.starts_on desc, term.id desc
    limit 1;

    daily_fee_code := case collection_type
      when 'feeding_receipt' then 'feeding_fee'
      else 'township_transport_fee'
    end;

    select rate.amount
    into daily_fee_amount
    from public.fee_component_rates rate
    join public.fee_components component
      on component.id = rate.fee_component_id
    where component.code = daily_fee_code
      and component.status = 'active'
      and rate.academic_year_id = target_year_id
      and rate.academic_term_id = target_term_id
      and rate.class_id is null
      and rate.school_location_id is null
      and rate.status = 'active'
    order by rate.id desc
    limit 1;

    if daily_fee_amount is null or daily_fee_amount <= 0 then
      raise exception using
        errcode = '22023',
        message = case collection_type
          when 'feeding_receipt'
            then 'Feeding collection is not active for this date.'
          else 'Township transport collection is not active for this date.'
        end;
    end if;
  end if;

  if collection_type = 'admission_receipt' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'admission-reconciliation:' || target_business_date::text,
        0
      )
    );

    select term.id, term.academic_year_id
    into target_term_id, target_year_id
    from public.academic_terms term
    join public.academic_years year on year.id = term.academic_year_id
    where term.status = 'active'
      and year.status = 'active'
      and term.starts_on is not null
      and term.ends_on is not null
      and target_business_date between term.starts_on and term.ends_on
    order by term.is_current desc, term.starts_on desc, term.id desc
    limit 1;

    if target_term_id is null then
      raise exception using
        errcode = '22023',
        message = 'Admission fee configuration is unavailable for this date. Contact the Super Administrator.';
    end if;

    select rate.amount
    into admission_fee_amount
    from public.fee_component_rates rate
    join public.fee_components component
      on component.id = rate.fee_component_id
    where component.code = 'admission_fee'
      and component.status = 'active'
      and rate.academic_year_id = target_year_id
      and rate.academic_term_id = target_term_id
      and rate.class_id is null
      and rate.school_location_id is null
      and rate.status = 'active'
    order by rate.id desc
    limit 1;

    if admission_fee_amount is null then
      raise exception using
        errcode = '22023',
        message = 'Admission fee configuration is unavailable for this date. Contact the Super Administrator.';
    end if;

    select count(*)::bigint
    into admissions_for_date
    from public.students student
    where student.admission_date = target_business_date;

    expected_admission_total := admissions_for_date * admission_fee_amount;
    if receipt_amount <> expected_admission_total then
      raise exception using
        errcode = '22023',
        message = format(
          'Admission fees do not match %s admission%s for %s. Expected GHS %s at GHS %s each. Contact the Administrator to check the admissions count for this date.',
          admissions_for_date,
          case when admissions_for_date = 1 then '' else 's' end,
          target_business_date,
          to_char(expected_admission_total, 'FM999999999990.00'),
          to_char(admission_fee_amount, 'FM999999999990.00')
        );
    end if;
  end if;

  select name
  into method_name
  from public.payment_methods
  where id = target_payment_method_id and status = 'active';
  if method_name is null then
    raise exception using
      errcode = '23503',
      message = 'The payment method is unavailable.';
  end if;

  target_table := case collection_type
    when 'feeding_receipt' then 'feeding_receipts'
    when 'township_transport_receipt' then 'township_transport_receipts'
    else 'admission_receipts'
  end;
  document_number := private.allocate_document_number('RCT');
  execute format(
    'insert into public.%I
      (receipt_number, amount, business_date, payment_method_id, external_reference, notes,
       collection_scope, payment_method_name_snapshot, created_by, updated_by)
     values ($1, $2, $3, $4, $5, $6, ''daily_total'', $7, $8, $8)
     returning id',
    target_table
  )
  into receipt_id
  using
    document_number,
    receipt_amount,
    target_business_date,
    target_payment_method_id,
    nullif(btrim(target_external_reference), ''),
    nullif(btrim(target_notes), ''),
    method_name,
    actor_id;

  result := jsonb_build_object(
    'status', 'posted',
    'receiptId', receipt_id,
    'receiptNumber', document_number,
    'amount', receipt_amount,
    'businessDate', target_business_date,
    'collectionScope', 'daily_total'
  );
  return private.persist_finance_request(
    request_key,
    collection_type,
    actor_id,
    fingerprint,
    result
  );
end;
$$;

revoke all on function public.record_daily_collection(
  uuid, text, numeric, date, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.record_daily_collection(
  uuid, text, numeric, date, bigint, text, text
) to authenticated;

create or replace function public.reverse_township_transport_receipt(
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
  if actor_id is null
    or not (select private.has_permission('finance.transactions.manage'))
  then
    raise exception using
      errcode = '42501',
      message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_reason, '')), '') is null then
    raise exception using
      errcode = '22023',
      message = 'A reversal reason is required.';
  end if;

  select *
  into receipt_record
  from public.township_transport_receipts
  where id = target_receipt_id
  for update;
  if receipt_record.id is null then
    raise exception using
      errcode = '23503',
      message = 'The township transport receipt could not be found.';
  end if;
  if receipt_record.status = 'reversed' then
    raise exception using
      errcode = '23505',
      message = 'This township transport receipt has already been reversed.';
  end if;

  request_result := private.persist_finance_request(
    request_key,
    'township_transport_receipt_reversal',
    actor_id,
    request_fingerprint,
    jsonb_build_object('status', 'pending', 'receiptId', target_receipt_id)
  );
  if request_result->>'status' <> 'pending' then
    return request_result;
  end if;

  update public.township_transport_receipts
  set status = 'reversed',
      reversed_at = now(),
      reversed_by = actor_id,
      reversal_reason = btrim(target_reason),
      updated_by = actor_id
  where id = target_receipt_id;

  result := jsonb_build_object(
    'status', 'reversed',
    'receiptId', target_receipt_id,
    'receiptNumber', receipt_record.receipt_number,
    'amount', receipt_record.amount,
    'reason', btrim(target_reason)
  );
  return private.persist_finance_request(
    request_key,
    'township_transport_receipt_reversal',
    actor_id,
    request_fingerprint,
    result
  );
end;
$$;

revoke all on function public.reverse_township_transport_receipt(
  uuid, text, bigint, text
) from public, anon, authenticated;
grant execute on function public.reverse_township_transport_receipt(
  uuid, text, bigint, text
) to authenticated;

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
    select 1
    from public.invoices
    where student_id = target_student_id
      and academic_year_id = target_academic_year_id
      and academic_term_id = target_academic_term_id
      and status <> 'cancelled'
  ) then
    return jsonb_build_object(
      'studentId', target_student_id,
      'status', 'skipped',
      'reason', 'An active invoice already exists for this student and term.'
    );
  end if;

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
  where student_row.id = target_student_id and student_row.status = 'active';
  if student.id is null then
    return jsonb_build_object(
      'studentId', target_student_id,
      'status', 'skipped',
      'reason', 'The student is not active.'
    );
  end if;

  select rate.id, rate.amount
  into base_rate
  from public.fee_component_rates rate
  join public.fee_components component on component.id = rate.fee_component_id
  where component.code = 'base_class_fee'
    and rate.class_id = enrollment.class_id
    and rate.academic_year_id = target_academic_year_id
    and rate.academic_term_id = target_academic_term_id
    and rate.status = 'active';

  select rate.id, rate.amount
  into transport_rate
  from public.fee_component_rates rate
  join public.fee_components component on component.id = rate.fee_component_id
  where component.code = 'location_transport_charge'
    and rate.school_location_id = enrollment.school_location_id
    and rate.academic_year_id = target_academic_year_id
    and rate.academic_term_id = target_academic_term_id
    and rate.status = 'active';

  if base_rate.amount is null or transport_rate.amount is null then
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
    base_rate.amount + transport_rate.amount,
    base_rate.amount + transport_rate.amount,
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
    (select id from public.fee_components where code = 'base_class_fee'),
    'Base Class Fee',
    base_rate.amount,
    1,
    actor_id,
    actor_id
  );

  if transport_rate.amount > 0 then
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
      (select id from public.fee_components where code = 'location_transport_charge'),
      coalesce(transport_label, 'Location / Transport Charge'),
      transport_rate.amount,
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

create or replace view public.financial_activity_report
with (security_invoker = true)
as
select
  payment.id as record_id,
  'income'::text as record_kind,
  'School fees'::text as source,
  payment.payment_number as reference,
  receipt.receipt_number as document_reference,
  receipt.student_name_snapshot as person_name,
  'School fees'::text as category,
  invoice.class_name_snapshot as class_name,
  payment.amount,
  payment.business_date,
  payment.status,
  receipt.payment_method_name_snapshot as payment_method,
  invoice.academic_year_id,
  invoice.academic_term_id,
  invoice.class_id,
  invoice.student_id,
  null::bigint as staff_id,
  payment.payment_method_id,
  null::bigint as expense_category_id,
  null::bigint as deduction_type_id,
  payment.reversal_number as reversal_reference,
  payment.reversal_reason,
  payment.created_at
from public.payments payment
join public.invoices invoice on invoice.id = payment.invoice_id
left join public.receipts receipt on receipt.payment_id = payment.id

union all

select
  receipt.id,
  'income',
  'Feeding',
  receipt.receipt_number,
  receipt.receipt_number,
  coalesce(receipt.student_name_snapshot, 'Daily aggregate'),
  'Feeding',
  receipt.class_name_snapshot,
  receipt.amount,
  receipt.business_date,
  receipt.status,
  receipt.payment_method_name_snapshot,
  null::bigint,
  null::bigint,
  null::bigint,
  receipt.student_id,
  null::bigint,
  receipt.payment_method_id,
  null::bigint,
  null::bigint,
  receipt.reversal_number,
  receipt.reversal_reason,
  receipt.created_at
from public.feeding_receipts receipt

union all

select
  receipt.id,
  'income',
  'Township transport',
  receipt.receipt_number,
  receipt.receipt_number,
  'Daily aggregate',
  'Township transport',
  null::text,
  receipt.amount,
  receipt.business_date,
  receipt.status,
  receipt.payment_method_name_snapshot,
  null::bigint,
  null::bigint,
  null::bigint,
  null::bigint,
  null::bigint,
  receipt.payment_method_id,
  null::bigint,
  null::bigint,
  receipt.reversal_number,
  receipt.reversal_reason,
  receipt.created_at
from public.township_transport_receipts receipt

union all

select
  receipt.id,
  'income',
  'Admission',
  receipt.receipt_number,
  receipt.receipt_number,
  coalesce(receipt.student_name_snapshot, 'Daily aggregate'),
  'Admission',
  receipt.class_name_snapshot,
  receipt.amount,
  receipt.business_date,
  receipt.status,
  receipt.payment_method_name_snapshot,
  null::bigint,
  null::bigint,
  null::bigint,
  receipt.student_id,
  null::bigint,
  receipt.payment_method_id,
  null::bigint,
  null::bigint,
  receipt.reversal_number,
  receipt.reversal_reason,
  receipt.created_at
from public.admission_receipts receipt

union all

select
  receipt.id,
  'income',
  'Miscellaneous',
  receipt.receipt_number,
  receipt.receipt_number,
  coalesce(receipt.payer_name, 'Unattributed payer'),
  receipt.income_name_snapshot,
  null::text,
  receipt.amount,
  receipt.business_date,
  receipt.status,
  receipt.payment_method_name_snapshot,
  null::bigint,
  null::bigint,
  null::bigint,
  receipt.student_id,
  null::bigint,
  receipt.payment_method_id,
  null::bigint,
  null::bigint,
  receipt.reversal_number,
  receipt.reversal_reason,
  receipt.created_at
from public.misc_receipts receipt

union all

select
  expense.id,
  'expense',
  'Expenses',
  expense.expense_number,
  expense.expense_number,
  expense.description,
  expense.expense_category_name_snapshot,
  null::text,
  expense.amount,
  expense.business_date,
  expense.status,
  expense.payment_method_name_snapshot,
  null::bigint,
  null::bigint,
  null::bigint,
  null::bigint,
  null::bigint,
  expense.payment_method_id,
  expense.expense_category_id,
  null::bigint,
  expense.reversal_number,
  expense.reversal_reason,
  expense.created_at
from public.expenses expense

union all

select
  deduction.id,
  'deduction',
  'Salary deductions',
  deduction.deduction_number,
  deduction.deduction_number,
  salary.staff_name_snapshot,
  deduction.deduction_type_name_snapshot,
  null::text,
  deduction.amount,
  salary.payroll_month,
  deduction.status,
  null::text,
  null::bigint,
  null::bigint,
  null::bigint,
  null::bigint,
  salary.staff_id,
  null::bigint,
  null::bigint,
  deduction.deduction_type_id,
  deduction.reversal_number,
  deduction.reversal_reason,
  deduction.created_at
from public.salary_deductions deduction
join public.salary_records salary on salary.id = deduction.salary_record_id;

revoke all on public.financial_activity_report from public, anon, authenticated;
grant select on public.financial_activity_report to authenticated;

create or replace function private.finance_document_uses_logo(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (select private.has_permission('settings.manage'))
    and (
      exists (
        select 1 from public.invoices
        where school_logo_path_snapshot = target_path
      )
      or exists (
        select 1 from public.receipts
        where school_logo_path_snapshot = target_path
      )
      or exists (
        select 1 from public.feeding_receipts
        where school_logo_path_snapshot = target_path
      )
      or exists (
        select 1 from public.township_transport_receipts
        where school_logo_path_snapshot = target_path
      )
      or exists (
        select 1 from public.admission_receipts
        where school_logo_path_snapshot = target_path
      )
      or exists (
        select 1 from public.misc_receipts
        where school_logo_path_snapshot = target_path
      )
      or exists (
        select 1 from public.expenses
        where school_logo_path_snapshot = target_path
      )
    );
$$;

revoke all on function private.finance_document_uses_logo(text)
  from public, anon, authenticated;
grant execute on function private.finance_document_uses_logo(text)
  to authenticated;

comment on table public.township_transport_receipts is
  'Audited daily aggregate receipts for GHS 6 in-and-out transportation within the township.';
comment on column public.fee_components.applies_to is
  'Human-readable applicability rule shown with the configured fee.';
