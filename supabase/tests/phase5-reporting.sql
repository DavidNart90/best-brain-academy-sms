-- Phase 5 focused reporting reconciliation and access check. All fixtures roll back.
begin;

do $$
declare
  actor uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  student_id bigint;
  staff_id bigint;
  invoice_id bigint;
  baseline jsonb;
begin
  insert into auth.users (id, email)
  values (actor, 'reporting-test-' || actor::text || '@example.invalid');
  update public.profiles
  set status = 'active', must_change_password = false, display_name = 'Synthetic Accountant'
  where id = actor;
  insert into public.user_roles (user_id, role_code) values (actor, 'ACCOUNTANT');
  insert into auth.sessions (id, user_id, not_after)
  values (session_id, actor, now() + interval '10 minutes');
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', actor, 'role', 'authenticated', 'session_id', session_id)::text,
    true
  );
  baseline := public.get_financial_reporting_snapshot(
    '2099-10-01', '2099-10-31',
    (select id from public.academic_years where is_current limit 1),
    (select id from public.academic_terms where is_current limit 1)
  );
  perform set_config(
    'test.reporting_term_expected',
    (baseline->'summary'->>'expectedFees')::text,
    true
  );
  perform set_config(
    'test.reporting_term_outstanding',
    (baseline->'summary'->>'outstandingFees')::text,
    true
  );

  insert into public.students (
    admission_number, first_name, last_name, gender, admission_date,
    has_disability, religious_denomination, created_by, updated_by
  ) values (
    'SYN-REP-' || upper(left(replace(actor::text, '-', ''), 12)),
    'Synthetic', 'Reporting Student', 'female', '2099-10-01',
    false, 'Synthetic unspecified', actor, actor
  ) returning id into student_id;

  insert into public.staff (
    staff_number, recorded_name, staff_type, position, status,
    known_subjects, created_by, updated_by
  ) values (
    'SYN-REP-' || upper(left(replace(actor::text, '-', ''), 12)),
    'Synthetic Reporting Staff', 'teaching', 'Synthetic Teacher', 'active',
    '{}', actor, actor
  ) returning id into staff_id;

  insert into public.staff_salary_configurations (
    staff_id, gross_salary, effective_from, notes, created_by, updated_by
  ) values (
    staff_id, 1000.00, '2099-10-01',
    'Synthetic reporting salary configuration', actor, actor
  );

  insert into public.invoices (
    invoice_number, student_id, academic_year_id, academic_term_id,
    class_id, school_location_id, student_name_snapshot,
    admission_number_snapshot, class_name_snapshot, location_name_snapshot,
    subtotal, total, issued_on, created_by, updated_by
  ) values (
    'SYN-R-INV-' || upper(left(replace(actor::text, '-', ''), 16)), student_id,
    (select id from public.academic_years where is_current limit 1),
    (select id from public.academic_terms where is_current limit 1),
    (select id from public.classes where status = 'active' order by id limit 1),
    (select id from public.school_locations where status = 'active' order by id limit 1),
    'Synthetic Reporting Student', 'SYN-REPORT', 'Synthetic Class', 'Synthetic Location',
    1000.00, 1000.00, '2099-10-01', actor, actor
  ) returning id into invoice_id;

  perform set_config('test.reporting_invoice', invoice_id::text, true);
  perform set_config('test.reporting_staff', staff_id::text, true);
  perform set_config('test.reporting_actor', actor::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  invoice_id bigint := current_setting('test.reporting_invoice')::bigint;
  staff_id bigint := current_setting('test.reporting_staff')::bigint;
  method_id bigint;
  expense_category_id bigint;
  reversed_misc jsonb;
  snapshot jsonb;
  term_snapshot jsonb;
  summary jsonb;
  week_row record;
begin
  select id into method_id
  from public.payment_methods
  where status = 'active' and not requires_reference
  order by id limit 1;
  select id into expense_category_id
  from public.expense_categories
  where status = 'active'
  order by id limit 1;

  perform public.record_school_fee_payment(
    gen_random_uuid(), 'phase5-school-fee', invoice_id, 400.00, method_id, '2099-10-01'
  );
  perform public.record_daily_collection(
    gen_random_uuid(), 'feeding_receipt', 100.00, '2099-10-01', method_id
  );
  perform public.record_daily_collection(
    gen_random_uuid(), 'admission_receipt', 200.00, '2099-10-01', method_id
  );
  perform public.record_named_misc_receipt(
    gen_random_uuid(), 'Synthetic active income', 50.00, '2099-10-01', method_id
  );
  reversed_misc := public.record_named_misc_receipt(
    gen_random_uuid(), 'Synthetic corrected income', 25.00, '2099-10-01', method_id
  );
  perform public.reverse_misc_receipt(
    gen_random_uuid(), 'phase5-reversal', (reversed_misc->>'receiptId')::bigint,
    'Synthetic reporting correction'
  );
  perform public.record_expense(
    gen_random_uuid(), 'phase5-expense', expense_category_id, 80.00,
    '2099-10-01', 'Synthetic reporting expense', method_id
  );
  perform public.record_salary_record(gen_random_uuid(), staff_id, '2099-10-01');

  snapshot := public.get_financial_reporting_snapshot(
    '2099-10-01', '2099-10-31', null, null
  );
  summary := snapshot->'summary';

  if (summary->>'expectedFees')::numeric <> 1000.00
    or (summary->>'schoolFeesCollected')::numeric <> 400.00
    or (summary->>'outstandingFees')::numeric <> 600.00
    or (summary->>'feedingCollected')::numeric <> 100.00
    or (summary->>'admissionCollected')::numeric <> 200.00
    or (summary->>'miscellaneousCollected')::numeric <> 50.00
    or (summary->>'grossReceipts')::numeric <> 750.00
    or (summary->>'totalExpenses')::numeric <> 80.00
    or (summary->>'operatingNet')::numeric <> 670.00
    or (summary->>'salaryDeductions')::numeric <> 55.00
    or (summary->>'finalPosition')::numeric <> 670.00 then
    raise exception 'Financial summary reconciliation failed: %', summary;
  end if;
  if (summary->>'receiptCount')::integer <> 4
    or (summary->>'expenseCount')::integer <> 1
    or (summary->>'deductionCount')::integer <> 1
    or (summary->>'reversalCount')::integer <> 1 then
    raise exception 'Financial summary counts failed: %', summary;
  end if;
  if jsonb_array_length(snapshot->'daily') <> 31
    or jsonb_array_length(snapshot->'monthly') <> 1 then
    raise exception 'Daily or monthly reporting series failed';
  end if;
  if (
    select count(*) from public.financial_activity_report
    where business_date between '2099-10-01' and '2099-10-31'
  ) <> 7 then
    raise exception 'Normalized financial activity report failed';
  end if;
  if not exists (
    select 1
    from public.financial_activity_report
    where business_date between '2099-10-01' and '2099-10-31'
      and record_kind = 'deduction'
      and status = 'active'
      and amount = 55.00
  ) then
    raise exception 'Posted salary deduction is missing from the detailed report';
  end if;

  term_snapshot := public.get_financial_reporting_snapshot(
    '2099-10-01', '2099-10-31',
    (select id from public.academic_years where is_current limit 1),
    (select id from public.academic_terms where is_current limit 1)
  );
  if (term_snapshot->'summary'->>'expectedFees')::numeric
      <> current_setting('test.reporting_term_expected')::numeric + 1000.00
    or (term_snapshot->'summary'->>'outstandingFees')::numeric
      <> current_setting('test.reporting_term_outstanding')::numeric + 600.00 then
    raise exception 'Academic-term invoice scope failed';
  end if;

  select * into week_row
  from public.get_financial_weekly_totals('2099-10-01', '2099-10-31');
  if week_row.gross_receipts <> 750.00
    or week_row.expenses <> 80.00
    or week_row.salary_deductions <> 55.00
    or week_row.operating_net <> 670.00
    or week_row.final_position <> 670.00 then
    raise exception 'Weekly reporting reconciliation failed';
  end if;
end;
$$;

reset role;
delete from public.user_roles
where user_id = current_setting('test.reporting_actor')::uuid;
set local role authenticated;

do $$
begin
  begin
    perform public.get_financial_reporting_snapshot('2099-10-01', '2099-10-31');
    raise exception 'Revoked financial report permission remained cached';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.financial_activity_report) <> 0 then
    raise exception 'Revoked financial view permission remained cached';
  end if;
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  begin
    perform public.get_financial_reporting_snapshot('2099-10-01', '2099-10-31');
    raise exception 'Unauthenticated financial report access was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select 'PASS: Phase 5 totals, informational salary deductions, cash position, daily/monthly/weekly/term scope, normalized activity, reversals and access' as result;
rollback;
