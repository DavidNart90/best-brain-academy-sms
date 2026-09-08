-- P3 cashflow regression. MCP only, authorized test project; all fixtures roll back.
begin;
do $$
declare actor uuid:=gen_random_uuid(); session uuid:=gen_random_uuid(); student bigint; invoice bigint;
begin
  insert into auth.users(id,email) values(actor,'finance-test-'||actor::text||'@example.invalid');
  update public.profiles set status='active',must_change_password=false,display_name='Synthetic Accountant' where id=actor;
  insert into public.user_roles(user_id,role_code) values(actor,'ACCOUNTANT');
  insert into auth.sessions(id,user_id,not_after) values(session,actor,now()+interval '10 minutes');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',session)::text,true);
  insert into public.students(admission_number,first_name,last_name,gender,admission_date,created_by,updated_by,has_disability,religious_denomination)
    values('SYN-'||upper(replace(actor::text,'-','')),'Current','Name','female',current_date,actor,actor,false,'Synthetic unspecified') returning id into student;
  insert into public.invoices(invoice_number,student_id,academic_year_id,academic_term_id,class_id,school_location_id,
    student_name_snapshot,admission_number_snapshot,class_name_snapshot,location_name_snapshot,subtotal,total,created_by,updated_by)
    values('SYN-INV-'||replace(actor::text,'-',''),student,
      (select id from public.academic_years where is_current limit 1),
      (select id from public.academic_terms where is_current limit 1),
      (select id from public.classes where status='active' order by id limit 1),
      (select id from public.school_locations where status='active' order by id limit 1),
      'Original Student Snapshot','SYN-SNAPSHOT','Original Class','Original Location',1000.01,1000.01,actor,actor)
    returning id into invoice;
  perform set_config('test.finance_invoice',invoice::text,true);
  perform set_config('test.finance_actor',actor::text,true);
end $$;
set local role authenticated;
do $$
declare
  invoice bigint:=current_setting('test.finance_invoice')::bigint;
  method bigint; reference_method bigint; category bigint;
  key1 uuid:=gen_random_uuid(); key2 uuid:=gen_random_uuid(); daily_key uuid:=gen_random_uuid();
  misc_key uuid:=gen_random_uuid(); expense_key uuid:=gen_random_uuid();
  r1 jsonb; r2 jsonb; daily jsonb; misc jsonb; expense jsonb;
  before_count bigint; before_audit bigint;
begin
  select id into method from public.payment_methods where status='active' and not requires_reference order by id limit 1;
  select id into reference_method from public.payment_methods where status='active' and requires_reference order by id limit 1;
  select id into category from public.expense_categories where status='active' order by id limit 1;
  r1:=public.record_school_fee_payment(key1,'ignored',invoice,500.01,method,'2099-01-01');
  if (r1->>'remainingOutstanding')::numeric<>500 then raise exception 'Partial balance failed'; end if;
  if not exists(select 1 from public.receipts where id=(r1->>'receiptId')::bigint
    and student_name_snapshot='Original Student Snapshot' and class_name_snapshot='Original Class'
    and collected_by_snapshot='Synthetic Accountant') then raise exception 'Receipt snapshots failed'; end if;
  if public.record_school_fee_payment(key1,'different client label',invoice,500.01,method,'2099-01-01')<>r1 then raise exception 'Partial replay failed'; end if;
  begin
    perform public.record_school_fee_payment(key1,'ignored',invoice,499,method,'2099-01-01');
    raise exception 'Changed amount replay allowed';
  exception when unique_violation then null; end;
  begin
    perform public.record_school_fee_payment(gen_random_uuid(),'x',invoice,500.01,method,'2099-01-01');
    raise exception 'Overpayment allowed';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.record_school_fee_payment(gen_random_uuid(),'x',invoice,0.001,method,'2099-01-01');
    raise exception 'Extra decimals allowed';
  exception when invalid_parameter_value then null; end;
  r2:=public.record_school_fee_payment(key2,'x',invoice,500,method,'2099-01-01');
  if (select outstanding from public.invoices where id=invoice)<>0 then raise exception 'Full balance failed'; end if;
  if public.record_school_fee_payment(key2,'x',invoice,500,method,'2099-01-01')<>r2 then raise exception 'Full replay failed'; end if;
  if (select count(*) from public.payments where invoice_id=invoice)<>2 then raise exception 'Replay duplicated payment'; end if;
  perform public.reverse_school_fee_payment(gen_random_uuid(),'reverse-test',(r2->>'paymentId')::bigint,'Synthetic test reversal');
  if (select outstanding from public.invoices where id=invoice)<>500 then raise exception 'Reversal balance failed'; end if;
  select count(*) into before_count from public.payments where invoice_id=invoice;
  select count(*) into before_audit from public.audit_logs;
  -- Receipt/payments and audit rows must roll back if reference validation fails.
  begin
    perform public.record_school_fee_payment(gen_random_uuid(),'x',invoice,1,reference_method,'2099-01-01');
    raise exception 'Missing method reference allowed';
  exception when check_violation then null; end;
  if (select count(*) from public.payments where invoice_id=invoice)<>before_count then raise exception 'Failed payment left rows'; end if;
  if (select count(*) from public.audit_logs)<>before_audit then raise exception 'Failed payment left audit'; end if;

  daily:=public.record_daily_collection(daily_key,'feeding_receipt',125.50,'2099-01-01',method);
  if not exists(select 1 from public.feeding_receipts where id=(daily->>'receiptId')::bigint
    and student_id is null and collection_scope='daily_total' and amount=125.50) then raise exception 'Daily feeding total failed'; end if;
  if public.record_daily_collection(daily_key,'feeding_receipt',125.50,'2099-01-01',method)<>daily then raise exception 'Daily replay failed'; end if;
  begin
    perform public.record_daily_collection(gen_random_uuid(),'feeding_receipt',125.50,'2099-01-01',method);
    raise exception 'Duplicate daily total allowed';
  exception when unique_violation then null; end;
  begin
    perform public.record_daily_collection(daily_key,'feeding_receipt',125.50,'2099-01-01',method,null,'Changed notes');
    raise exception 'Changed notes replay allowed';
  exception when unique_violation then null; end;
  perform public.reverse_feeding_receipt(gen_random_uuid(),'x',(daily->>'receiptId')::bigint,'Synthetic correction');
  perform public.record_daily_collection(gen_random_uuid(),'feeding_receipt',150,'2099-01-01',method);
  perform public.record_daily_collection(gen_random_uuid(),'admission_receipt',250,'2099-01-01',method);
  begin
    perform public.record_daily_collection(gen_random_uuid(),'admission_receipt',-1,'2099-01-02',method);
    raise exception 'Negative daily total allowed';
  exception when invalid_parameter_value then null; end;

  misc:=public.record_named_misc_receipt(misc_key,'Synthetic exercise book sales',25.25,'2099-01-01',method);
  if not exists(select 1 from public.misc_receipts where id=(misc->>'receiptId')::bigint
    and misc_income_category_id is null and description='Synthetic exercise book sales') then raise exception 'Named income failed'; end if;
  if public.record_named_misc_receipt(misc_key,'Synthetic exercise book sales',25.25,'2099-01-01',method)<>misc then raise exception 'Named income replay failed'; end if;
  expense:=public.record_expense(expense_key,'x',category,12.25,'2099-01-01','Synthetic other expense name',method);
  if public.record_expense(expense_key,'x',category,12.25,'2099-01-01','Synthetic other expense name',method)<>expense then raise exception 'Expense replay failed'; end if;
  perform public.void_expense(gen_random_uuid(),'x',(expense->>'expenseId')::bigint,'Synthetic void');
  begin
    update public.feeding_receipts set amount=1 where id=(daily->>'receiptId')::bigint;
    raise exception 'Direct posted mutation allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Different actor cannot replay another operator's request key.
do $$
declare key uuid; actor uuid:=gen_random_uuid();
begin
  select request_key into key from private.finance_requests where actor_id=current_setting('test.finance_actor')::uuid limit 1;
  insert into auth.users(id,email) values(actor,'finance-denied-'||actor::text||'@example.invalid');
  begin
    perform private.persist_finance_request(key,'school_fee_payment',actor,'x','{}'::jsonb);
    raise exception 'Cross-actor replay allowed';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
do $$
begin
  perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
  begin
    perform public.record_daily_collection(gen_random_uuid(),'feeding_receipt',1,'2099-01-01',1);
    raise exception 'Unauthenticated posting allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: partial/full payment, snapshots, replay, changed payload, overpayment, decimals, daily aggregates, duplicate prevention, reversals, named income, expenses, rollback and access boundaries' as result;
rollback;
