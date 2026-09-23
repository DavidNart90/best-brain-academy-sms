-- Focused Library ledger verification. All synthetic fixtures and document
-- counters roll back, and the accounting report must remain unaffected.
begin;

do $$
declare
  actor uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  student_id bigint;
  current_year_id bigint;
  current_term_id bigint;
  class_id bigint;
  location_id bigint;
begin
  insert into auth.users (id, email)
  values (actor, 'library-test-' || actor::text || '@example.invalid');
  update public.profiles
  set status = 'active', must_change_password = false,
      display_name = 'Synthetic Administrator'
  where id = actor;
  insert into public.user_roles (user_id, role_code) values (actor, 'ADMINISTRATOR');
  insert into auth.sessions (id, user_id, not_after)
  values (session_id, actor, now() + interval '10 minutes');
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', actor, 'role', 'authenticated', 'session_id', session_id
    )::text,
    true
  );

  select id into current_year_id from public.academic_years where is_current;
  select id into current_term_id from public.academic_terms where is_current;
  select id into class_id from public.classes where code = 'BAS5';
  select id into location_id from public.school_locations order by sort_order limit 1;

  insert into public.students (
    admission_number, first_name, last_name, gender, admission_date, status,
    has_disability, religious_denomination, created_by, updated_by
  ) values (
    'BBA-' || floor(extract(epoch from clock_timestamp()) * 1000000)::bigint::text,
    'Synthetic', 'Library Student', 'female', current_date, 'active', false,
    'Synthetic', actor, actor
  ) returning id into student_id;
  insert into public.student_enrollments (
    student_id, academic_year_id, academic_term_id, class_id,
    school_location_id, status, started_on, created_by, updated_by
  ) values (
    student_id, current_year_id, current_term_id, class_id,
    location_id, 'active', current_date, actor, actor
  );
  perform set_config('test.library_student', student_id::text, true);
  perform set_config('test.library_term', current_term_id::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  student_id bigint := current_setting('test.library_student')::bigint;
  term_id bigint := current_setting('test.library_term')::bigint;
  charge_result jsonb;
  replay_generation jsonb;
  charge_id bigint;
  basic5_class_id bigint;
  future_term_id bigint;
  method_id bigint;
  collection_key uuid := gen_random_uuid();
  collection_result jsonb;
  replay_result jsonb;
  collection_id bigint;
  collection_number text;
  reversal_key uuid := gen_random_uuid();
  reversal_result jsonb;
begin
  if not exists (
    select 1 from public.roles where code = 'ADMINISTRATOR'
  ) or not exists (
    select 1 from public.role_permissions
    where role_code = 'ADMINISTRATOR'
      and permission_code = 'library.collections.manage'
  ) or not exists (
    select 1 from public.role_permissions
    where role_code = 'ADMINISTRATOR'
      and permission_code = 'library.settings.manage'
  ) then
    raise exception 'Administrator Library grants are missing';
  end if;
  if exists (
    select 1
    from public.library_term_rates rate
    join public.classes class on class.id = rate.class_id
    where rate.academic_term_id = term_id and class.code in ('NUR1', 'NUR2')
  ) then
    raise exception 'Unconfirmed Nursery rates were configured';
  end if;
  if not exists (
    select 1
    from public.library_term_rates rate
    join public.classes class on class.id = rate.class_id
    where rate.academic_term_id = term_id and class.code = 'JHS3'
      and rate.charge_status = 'not_charged' and rate.amount is null
  ) then
    raise exception 'JHS 3 not-charged decision is missing';
  end if;
  if not exists (
    select 1
    from public.library_term_rates rate
    join public.classes class on class.id = rate.class_id
    where rate.academic_term_id = term_id and class.code = 'BAS5'
      and rate.charge_status = 'chargeable' and rate.amount = 500.00
  ) then
    raise exception 'Confirmed Basic 5 rate is incorrect';
  end if;

  select id into basic5_class_id from public.classes where code = 'BAS5';
  select id into future_term_id
  from public.academic_terms
  where not is_current and status = 'active'
  order by sequence, id
  limit 1;

  if not exists (
    select 1 from public.term_rate_configurations
    where academic_term_id = term_id
      and domain = 'library_prospectus'
      and status = 'approved'
  ) then
    raise exception 'Current Books & Prospectus configuration is not approved';
  end if;

  begin
    perform public.prepare_term_rate_configuration(
      future_term_id, 'library_prospectus'
    );
    raise exception 'Future Books & Prospectus configuration was opened';
  exception when check_violation then
    if sqlerrm <> 'Books & Prospectus prices for a future term are locked until that term becomes current.' then
      raise;
    end if;
  end;
  if exists (
    select 1 from public.term_rate_configurations
    where academic_term_id = future_term_id
      and domain = 'library_prospectus'
  ) or exists (
    select 1 from public.library_term_rates
    where academic_term_id = future_term_id
  ) then
    raise exception 'Future Books & Prospectus lock left partial configuration';
  end if;

  charge_result := public.generate_library_term_charges(term_id, student_id);
  charge_id := (charge_result->'created'->0->>'chargeId')::bigint;
  if (charge_result->>'createdCount')::integer <> 1 or charge_id is null then
    raise exception 'Library charge generation failed';
  end if;
  if not exists (
    select 1 from public.library_charges
    where id = charge_id and expected_amount = 500.00 and amount_paid = 0
      and outstanding = 500.00 and status = 'unpaid'
      and description = 'Books & Prospectus'
  ) then
    raise exception 'Library charge snapshot is incorrect';
  end if;
  perform public.set_library_term_rate(
    term_id, basic5_class_id, 'chargeable', 510.00
  );
  if not exists (
    select 1 from public.library_term_rates rate
    where rate.academic_term_id = term_id
      and rate.class_id = basic5_class_id
      and rate.charge_status = 'chargeable' and rate.amount = 510.00
  ) or not exists (
    select 1 from public.library_charges
    where id = charge_id and expected_amount = 500.00
      and amount_paid = 0 and outstanding = 500.00
  ) then
    raise exception 'Current approved Library edit changed a generated charge snapshot';
  end if;
  replay_generation := public.generate_library_term_charges(term_id, student_id);
  if (replay_generation->>'createdCount')::integer <> 0
    or jsonb_array_length(replay_generation->'skipped') <> 1 then
    raise exception 'Charge generation replay duplicated a student bill';
  end if;

  select id into method_id from public.payment_methods
  where status = 'active' and not requires_reference
  order by sort_order limit 1;
  collection_result := public.record_library_collection(
    collection_key, charge_id, 200.00, current_date, method_id, null,
    'Synthetic partial Library collection'
  );
  collection_id := (collection_result->>'collectionId')::bigint;
  collection_number := collection_result->>'collectionNumber';
  if collection_number not like 'BBA/LIB/%'
    or (collection_result->>'remainingBalance')::numeric <> 300.00 then
    raise exception 'Library collection reference or balance failed';
  end if;
  if not exists (
    select 1 from public.library_charges
    where id = charge_id and amount_paid = 200.00
      and outstanding = 300.00 and status = 'partially_paid'
  ) then
    raise exception 'Partial Library collection was not reconciled';
  end if;
  if exists (
    select 1 from public.financial_activity_report
    where document_reference = collection_number
  ) then
    raise exception 'Library collection leaked into accounting cashflow';
  end if;

  replay_result := public.record_library_collection(
    collection_key, charge_id, 200.00, current_date, method_id, null,
    'Synthetic partial Library collection'
  );
  if replay_result->>'collectionId' <> collection_id::text
    or (select count(*) from public.library_collections where request_key = collection_key) <> 1 then
    raise exception 'Collection retry was not idempotent';
  end if;
  begin
    perform public.record_library_collection(
      collection_key, charge_id, 100.00, current_date, method_id, null,
      'Changed replay'
    );
    raise exception 'Changed collection replay was accepted';
  exception when unique_violation then null;
  end;
  begin
    perform public.record_library_collection(
      gen_random_uuid(), charge_id, 301.00, current_date, method_id, null, null
    );
    raise exception 'Library overpayment was accepted';
  exception when invalid_parameter_value then null;
  end;

  reversal_result := public.reverse_library_collection(
    reversal_key, collection_id, 'Synthetic correction'
  );
  if reversal_result->>'reversalNumber' not like 'BBA/REV/%' then
    raise exception 'Library reversal reference failed';
  end if;
  if not exists (
    select 1 from public.library_charges
    where id = charge_id and amount_paid = 0
      and outstanding = 500.00 and status = 'unpaid'
  ) or not exists (
    select 1 from public.library_collections
    where id = collection_id and status = 'reversed'
      and reversal_reason = 'Synthetic correction'
      and reversed_by_name_snapshot = 'Synthetic Administrator'
  ) then
    raise exception 'Library reversal did not restore the balance and history';
  end if;
  if public.reverse_library_collection(
    reversal_key, collection_id, 'Synthetic correction'
  )->>'reversalNumber' <> reversal_result->>'reversalNumber' then
    raise exception 'Library reversal replay failed';
  end if;

  begin
    update public.library_charges set amount_paid = 1 where id = charge_id;
    raise exception 'Direct Library ledger mutation was accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  begin
    perform public.generate_library_term_charges(
      current_setting('test.library_term')::bigint,
      current_setting('test.library_student')::bigint
    );
    raise exception 'Unauthenticated Library generation was accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select 'PASS: Library rates, separate charges, retry-safe collections, reversals, permissions and accounting isolation' as result;
rollback;
