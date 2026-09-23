-- Consolidate Books & Prospectus ownership under the Administrator role and
-- reconcile each daily admission-fee total against admissions recorded for
-- the selected business date.

set lock_timeout = '5s';

insert into public.role_permissions (role_code, permission_code) values
  ('ADMINISTRATOR', 'settings.manage'),
  ('ADMINISTRATOR', 'library.read'),
  ('ADMINISTRATOR', 'library.collections.manage'),
  ('ADMINISTRATOR', 'library.settings.manage')
on conflict (role_code, permission_code) do nothing;

do $$
begin
  if exists (
    select 1
    from public.user_roles
    where role_code = 'LIBRARIAN'
  ) then
    raise exception using
      errcode = '55000',
      message = 'The Librarian role cannot be retired while it is assigned to an account.';
  end if;

  if exists (
    select 1
    from public.administrator_provisioning_requests
    where role_code = 'LIBRARIAN'
      and status in ('pending', 'processing')
  ) then
    raise exception using
      errcode = '55000',
      message = 'The Librarian role cannot be retired while an account request is pending.';
  end if;
end;
$$;

delete from public.role_permissions where role_code = 'LIBRARIAN';
delete from public.roles where code = 'LIBRARIAN';

alter table public.roles drop constraint if exists roles_code_check;
alter table public.roles
  add constraint roles_code_check check (
    code in ('SUPER_ADMIN', 'ADMINISTRATOR', 'ACCOUNTANT', 'MANAGEMENT')
  );

create or replace function public.record_daily_collection(
  request_key uuid,
  collection_type text,
  receipt_amount numeric,
  target_business_date date,
  target_payment_method_id bigint,
  target_external_reference text default null,
  target_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
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
  target_term_id bigint;
  target_year_id bigint;
  admission_fee_amount numeric(14,2);
  admissions_for_date bigint;
  expected_admission_total numeric(14,2);
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

  fingerprint := jsonb_build_array(
    'daily_total', collection_type, receipt_amount, target_business_date,
    target_payment_method_id, target_external_reference, target_notes
  )::text;
  request_result := private.persist_finance_request(
    request_key,
    collection_type,
    actor_id,
    fingerprint,
    jsonb_build_object('status','pending')
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
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
    join public.fee_components component on component.id = rate.fee_component_id
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

  select name into method_name
  from public.payment_methods
  where id = target_payment_method_id and status = 'active';
  if method_name is null then
    raise exception using errcode = '23503', message = 'The payment method is unavailable.';
  end if;

  target_table := case
    when collection_type = 'feeding_receipt' then 'feeding_receipts'
    else 'admission_receipts'
  end;
  document_number := private.allocate_document_number('RCT');
  execute format('insert into public.%I
    (receipt_number,amount,business_date,payment_method_id,external_reference,notes,
     collection_scope,payment_method_name_snapshot,created_by,updated_by)
    values ($1,$2,$3,$4,$5,$6,''daily_total'',$7,$8,$8) returning id', target_table)
    into receipt_id
    using document_number, receipt_amount, target_business_date, target_payment_method_id,
      nullif(btrim(target_external_reference), ''), nullif(btrim(target_notes), ''),
      method_name, actor_id;

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
$function$;

revoke all on function public.record_daily_collection(uuid,text,numeric,date,bigint,text,text)
  from public, anon, authenticated;
grant execute on function public.record_daily_collection(uuid,text,numeric,date,bigint,text,text)
  to authenticated;
