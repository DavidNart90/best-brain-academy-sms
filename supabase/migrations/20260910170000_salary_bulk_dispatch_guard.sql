-- Enforce the UI's post-before-dispatch rule at the database boundary.

set lock_timeout = '5s';

create or replace function public.dispatch_salary_batch(
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

  -- Take the posting lock first so the configured roster cannot change between
  -- the completeness check and dispatch. Every salary path follows staff then
  -- salary-record lock order.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('salary-post:' || target_payroll_month::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('salary-dispatch:' || target_payroll_month::text, 0)
  );

  perform staff.id
  from public.staff staff
  join public.staff_salary_configurations configuration
    on configuration.staff_id = staff.id
   and configuration.effective_from <= target_payroll_month
   and (configuration.effective_to is null or configuration.effective_to >= target_payroll_month)
  where staff.status = 'active'
  order by staff.id
  for update of staff;

  if exists (
    select 1
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
  ) then
    raise exception using errcode = '23514',
      message = 'Post all eligible salaries before dispatching the batch.';
  end if;

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

revoke all on function public.dispatch_salary_batch(uuid, date, date, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.dispatch_salary_batch(uuid, date, date, bigint, text, text)
  to authenticated;

reset lock_timeout;
