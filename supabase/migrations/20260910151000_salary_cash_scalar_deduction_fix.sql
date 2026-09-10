-- Use scalar SSNIT variables so the salary-payment branch never references an
-- unassigned record variable.

create or replace function public.record_salary_cash_transaction(
  request_key uuid,
  target_salary_record_id bigint,
  transaction_kind text,
  transaction_amount numeric,
  target_business_date date,
  target_payment_method_id bigint,
  target_external_reference text default null,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  salary_record record;
  ssnit_deduction_id bigint;
  ssnit_deduction_amount numeric(14, 2);
  category_record record;
  payment_method record;
  already_recorded numeric(14, 2);
  outstanding numeric(14, 2);
  allocated_expense_number text;
  expense_id bigint;
  operation_name text;
  description_text text;
  fingerprint text;
  request_result jsonb;
  result jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'You cannot record salary cash activity.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if transaction_kind not in ('salary_payment', 'ssnit_remittance') then
    raise exception using errcode = '22023', message = 'Choose salary payment or SSNIT remittance.';
  end if;
  if transaction_amount is null or transaction_amount <= 0
    or transaction_amount >= 1000000000000
    or transaction_amount <> round(transaction_amount, 2) then
    raise exception using errcode = '22023', message = 'The amount must be greater than zero with no more than two decimals.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A payment date is required.';
  end if;
  if target_notes is not null and char_length(btrim(target_notes)) > 500 then
    raise exception using errcode = '22023', message = 'Notes cannot exceed 500 characters.';
  end if;

  operation_name := transaction_kind;
  fingerprint := jsonb_build_array(
    target_salary_record_id, transaction_kind, transaction_amount,
    target_business_date, target_payment_method_id,
    nullif(btrim(coalesce(target_external_reference, '')), ''),
    nullif(btrim(coalesce(target_notes, '')), '')
  )::text;
  request_result := private.persist_finance_request(
    request_key, operation_name, actor_id, fingerprint,
    jsonb_build_object('status', 'pending', 'salaryRecordId', target_salary_record_id)
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
  end if;

  select * into salary_record
  from public.salary_records
  where id = target_salary_record_id
  for update;
  if not found or salary_record.status <> 'active' then
    raise exception using errcode = '23514', message = 'Choose an active salary record.';
  end if;

  select id, name, requires_reference into payment_method
  from public.payment_methods
  where id = target_payment_method_id and status = 'active';
  if not found then
    raise exception using errcode = '23503', message = 'The payment method is unavailable.';
  end if;
  if payment_method.requires_reference
    and nullif(btrim(coalesce(target_external_reference, '')), '') is null then
    raise exception using errcode = '23514', message = 'This payment method requires an external reference.';
  end if;

  if transaction_kind = 'salary_payment' then
    select id, name into category_record
    from public.expense_categories
    where code = 'SALARIES' and status = 'active' and is_system;
    if not found then
      raise exception using errcode = '23503', message = 'The salary payment category is unavailable.';
    end if;

    select coalesce(sum(amount), 0)::numeric(14, 2) into already_recorded
    from public.expenses
    where salary_record_id = salary_record.id
      and payroll_cash_kind = 'salary_payment'
      and status = 'active';
    outstanding := salary_record.net_salary - already_recorded;
    description_text := concat(
      'Net salary payment · ', salary_record.staff_name_snapshot,
      ' · ', to_char(salary_record.payroll_month, 'FMMonth YYYY')
    );
  else
    select deduction.id, deduction.amount
    into ssnit_deduction_id, ssnit_deduction_amount
    from public.salary_deductions deduction
    join public.salary_deduction_types deduction_type
      on deduction_type.id = deduction.deduction_type_id
    where deduction.salary_record_id = salary_record.id
      and deduction.status = 'active'
      and deduction_type.code = 'SSNIT'
    order by deduction.id
    limit 1;
    if not found then
      raise exception using errcode = '23503', message = 'This salary record has no active SSNIT contribution.';
    end if;

    select id, name into category_record
    from public.expense_categories
    where code = 'SSNIT_REMITTANCE' and status = 'active' and is_system;
    if not found then
      raise exception using errcode = '23503', message = 'The SSNIT remittance category is unavailable.';
    end if;

    select coalesce(sum(amount), 0)::numeric(14, 2) into already_recorded
    from public.expenses
    where salary_deduction_id = ssnit_deduction_id
      and payroll_cash_kind = 'ssnit_remittance'
      and status = 'active';
    outstanding := ssnit_deduction_amount - already_recorded;
    description_text := concat(
      'SSNIT employee contribution remittance · ', salary_record.staff_name_snapshot,
      ' · ', to_char(salary_record.payroll_month, 'FMMonth YYYY')
    );
  end if;

  if outstanding <= 0 then
    raise exception using errcode = '23505', message = case transaction_kind
      when 'salary_payment' then 'This net salary is already fully paid.'
      else 'This SSNIT contribution is already fully remitted.'
    end;
  end if;
  if transaction_amount > outstanding then
    raise exception using errcode = '23514', message = case transaction_kind
      when 'salary_payment' then 'The payment exceeds the outstanding net salary.'
      else 'The remittance exceeds the outstanding SSNIT contribution.'
    end;
  end if;

  allocated_expense_number := private.allocate_document_number('EXP');
  insert into public.expenses (
    expense_number, expense_category_id, amount, business_date, description,
    payment_method_id, external_reference, notes, payroll_cash_kind,
    salary_record_id, salary_deduction_id, created_by, updated_by
  ) values (
    allocated_expense_number, category_record.id, transaction_amount,
    target_business_date, description_text, payment_method.id,
    nullif(btrim(coalesce(target_external_reference, '')), ''),
    nullif(btrim(coalesce(target_notes, '')), ''), transaction_kind,
    salary_record.id,
    case when transaction_kind = 'ssnit_remittance' then ssnit_deduction_id else null end,
    actor_id, actor_id
  ) returning id into expense_id;

  outstanding := outstanding - transaction_amount;
  result := jsonb_build_object(
    'status', 'posted',
    'expenseId', expense_id,
    'expenseNumber', allocated_expense_number,
    'salaryRecordId', salary_record.id,
    'transactionKind', transaction_kind,
    'amount', transaction_amount,
    'outstanding', outstanding,
    'businessDate', target_business_date::text
  );
  return private.persist_finance_request(
    request_key, operation_name, actor_id, fingerprint, result
  );
end;
$$;

revoke all on function public.record_salary_cash_transaction(
  uuid, bigint, text, numeric, date, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.record_salary_cash_transaction(
  uuid, bigint, text, numeric, date, bigint, text, text
) to authenticated;
