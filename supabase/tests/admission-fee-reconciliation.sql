-- Focused admission-fee reconciliation proof. Ten synthetic admissions must
-- require exactly GHS 500.00 at the configured GHS 50.00 rate. Everything
-- rolls back, including the successful receipt and document counter.

begin;

do $$
declare
  actor uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  method_id bigint;
  mismatch_message text;
  result jsonb;
  receipt_id bigint;
begin
  if not exists (
    select 1
    from public.academic_terms
    where is_current
      and status = 'active'
      and current_date between starts_on and ends_on
  ) then
    raise exception 'The current date is outside the active academic term';
  end if;

  if not exists (
    select 1
    from public.fee_component_rates rate
    join public.fee_components component on component.id = rate.fee_component_id
    join public.academic_terms term on term.id = rate.academic_term_id
    where component.code = 'admission_fee'
      and term.is_current
      and rate.status = 'active'
      and rate.class_id is null
      and rate.school_location_id is null
      and rate.amount = 50.00
  ) then
    raise exception 'The active admission fee is not GHS 50.00';
  end if;

  if exists (
    select 1 from public.students where admission_date = current_date
  ) then
    raise exception 'This focused proof requires an empty admission date';
  end if;

  insert into auth.users (id, email)
  values (actor, 'admission-reconciliation-' || actor::text || '@example.invalid');
  update public.profiles
  set status = 'active', must_change_password = false,
      display_name = 'Synthetic Admission Reconciler'
  where id = actor;
  insert into public.user_roles (user_id, role_code)
  values (actor, 'SUPER_ADMIN');
  insert into auth.sessions (id, user_id, not_after)
  values (session_id, actor, now() + interval '10 minutes');
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', actor,
      'role', 'authenticated',
      'session_id', session_id
    )::text,
    true
  );

  insert into public.students (
    admission_number,
    first_name,
    last_name,
    gender,
    admission_date,
    status,
    has_disability,
    religious_denomination,
    created_by,
    updated_by
  )
  select
    'BBA-' || (
      floor(extract(epoch from clock_timestamp()) * 1000000)::bigint + item
    )::text,
    'Synthetic',
    'Admission ' || item,
    case when item % 2 = 0 then 'female' else 'male' end,
    current_date,
    'active',
    false,
    'Synthetic',
    actor,
    actor
  from generate_series(1, 10) item;

  select id into method_id
  from public.payment_methods
  where status = 'active' and not requires_reference
  order by sort_order, id
  limit 1;

  begin
    perform public.record_daily_collection(
      gen_random_uuid(),
      'admission_receipt',
      499.00,
      current_date,
      method_id,
      null,
      'Synthetic mismatch'
    );
    raise exception 'A mismatched admission total was accepted';
  exception
    when sqlstate '22023' then
      get stacked diagnostics mismatch_message = message_text;
      if mismatch_message <> 'Admission fees do not match 10 admissions for '
        || current_date::text
        || '. Expected GHS 500.00 at GHS 50.00 each. Contact the Administrator to check the admissions count for this date.' then
        raise exception 'Unexpected mismatch guidance: %', mismatch_message;
      end if;
  end;

  if exists (
    select 1
    from public.admission_receipts
    where business_date = current_date
  ) then
    raise exception 'The rejected admission total created a receipt';
  end if;

  result := public.record_daily_collection(
    gen_random_uuid(),
    'admission_receipt',
    500.00,
    current_date,
    method_id,
    null,
    'Synthetic exact total'
  );
  receipt_id := (result->>'receiptId')::bigint;

  if result->>'status' <> 'posted'
    or not exists (
      select 1
      from public.admission_receipts
      where id = receipt_id
        and amount = 500.00
        and business_date = current_date
        and collection_scope = 'daily_total'
        and status = 'active'
    ) then
    raise exception 'The exact admission total was not posted correctly';
  end if;
end;
$$;

select 'PASS: 10 admissions require exactly GHS 500.00 and mismatches post nothing' as result;

rollback;
