-- Phase 4 focused salary-register verification. Synthetic fixtures roll back.
begin;

do $$
declare
  actor uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  staff_id bigint;
begin
  insert into auth.users (id, email)
  values (actor, 'salary-test-' || actor::text || '@example.invalid');
  update public.profiles
  set status = 'active', must_change_password = false, display_name = 'Synthetic Salary Administrator'
  where id = actor;
  insert into public.user_roles (user_id, role_code) values (actor, 'SUPER_ADMIN');
  insert into auth.sessions (id, user_id, not_after)
  values (session_id, actor, now() + interval '10 minutes');
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', actor, 'role', 'authenticated', 'session_id', session_id)::text,
    true
  );
  insert into public.staff (
    staff_number, recorded_name, staff_type, position, status,
    known_subjects, created_by, updated_by
  ) values (
    'SYN-SAL-' || left(replace(actor::text, '-', ''), 12),
    'Synthetic Salary Staff', 'teaching', 'Synthetic Teacher', 'active',
    '{}', actor, actor
  ) returning id into staff_id;
  perform set_config('test.salary_staff', staff_id::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  test_staff_id bigint := current_setting('test.salary_staff')::bigint;
  salary_key uuid := gen_random_uuid();
  salary_result jsonb;
  replay_result jsonb;
  salary_id bigint;
  other_type_id bigint;
  deduction_result jsonb;
  deduction_id bigint;
  replacement_result jsonb;
  configuration_result jsonb;
  configuration_id bigint;
begin
  configuration_result := public.set_staff_salary_configuration(
    gen_random_uuid(), test_staff_id, 800.00, '2099-08-01', 'Synthetic salary configuration'
  );
  configuration_id := (configuration_result->>'configurationId')::bigint;
  if not exists (
    select 1 from public.staff_salary_configurations
    where id = configuration_id and gross_salary = 800.00 and status = 'active'
  ) then raise exception 'Salary configuration was not saved'; end if;

  salary_result := public.record_salary_record(salary_key, test_staff_id, '2099-08-01');
  salary_id := (salary_result->>'salaryRecordId')::bigint;
  if (salary_result->>'grossSalary')::numeric <> 800.00
    or (salary_result->>'totalDeductions')::numeric <> 44.00
    or (salary_result->>'netSalary')::numeric <> 756.00 then
    raise exception 'Automatic 5.5 percent deduction or salary totals failed';
  end if;
  if not exists (
    select 1 from public.salary_records
    where id = salary_id
      and salary_number like 'BBA/SAL/%'
      and staff_name_snapshot = 'Synthetic Salary Staff'
      and staff_position_snapshot = 'Synthetic Teacher'
      and recorded_by_snapshot = 'Synthetic Salary Administrator'
  ) then raise exception 'Salary snapshots or reference failed'; end if;
  if not exists (
    select 1 from public.salary_deductions
    where salary_record_id = salary_id
      and deduction_type_name_snapshot = 'SSNIT employee contribution'
      and calculation_type_snapshot = 'percentage'
      and configured_value_snapshot = 5.5000
      and gross_salary_snapshot = 800.00
      and amount = 44.00
      and deduction_number like 'BBA/DED/%'
  ) then raise exception 'Automatic deduction snapshot failed'; end if;

  replay_result := public.record_salary_record(salary_key, test_staff_id, '2099-08-01');
  if replay_result <> salary_result then raise exception 'Salary replay failed'; end if;
  if (
    select count(*) from public.salary_records record
    where record.staff_id = test_staff_id and record.payroll_month = '2099-08-01'
  ) <> 1 then
    raise exception 'Salary replay duplicated rows';
  end if;
  begin
    perform public.record_salary_record(salary_key, test_staff_id, '2099-09-01');
    raise exception 'Changed salary replay was allowed';
  exception when unique_violation then null;
  end;
  begin
    perform public.record_salary_record(gen_random_uuid(), test_staff_id, '2099-08-01');
    raise exception 'Duplicate active staff month was allowed';
  exception when unique_violation then null;
  end;
  begin
    perform public.record_salary_record(gen_random_uuid(), test_staff_id, '2099-08-02');
    raise exception 'Non-month-start salary was allowed';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_staff_salary_configuration(
      gen_random_uuid(), test_staff_id, 800.001, '2099-09-01', null
    );
    raise exception 'Configured gross salary with extra decimals was allowed';
  exception when invalid_parameter_value then null;
  end;

  select id into other_type_id from public.salary_deduction_types where code = 'OTHER';
  deduction_result := public.record_salary_deduction(
    gen_random_uuid(), salary_id, other_type_id, 50.00, 'Synthetic approved deduction'
  );
  deduction_id := (deduction_result->>'deductionId')::bigint;
  if (deduction_result->>'totalDeductions')::numeric <> 94.00
    or (deduction_result->>'netSalary')::numeric <> 706.00 then
    raise exception 'Manual deduction totals failed';
  end if;
  begin
    perform public.record_salary_deduction(
      gen_random_uuid(), salary_id, other_type_id, 25.00, 'Duplicate type'
    );
    raise exception 'Duplicate active deduction type was allowed';
  exception when unique_violation then null;
  end;
  begin
    perform public.record_salary_deduction(
      gen_random_uuid(), salary_id, other_type_id, 900.00, 'Exceeds gross'
    );
    raise exception 'Deductions above gross were allowed';
  exception when check_violation then null;
  end;
  begin
    perform public.record_salary_deduction(
      gen_random_uuid(), salary_id, other_type_id, 12.345, 'Extra precision'
    );
    raise exception 'Fixed deduction with extra decimals was allowed';
  exception when invalid_parameter_value then null;
  end;

  perform public.reverse_salary_deduction(
    gen_random_uuid(), deduction_id, 'Synthetic correction'
  );
  if not exists (
    select 1 from public.salary_deductions
    where id = deduction_id and status = 'reversed'
      and reversal_number like 'BBA/REV/%'
      and reversed_by_name_snapshot = 'Synthetic Salary Administrator'
  ) then raise exception 'Deduction reversal trace failed'; end if;
  if not exists (
    select 1 from public.salary_records
    where id = salary_id and total_deductions = 44.00 and net_salary = 756.00
  ) then raise exception 'Deduction reversal did not refresh totals'; end if;

  perform public.reverse_salary_record(
    gen_random_uuid(), salary_id, 'Synthetic salary replacement'
  );
  if not exists (
    select 1 from public.salary_records
    where id = salary_id and status = 'reversed'
      and reversal_number like 'BBA/REV/%'
      and total_deductions = 44.00 and net_salary = 756.00
  ) then raise exception 'Salary reversal trace or history preservation failed'; end if;
  if exists (
    select 1 from public.salary_deductions
    where salary_record_id = salary_id and status = 'active'
  ) then raise exception 'Salary reversal left active deductions'; end if;

  perform public.set_staff_salary_configuration(
    gen_random_uuid(), test_staff_id, 900.00, '2099-08-01', 'Corrected before replacement'
  );
  replacement_result := public.record_salary_record(
    gen_random_uuid(), test_staff_id, '2099-08-01'
  );
  if (replacement_result->>'netSalary')::numeric <> 850.50 then
    raise exception 'Corrected salary replacement failed';
  end if;
  begin
    update public.salary_records set gross_salary = 1 where id = salary_id;
    raise exception 'Direct salary mutation was allowed';
  exception when insufficient_privilege then null;
  end;

  perform public.end_staff_salary_configuration(
    gen_random_uuid(), configuration_id, '2099-08-01', 'Synthetic staff departure'
  );
  if not exists (
    select 1 from public.staff_salary_configurations
    where id = configuration_id and status = 'ended'
      and effective_to = '2099-08-01' and end_reason = 'Synthetic staff departure'
  ) then raise exception 'Ending salary did not preserve configuration history'; end if;
  begin
    perform public.record_salary_record(gen_random_uuid(), test_staff_id, '2099-09-01');
    raise exception 'Salary posting was allowed after the configuration ended';
  exception when foreign_key_violation then null;
  end;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.audit_logs
    where entity_type in (
      'staff_salary_configurations', 'salary_records', 'salary_deductions'
    )
  ) then raise exception 'Salary audit rows were not written'; end if;
end;
$$;

set local role authenticated;

do $$
begin
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  begin
    perform public.record_salary_record(gen_random_uuid(), 1, '2099-08-01');
    raise exception 'Unauthenticated salary posting was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select 'PASS: configurable salary history, posting snapshots, deductions, reversals, audit and access boundaries' as result;
rollback;
