-- Focused proof for atomic, retry-safe monthly salary posting and dispatch.
-- All synthetic rows roll back.
begin;

do $$
declare
  actor uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  first_staff_id bigint;
  second_staff_id bigint;
begin
  insert into auth.users (id, email)
  values (actor, 'salary-bulk-' || actor::text || '@example.invalid');
  update public.profiles
  set status = 'active', must_change_password = false,
      display_name = 'Synthetic Salary Batch Administrator'
  where id = actor;
  insert into public.user_roles (user_id, role_code)
  values (actor, 'SUPER_ADMIN');
  insert into auth.sessions (id, user_id, not_after)
  values (session_id, actor, now() + interval '10 minutes');
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', actor, 'role', 'authenticated', 'session_id', session_id
    )::text,
    true
  );

  insert into public.staff (
    staff_number, recorded_name, staff_type, position, status,
    known_subjects, created_by, updated_by
  ) values (
    'SYN-BULK-A-' || left(replace(actor::text, '-', ''), 10),
    'Synthetic Salary Batch A', 'teaching', 'Synthetic Teacher', 'active',
    '{}', actor, actor
  ) returning id into first_staff_id;
  insert into public.staff (
    staff_number, recorded_name, staff_type, position, status,
    known_subjects, created_by, updated_by
  ) values (
    'SYN-BULK-B-' || left(replace(actor::text, '-', ''), 10),
    'Synthetic Salary Batch B', 'non_teaching', 'Synthetic Cook', 'active',
    '{}', actor, actor
  ) returning id into second_staff_id;

  perform set_config('test.salary_bulk_staff_a', first_staff_id::text, true);
  perform set_config('test.salary_bulk_staff_b', second_staff_id::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  first_staff_id bigint := current_setting('test.salary_bulk_staff_a')::bigint;
  second_staff_id bigint := current_setting('test.salary_bulk_staff_b')::bigint;
  cash_method_id bigint;
  referenced_method_id bigint;
  first_salary_id bigint;
  post_key uuid := gen_random_uuid();
  dispatch_key uuid := gen_random_uuid();
  post_result jsonb;
  replay_result jsonb;
  dispatch_result jsonb;
  configured_count integer;
  expected_post_count integer;
  expected_post_gross numeric(14, 2);
  expected_post_deductions numeric(14, 2);
  expected_post_net numeric(14, 2);
  expected_dispatch_count integer;
  expected_dispatch_total numeric(14, 2);
begin
  select id into cash_method_id
  from public.payment_methods
  where code = 'CASH' and status = 'active';
  select id into referenced_method_id
  from public.payment_methods
  where requires_reference and status = 'active'
  order by id
  limit 1;

  perform public.set_staff_salary_configuration(
    gen_random_uuid(), first_staff_id, 500.00, '2099-10-01',
    'Synthetic bulk salary A'
  );
  perform public.set_staff_salary_configuration(
    gen_random_uuid(), second_staff_id, 800.00, '2099-10-01',
    'Synthetic bulk salary B'
  );

  first_salary_id := (
    public.record_salary_record(gen_random_uuid(), first_staff_id, '2099-10-01')
      ->> 'salaryRecordId'
  )::bigint;
  perform public.record_salary_cash_transaction(
    gen_random_uuid(), first_salary_id, 'salary_payment', 100.00,
    '2099-10-15', cash_method_id, null, 'Synthetic partial payment'
  );

  begin
    perform public.dispatch_salary_batch(
      gen_random_uuid(), '2099-10-01', '2099-10-25', cash_method_id,
      null, 'Dispatch must wait for complete posting'
    );
    raise exception 'A partial salary roster was dispatched';
  exception when check_violation then null;
  end;
  if (
    select count(*)
    from public.expenses
    where salary_record_id = first_salary_id
      and payroll_cash_kind = 'salary_payment' and status = 'active'
  ) <> 1 then
    raise exception 'Rejected incomplete-roster dispatch changed salary expenses';
  end if;

  select count(*)::integer, sum(configuration.gross_salary) - 500.00
  into configured_count, expected_post_gross
  from public.staff staff
  join public.staff_salary_configurations configuration
    on configuration.staff_id = staff.id
   and configuration.effective_from <= '2099-10-01'
   and (configuration.effective_to is null or configuration.effective_to >= '2099-10-01')
  where staff.status = 'active';
  expected_post_count := configured_count - 1;

  post_result := public.post_salary_batch(post_key, '2099-10-01');
  select sum(total_deductions), sum(net_salary)
  into expected_post_deductions, expected_post_net
  from public.salary_records
  where payroll_month = '2099-10-01' and status = 'active'
    and id <> first_salary_id;
  if (post_result->>'postedCount')::integer <> expected_post_count
    or (post_result->>'skippedCount')::integer <> 1
    or (post_result->>'grossTotal')::numeric <> expected_post_gross
    or (post_result->>'deductionTotal')::numeric <> expected_post_deductions
    or (post_result->>'netTotal')::numeric <> expected_post_net then
    raise exception 'Bulk posting totals or skip behavior are incorrect';
  end if;
  if (
    select count(*)
    from public.salary_records
    where staff_id in (first_staff_id, second_staff_id)
      and payroll_month = '2099-10-01'
      and status = 'active'
  ) <> 2 then
    raise exception 'Bulk posting did not create exactly one active salary per staff';
  end if;
  if (
    select count(*)
    from public.salary_records
    where payroll_month = '2099-10-01' and status = 'active'
  ) <> configured_count then
    raise exception 'Bulk posting did not cover every configured active staff member';
  end if;

  replay_result := public.post_salary_batch(post_key, '2099-10-01');
  if replay_result <> post_result then
    raise exception 'Bulk posting replay did not return the original result';
  end if;
  replay_result := public.post_salary_batch(gen_random_uuid(), '2099-10-01');
  if (replay_result->>'postedCount')::integer <> 0
    or (replay_result->>'skippedCount')::integer <> configured_count then
    raise exception 'A completed month was not handled as a safe no-op';
  end if;

  if referenced_method_id is not null then
    begin
      perform public.dispatch_salary_batch(
        gen_random_uuid(), '2099-10-01', '2099-10-25',
        referenced_method_id, null, null
      );
      raise exception 'A required batch reference was not enforced';
    exception when check_violation then null;
    end;
  end if;
  if (
    select count(*)
    from public.expenses
    where salary_record_id in (
      select id from public.salary_records
      where staff_id in (first_staff_id, second_staff_id)
        and payroll_month = '2099-10-01'
    ) and payroll_cash_kind = 'salary_payment' and status = 'active'
  ) <> 1 then
    raise exception 'A rejected dispatch changed salary expenses';
  end if;

  select count(*)::integer, sum(position.salary_outstanding)
  into expected_dispatch_count, expected_dispatch_total
  from public.salary_cash_positions position
  join public.salary_records salary on salary.id = position.salary_record_id
  where salary.payroll_month = '2099-10-01'
    and salary.status = 'active'
    and position.salary_outstanding > 0;

  dispatch_result := public.dispatch_salary_batch(
    dispatch_key, '2099-10-01', '2099-10-25', cash_method_id,
    'SYNTHETIC-OCTOBER-BATCH', 'Synthetic full net salary dispatch'
  );
  if (dispatch_result->>'dispatchedCount')::integer <> expected_dispatch_count
    or (dispatch_result->>'skippedCount')::integer <> 0
    or (dispatch_result->>'dispatchedTotal')::numeric <> expected_dispatch_total
    or (dispatch_result->>'ssnitIncluded')::boolean then
    raise exception 'Bulk dispatch totals, count or SSNIT boundary are incorrect';
  end if;
  if not exists (
    select 1
    from public.salary_cash_positions position
    join public.salary_records salary on salary.id = position.salary_record_id
    where salary.staff_id = first_staff_id
      and position.salary_paid = 472.50
      and position.salary_outstanding = 0
      and position.salary_payment_status = 'paid'
      and position.ssnit_due = 27.50
      and position.ssnit_remitted = 0
      and position.ssnit_status = 'due'
  ) or not exists (
    select 1
    from public.salary_cash_positions position
    join public.salary_records salary on salary.id = position.salary_record_id
    where salary.staff_id = second_staff_id
      and position.salary_paid = 756.00
      and position.salary_outstanding = 0
      and position.salary_payment_status = 'paid'
      and position.ssnit_due = 44.00
      and position.ssnit_remitted = 0
      and position.ssnit_status = 'due'
  ) then
    raise exception 'Bulk dispatch did not settle net pay while leaving SSNIT due';
  end if;
  if (
    select coalesce(sum(amount), 0)
    from public.expenses
    where salary_record_id in (
      select id from public.salary_records
      where payroll_month = '2099-10-01' and status = 'active'
    ) and payroll_cash_kind = 'salary_payment' and status = 'active'
  ) <> (
    select sum(net_salary)
    from public.salary_records
    where payroll_month = '2099-10-01' and status = 'active'
  ) then
    raise exception 'Salary cash expenses were not recorded exactly once';
  end if;

  replay_result := public.dispatch_salary_batch(
    dispatch_key, '2099-10-01', '2099-10-25', cash_method_id,
    'SYNTHETIC-OCTOBER-BATCH', 'Synthetic full net salary dispatch'
  );
  if replay_result <> dispatch_result then
    raise exception 'Bulk dispatch replay did not return the original result';
  end if;
  replay_result := public.dispatch_salary_batch(
    gen_random_uuid(), '2099-10-01', '2099-10-25', cash_method_id, null, null
  );
  if (replay_result->>'dispatchedCount')::integer <> 0
    or (replay_result->>'skippedCount')::integer <> configured_count then
    raise exception 'A paid month was not handled as a safe no-op';
  end if;
end;
$$;

reset role;

set local role authenticated;
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  begin
    perform public.post_salary_batch(gen_random_uuid(), '2099-10-01');
    raise exception 'Unauthenticated bulk salary posting was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.dispatch_salary_batch(
      gen_random_uuid(), '2099-10-01', '2099-10-25', 1, null, null
    );
    raise exception 'Unauthenticated bulk salary dispatch was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select 'PASS: salary batches are atomic, retry-safe, exact, permission-bound and keep SSNIT separate' as result;
rollback;
