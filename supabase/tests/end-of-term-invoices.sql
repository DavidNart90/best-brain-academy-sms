-- Focused end-of-term invoice verification. All fixtures and documents roll back.
begin;

do $$
declare
  actor uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  board_actor uuid := gen_random_uuid();
  board_session_id uuid := gen_random_uuid();
  student_id bigint;
  source_year_id bigint;
  source_term_id bigint;
  target_term_id bigint;
  class_id bigint;
  location_id bigint;
  source_invoice_id bigint;
begin
  insert into auth.users (id, email)
  values (actor, 'end-term-test-' || actor::text || '@example.invalid');
  update public.profiles
  set status = 'active', must_change_password = false,
      display_name = 'Synthetic Accountant'
  where id = actor;
  insert into public.user_roles (user_id, role_code) values (actor, 'ACCOUNTANT');
  insert into auth.sessions (id, user_id, not_after)
  values (session_id, actor, now() + interval '10 minutes');
  insert into auth.users (id, email)
  values (
    board_actor,
    'end-term-board-test-' || board_actor::text || '@example.invalid'
  );
  update public.profiles
  set status = 'active', must_change_password = false,
      display_name = 'Synthetic Board Member'
  where id = board_actor;
  insert into public.user_roles (user_id, role_code)
  values (board_actor, 'MANAGEMENT');
  insert into auth.sessions (id, user_id, not_after)
  values (board_session_id, board_actor, now() + interval '10 minutes');
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', actor, 'role', 'authenticated', 'session_id', session_id
    )::text,
    true
  );

  select id, academic_year_id into source_term_id, source_year_id
  from public.academic_terms where is_current;
  select academic_term_id into target_term_id
  from private.next_active_academic_term(source_term_id);
  select id into class_id from public.classes where status = 'active' order by sort_order limit 1;
  select id into location_id from public.school_locations where status = 'active' order by sort_order limit 1;

  insert into public.fee_component_rates (
    fee_component_id, academic_year_id, academic_term_id, class_id, amount, status,
    created_by, updated_by
  ) values (
    (select id from public.fee_components where code = 'base_class_fee'),
    source_year_id, target_term_id, class_id, 600.00, 'active', actor, actor
  );
  insert into public.fee_component_rates (
    fee_component_id, academic_year_id, academic_term_id, school_location_id,
    amount, status, created_by, updated_by
  ) values (
    (select id from public.fee_components where code = 'location_transport_charge'),
    source_year_id, target_term_id, location_id, 200.00, 'active', actor, actor
  );
  insert into public.library_term_rates (
    academic_term_id, class_id, charge_status, amount, created_by, updated_by
  ) values (
    target_term_id, class_id, 'chargeable', 150.00, actor, actor
  );

  insert into public.students (
    admission_number, first_name, last_name, gender, admission_date, status,
    has_disability, religious_denomination, created_by, updated_by
  ) values (
    'EOI-' || upper(left(replace(actor::text, '-', ''), 12)),
    'Synthetic', 'End Term Student', 'female', current_date, 'active', false,
    'Synthetic', actor, actor
  ) returning id into student_id;
  insert into public.student_enrollments (
    student_id, academic_year_id, academic_term_id, class_id, school_location_id,
    status, started_on, created_by, updated_by
  ) values (
    student_id, source_year_id, source_term_id, class_id, location_id,
    'active', current_date, actor, actor
  );
  insert into public.invoices (
    invoice_number, student_id, academic_year_id, academic_term_id, class_id,
    school_location_id, student_name_snapshot, admission_number_snapshot,
    class_name_snapshot, location_name_snapshot, subtotal, total, amount_paid,
    created_by, updated_by
  ) values (
    'SYN-EOI-SOURCE-' || replace(actor::text, '-', ''), student_id,
    source_year_id, source_term_id, class_id, location_id,
    'Synthetic End Term Student', 'EOI-SNAPSHOT',
    (select name from public.classes where id = class_id),
    (select name from public.school_locations where id = location_id),
    500.00, 500.00, 300.00, actor, actor
  ) returning id into source_invoice_id;

  perform set_config('test.end_term_actor', actor::text, true);
  perform set_config('test.end_term_board_actor', board_actor::text, true);
  perform set_config('test.end_term_board_session', board_session_id::text, true);
  perform set_config('test.end_term_student', student_id::text, true);
  perform set_config('test.end_term_source', source_term_id::text, true);
  perform set_config('test.end_term_target', target_term_id::text, true);
  perform set_config('test.end_term_class', class_id::text, true);
  perform set_config('test.end_term_source_invoice', source_invoice_id::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  test_student_id bigint := current_setting('test.end_term_student')::bigint;
  source_term_id bigint := current_setting('test.end_term_source')::bigint;
  class_id bigint := current_setting('test.end_term_class')::bigint;
  setup jsonb;
  generated jsonb;
  replay jsonb;
  generated_invoice_id bigint;
begin
  if not exists (
    select 1 from public.role_permissions
    where role_code = 'ACCOUNTANT' and permission_code = 'students.read'
  ) or not exists (
    select 1 from public.role_permissions
    where role_code = 'ACCOUNTANT' and permission_code = 'staff.read'
  ) then
    raise exception 'Accountant people-directory read access is missing';
  end if;
  if not exists (
    select 1 from public.role_permissions
    where role_code = 'MANAGEMENT' and permission_code = 'finance.end_term_invoices.read'
  ) or exists (
    select 1 from public.role_permissions
    where role_code = 'MANAGEMENT' and permission_code = 'finance.end_term_invoices.manage'
  ) then
    raise exception 'Board end-term invoice access is not read-only';
  end if;

  perform public.save_end_term_invoice_configuration(
    source_term_id,
    'Please settle all balances before reopening. Thank you.'
  );
  setup := public.get_end_term_invoice_setup(source_term_id);
  if (setup->>'configurationId') is null
    or (setup->>'targetTermId')::bigint <> current_setting('test.end_term_target')::bigint then
    raise exception 'Saved configuration was not recognized: %', setup;
  end if;

  generated := public.generate_end_term_invoices(source_term_id, class_id, null, 50);
  generated_invoice_id := (generated->'created'->0->>'invoiceId')::bigint;
  if (generated->>'createdCount')::integer <> 1 or generated_invoice_id is null then
    raise exception 'End-term invoice generation failed: %', generated;
  end if;
  if not exists (
    select 1 from public.invoices
    where id = generated_invoice_id
      and invoice_kind = 'end_of_term'
      and source_academic_term_id = source_term_id
      and total = 800.00
      and previous_balance_snapshot = 200.00
      and prospectus_amount_snapshot = 150.00
      and parent_notes_snapshot = 'Please settle all balances before reopening. Thank you.'
  ) then
    raise exception 'End-term immutable snapshots are incorrect';
  end if;
  if (select count(*) from public.invoice_lines where invoice_id = generated_invoice_id) <> 2 then
    raise exception 'School-fee invoice lines were not generated';
  end if;
  if exists (
    select 1 from public.library_charges
    where student_id = test_student_id
      and academic_term_id = current_setting('test.end_term_target')::bigint
  ) then
    raise exception 'Generation incorrectly posted a Library charge';
  end if;

  replay := public.generate_end_term_invoices(source_term_id, class_id, null, 50);
  if (replay->>'createdCount')::integer <> 0
    or jsonb_array_length(replay->'skipped') <> 1 then
    raise exception 'Retry duplicated a next-term invoice';
  end if;

  begin
    perform public.save_end_term_invoice_configuration(source_term_id, 'Changed after issue');
    raise exception 'Issued parent note remained editable';
  exception when invalid_parameter_value then null;
  end;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', current_setting('test.end_term_board_actor')::uuid,
      'role', 'authenticated',
      'session_id', current_setting('test.end_term_board_session')::uuid
    )::text,
    true
  );
  if not exists (
    select 1 from public.invoices where id = generated_invoice_id
  ) or (select count(*) from public.invoice_lines where invoice_id = generated_invoice_id) <> 2 then
    raise exception 'Board could not read the end-term invoice and its lines';
  end if;
  begin
    perform public.save_end_term_invoice_configuration(source_term_id, 'Board mutation');
    raise exception 'Board changed end-term invoice configuration';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select 'PASS: accountant directory grants, Board read-only access, immutable notes, previous balance, next-term fees, prospectus snapshot, bounded retry-safe generation' as result;
rollback;
