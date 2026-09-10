-- Safe monthly salary batches. Posting creates calculation snapshots only;
-- dispatching records the remaining employee net pay as cash expenses.

set lock_timeout = '5s';

alter table private.finance_requests
  drop constraint if exists finance_requests_operation_check;
alter table private.finance_requests
  add constraint finance_requests_operation_check check (
    operation in (
      'school_fee_payment', 'feeding_receipt', 'admission_receipt', 'misc_receipt', 'expense',
      'school_fee_payment_reversal', 'feeding_receipt_reversal',
      'admission_receipt_reversal', 'misc_receipt_reversal', 'expense_void',
      'salary_record', 'salary_deduction', 'salary_record_reversal',
      'salary_deduction_reversal', 'salary_configuration', 'salary_configuration_end',
      'salary_payment', 'ssnit_remittance', 'salary_batch_post', 'salary_batch_dispatch',
      'library_collection', 'library_collection_reversal'
    )
  );

-- Single and bulk posting share the same month lock. Staff is locked before its
-- configuration is read so a concurrent salary-setting change cannot race a
-- salary snapshot.
create or replace function public.record_salary_record(
  request_key uuid,
  target_staff_id bigint,
  target_payroll_month date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set lock_timeout = '5s'
as $$
declare
  configured_salary numeric(14, 2);
begin
  if (select auth.uid()) is null
    or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'You cannot record salary entries.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if target_payroll_month is null
    or target_payroll_month <> date_trunc('month', target_payroll_month)::date then
    raise exception using errcode = '22023', message = 'Choose a valid salary month.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('salary-post:' || target_payroll_month::text, 0)
  );
  perform 1
  from public.staff
  where id = target_staff_id and status = 'active'
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'Choose an active staff member.';
  end if;

  select gross_salary into configured_salary
  from public.staff_salary_configurations
  where staff_id = target_staff_id
    and effective_from <= target_payroll_month
    and (effective_to is null or effective_to >= target_payroll_month);
  if configured_salary is null then
    raise exception using errcode = '23503',
      message = 'No gross salary is configured for this staff member and month.';
  end if;

  return private.record_salary_record_core(
    request_key, target_staff_id, target_payroll_month, configured_salary
  );
end;
$$;

create function public.post_salary_batch(
  request_key uuid,
  target_payroll_month date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set lock_timeout = '5s'
set statement_timeout = '30s'
as $$
declare
  actor_id uuid := (select auth.uid());
  fingerprint text;
  request_result jsonb;
  salary_target record;
  salary_result jsonb;
  configured_count integer := 0;
  posted_count integer := 0;
  skipped_count integer := 0;
  gross_total numeric(14, 2) := 0;
  deduction_total numeric(14, 2) := 0;
  net_total numeric(14, 2) := 0;
  result jsonb;
begin
  if actor_id is null
    or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'You cannot post salary batches.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if target_payroll_month is null
    or target_payroll_month <> date_trunc('month', target_payroll_month)::date then
    raise exception using errcode = '22023', message = 'Choose a valid salary month.';
  end if;

  fingerprint := jsonb_build_array(target_payroll_month)::text;
  request_result := private.persist_finance_request(
    request_key, 'salary_batch_post', actor_id, fingerprint,
    jsonb_build_object('status', 'pending', 'payrollMonth', target_payroll_month::text)
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('salary-post:' || target_payroll_month::text, 0)
  );

  -- Match the staff-then-configuration lock order used by salary settings.
  perform staff.id
  from public.staff staff
  join public.staff_salary_configurations configuration
    on configuration.staff_id = staff.id
   and configuration.effective_from <= target_payroll_month
   and (configuration.effective_to is null or configuration.effective_to >= target_payroll_month)
  where staff.status = 'active'
  order by staff.id
  for update of staff;

  select count(*)::integer into configured_count
  from public.staff staff
  join public.staff_salary_configurations configuration
    on configuration.staff_id = staff.id
   and configuration.effective_from <= target_payroll_month
   and (configuration.effective_to is null or configuration.effective_to >= target_payroll_month)
  where staff.status = 'active';

  for salary_target in
    select staff.id as staff_id, configuration.gross_salary
    from public.staff staff
    join public.staff_salary_configurations configuration
      on configuration.staff_id = staff.id
     and configuration.effective_from <= target_payroll_month
     and (configuration.effective_to is null or configuration.effective_to >= target_payroll_month)
    where staff.status = 'active'
      and not exists (
        select 1
        from public.salary_records salary
        where salary.staff_id = staff.id
          and salary.payroll_month = target_payroll_month
          and salary.status = 'active'
      )
    order by staff.id
  loop
    salary_result := private.record_salary_record_core(
      pg_catalog.gen_random_uuid(), salary_target.staff_id,
      target_payroll_month, salary_target.gross_salary
    );
    posted_count := posted_count + 1;
    gross_total := gross_total + (salary_result->>'grossSalary')::numeric;
    deduction_total := deduction_total + (salary_result->>'totalDeductions')::numeric;
    net_total := net_total + (salary_result->>'netSalary')::numeric;
  end loop;

  skipped_count := configured_count - posted_count;
  result := jsonb_build_object(
    'status', 'completed',
    'payrollMonth', target_payroll_month::text,
    'configuredCount', configured_count,
    'postedCount', posted_count,
    'skippedCount', skipped_count,
    'grossTotal', gross_total,
    'deductionTotal', deduction_total,
    'netTotal', net_total
  );
  return private.persist_finance_request(
    request_key, 'salary_batch_post', actor_id, fingerprint, result
  );
end;
$$;

create function public.dispatch_salary_batch(
  request_key uuid,
  target_payroll_month date,
  target_business_date date,
  target_payment_method_id bigint,
  target_external_reference text default null,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set lock_timeout = '5s'
set statement_timeout = '30s'
as $$
declare
  actor_id uuid := (select auth.uid());
  payment_method record;
  fingerprint text;
  request_result jsonb;
  payment_target record;
  salary_result jsonb;
  salary_count integer := 0;
  dispatched_count integer := 0;
  skipped_count integer := 0;
  dispatched_total numeric(14, 2) := 0;
  result jsonb;
begin
  if actor_id is null
    or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'You cannot dispatch salary batches.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if target_payroll_month is null
    or target_payroll_month <> date_trunc('month', target_payroll_month)::date then
    raise exception using errcode = '22023', message = 'Choose a valid salary month.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A payment date is required.';
  end if;
  if target_external_reference is not null
    and nullif(btrim(target_external_reference), '') is not null
    and char_length(btrim(target_external_reference)) > 120 then
    raise exception using errcode = '22023', message = 'The batch reference cannot exceed 120 characters.';
  end if;
  if target_notes is not null
    and nullif(btrim(target_notes), '') is not null
    and char_length(btrim(target_notes)) > 500 then
    raise exception using errcode = '22023', message = 'Notes cannot exceed 500 characters.';
  end if;

  select id, name, requires_reference into payment_method
  from public.payment_methods
  where id = target_payment_method_id and status = 'active';
  if not found then
    raise exception using errcode = '23503', message = 'The payment method is unavailable.';
  end if;
  if payment_method.requires_reference
    and nullif(btrim(coalesce(target_external_reference, '')), '') is null then
    raise exception using errcode = '23514', message = 'This payment method requires a batch reference.';
  end if;

  fingerprint := jsonb_build_array(
    target_payroll_month, target_business_date, target_payment_method_id,
    nullif(btrim(coalesce(target_external_reference, '')), ''),
    nullif(btrim(coalesce(target_notes, '')), '')
  )::text;
  request_result := private.persist_finance_request(
    request_key, 'salary_batch_dispatch', actor_id, fingerprint,
    jsonb_build_object('status', 'pending', 'payrollMonth', target_payroll_month::text)
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('salary-dispatch:' || target_payroll_month::text, 0)
  );

  -- Lock every active record in one deterministic order. Concurrent individual
  -- payments either finish first and are re-read, or wait until the batch ends.
  perform salary.id
  from public.salary_records salary
  where salary.payroll_month = target_payroll_month
    and salary.status = 'active'
  order by salary.id
  for update;

  select count(*)::integer into salary_count
  from public.salary_records salary
  where salary.payroll_month = target_payroll_month
    and salary.status = 'active';

  for payment_target in
    select
      salary.id as salary_record_id,
      (
        salary.net_salary - coalesce(sum(expense.amount), 0)
      )::numeric(14, 2) as outstanding
    from public.salary_records salary
    left join public.expenses expense
      on expense.salary_record_id = salary.id
     and expense.payroll_cash_kind = 'salary_payment'
     and expense.status = 'active'
    where salary.payroll_month = target_payroll_month
      and salary.status = 'active'
    group by salary.id, salary.net_salary
    having salary.net_salary - coalesce(sum(expense.amount), 0) > 0
    order by salary.id
  loop
    salary_result := public.record_salary_cash_transaction(
      pg_catalog.gen_random_uuid(), payment_target.salary_record_id,
      'salary_payment', payment_target.outstanding, target_business_date,
      target_payment_method_id,
      nullif(btrim(coalesce(target_external_reference, '')), ''),
      nullif(btrim(coalesce(target_notes, '')), '')
    );
    dispatched_count := dispatched_count + 1;
    dispatched_total := dispatched_total + (salary_result->>'amount')::numeric;
  end loop;

  skipped_count := salary_count - dispatched_count;
  result := jsonb_build_object(
    'status', 'completed',
    'payrollMonth', target_payroll_month::text,
    'businessDate', target_business_date::text,
    'paymentMethodId', payment_method.id,
    'paymentMethod', payment_method.name,
    'salaryCount', salary_count,
    'dispatchedCount', dispatched_count,
    'skippedCount', skipped_count,
    'dispatchedTotal', dispatched_total,
    'ssnitIncluded', false
  );
  return private.persist_finance_request(
    request_key, 'salary_batch_dispatch', actor_id, fingerprint, result
  );
end;
$$;

revoke all on function public.record_salary_record(uuid, bigint, date)
  from public, anon, authenticated;
revoke all on function public.post_salary_batch(uuid, date)
  from public, anon, authenticated;
revoke all on function public.dispatch_salary_batch(uuid, date, date, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.record_salary_record(uuid, bigint, date)
  to authenticated;
grant execute on function public.post_salary_batch(uuid, date)
  to authenticated;
grant execute on function public.dispatch_salary_batch(uuid, date, date, bigint, text, text)
  to authenticated;

reset lock_timeout;
