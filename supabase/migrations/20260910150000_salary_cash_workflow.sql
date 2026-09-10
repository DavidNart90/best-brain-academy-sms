-- Salary cash workflow: salary posting remains a calculation snapshot. Only
-- employee net-salary payments and SSNIT remittances create cash expenses.

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
      'salary_payment', 'ssnit_remittance',
      'library_collection', 'library_collection_reversal'
    )
  );

alter table public.expense_categories
  add column is_system boolean not null default false;

create or replace function private.protect_system_expense_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Migrations have no authenticated caller and may establish system rows.
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_system := false;
  elsif old.is_system then
    new.code := old.code;
    new.name := old.name;
    new.sort_order := old.sort_order;
    new.status := 'active';
    new.is_system := true;
  else
    new.is_system := false;
  end if;
  return new;
end;
$$;
revoke all on function private.protect_system_expense_category()
  from public, anon, authenticated;

create trigger expense_categories_system_guard
before insert or update on public.expense_categories
for each row execute function private.protect_system_expense_category();

update public.expense_categories
set is_system = true,
    status = 'active'
where code = 'SALARIES';

insert into public.expense_categories
  (code, name, sort_order, status, is_system)
values
  ('SSNIT_REMITTANCE', 'SSNIT remittance', 130, 'active', true)
on conflict (code) do update
set status = 'active',
    is_system = true;

alter table public.expenses
  add column notes text check (
    notes is null or char_length(btrim(notes)) between 1 and 500
  ),
  add column payroll_cash_kind text check (
    payroll_cash_kind in ('salary_payment', 'ssnit_remittance')
  ),
  add column salary_record_id bigint references public.salary_records(id) on delete restrict,
  add column salary_deduction_id bigint references public.salary_deductions(id) on delete restrict,
  add constraint expenses_payroll_cash_link_check check (
    (payroll_cash_kind is null and salary_record_id is null and salary_deduction_id is null)
    or
    (payroll_cash_kind = 'salary_payment' and salary_record_id is not null
      and salary_deduction_id is null)
    or
    (payroll_cash_kind = 'ssnit_remittance' and salary_record_id is not null
      and salary_deduction_id is not null)
  );

create index expenses_salary_cash_idx
  on public.expenses (salary_record_id, payroll_cash_kind, status, id)
  where salary_record_id is not null;
create index expenses_salary_deduction_cash_idx
  on public.expenses (salary_deduction_id, status, id)
  where salary_deduction_id is not null;

create or replace function private.preserve_expense_payroll_cash_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.payroll_cash_kind := old.payroll_cash_kind;
  new.salary_record_id := old.salary_record_id;
  new.salary_deduction_id := old.salary_deduction_id;
  new.notes := old.notes;
  return new;
end;
$$;
revoke all on function private.preserve_expense_payroll_cash_link()
  from public, anon, authenticated;

create or replace function private.validate_expense_payroll_cash_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_record record;
  linked_salary_status text;
begin
  select code, is_system into category_record
  from public.expense_categories
  where id = new.expense_category_id;

  if not found then
    raise exception using errcode = '23503', message = 'The expense category is unavailable.';
  end if;

  if new.payroll_cash_kind is null then
    if category_record.is_system
      and (tg_op = 'INSERT' or new.expense_category_id is distinct from old.expense_category_id) then
      raise exception using errcode = '23514',
        message = 'Record salary and SSNIT cash through the salary workflow.';
    end if;
    return new;
  end if;

  select status into linked_salary_status
  from public.salary_records
  where id = new.salary_record_id;
  if linked_salary_status is null then
    raise exception using errcode = '23503', message = 'The salary record is unavailable.';
  end if;
  if tg_op = 'INSERT' and linked_salary_status <> 'active' then
    raise exception using errcode = '23514', message = 'Only an active salary record can receive cash activity.';
  end if;

  if new.payroll_cash_kind = 'salary_payment' then
    if category_record.code <> 'SALARIES' or new.salary_deduction_id is not null then
      raise exception using errcode = '23514', message = 'The salary payment link is invalid.';
    end if;
  elsif new.payroll_cash_kind = 'ssnit_remittance' then
    if category_record.code <> 'SSNIT_REMITTANCE' or not exists (
      select 1
      from public.salary_deductions deduction
      join public.salary_deduction_types deduction_type
        on deduction_type.id = deduction.deduction_type_id
      where deduction.id = new.salary_deduction_id
        and deduction.salary_record_id = new.salary_record_id
        and deduction.status = 'active'
        and deduction_type.code = 'SSNIT'
    ) then
      raise exception using errcode = '23514', message = 'The SSNIT remittance link is invalid.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_expense_payroll_cash_link()
  from public, anon, authenticated;

create trigger expenses_payroll_cash_preserve
before update on public.expenses
for each row execute function private.preserve_expense_payroll_cash_link();
create trigger expenses_payroll_cash_validate
before insert or update on public.expenses
for each row execute function private.validate_expense_payroll_cash_link();

create or replace function private.validate_salary_cash_dependencies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid_salary numeric(14, 2);
  active_deductions numeric(14, 2);
begin
  if tg_table_name = 'salary_records' then
    if old.status = 'active' and new.status = 'reversed' and exists (
      select 1 from public.expenses
      where salary_record_id = old.id and status = 'active'
    ) then
      raise exception using errcode = '23514',
        message = 'Reverse all active salary payments and SSNIT remittances first.';
    end if;
  elsif tg_table_name = 'salary_deductions' then
    if tg_op = 'INSERT' then
      perform 1 from public.salary_records where id = new.salary_record_id for update;
      select coalesce(sum(amount), 0)::numeric(14, 2) into active_deductions
      from public.salary_deductions
      where salary_record_id = new.salary_record_id and status = 'active';
      select coalesce(sum(amount), 0)::numeric(14, 2) into paid_salary
      from public.expenses
      where salary_record_id = new.salary_record_id
        and payroll_cash_kind = 'salary_payment'
        and status = 'active';
      if paid_salary > (
        select gross_salary - active_deductions - new.amount
        from public.salary_records where id = new.salary_record_id
      ) then
        raise exception using errcode = '23514',
          message = 'This deduction would reduce net salary below the amount already paid.';
      end if;
    elsif old.status = 'active' and new.status = 'reversed' and exists (
      select 1 from public.expenses
      where salary_deduction_id = old.id
        and payroll_cash_kind = 'ssnit_remittance'
        and status = 'active'
    ) then
      raise exception using errcode = '23514',
        message = 'Reverse active SSNIT remittances before reversing this deduction.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_salary_cash_dependencies()
  from public, anon, authenticated;

create trigger salary_records_cash_dependency_guard
before update on public.salary_records
for each row execute function private.validate_salary_cash_dependencies();
create trigger salary_deductions_cash_dependency_guard
before insert or update on public.salary_deductions
for each row execute function private.validate_salary_cash_dependencies();

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
  deduction_record record;
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
    select deduction.id, deduction.amount into deduction_record
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
    where salary_deduction_id = deduction_record.id
      and payroll_cash_kind = 'ssnit_remittance'
      and status = 'active';
    outstanding := deduction_record.amount - already_recorded;
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
    case when transaction_kind = 'ssnit_remittance' then deduction_record.id else null end,
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

-- Existing expense posting now retains its already accepted optional notes.
create or replace function public.record_expense(
  request_key uuid,
  request_fingerprint text,
  target_expense_category_id bigint,
  expense_amount numeric,
  target_business_date date,
  target_description text,
  target_payment_method_id bigint,
  target_external_reference text default null,
  target_attachment_path text default null,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  category_record record;
  payment_method record;
  allocated_expense_number text;
  expense_id bigint;
  request_result jsonb;
  result jsonb;
begin
  request_fingerprint := jsonb_build_array(
    target_expense_category_id, expense_amount, target_business_date,
    target_description, target_payment_method_id, target_external_reference,
    target_attachment_path, target_notes
  )::text;
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(coalesce(target_description, '')), '') is null then
    raise exception using errcode = '22023', message = 'A description is required.';
  end if;
  if expense_amount is null or expense_amount <= 0 or expense_amount >= 1000000000000
    or expense_amount <> round(expense_amount, 2) then
    raise exception using errcode = '22023', message = 'The expense amount must be greater than zero.';
  end if;
  if target_business_date is null then
    raise exception using errcode = '22023', message = 'A business date is required.';
  end if;

  request_result := private.persist_finance_request(
    request_key, 'expense', actor_id, request_fingerprint,
    jsonb_build_object(
      'status', 'pending', 'categoryId', target_expense_category_id,
      'amount', expense_amount, 'businessDate', target_business_date::text
    )
  );
  if request_result->>'status' is distinct from 'pending' then
    return request_result;
  end if;

  select id, name, is_system into category_record
  from public.expense_categories
  where id = target_expense_category_id and status = 'active';
  if not found then
    raise exception using errcode = '23503', message = 'The expense category is unavailable.';
  end if;
  if category_record.is_system then
    raise exception using errcode = '23514',
      message = 'Record salary and SSNIT cash through the salary workflow.';
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

  allocated_expense_number := private.allocate_document_number('EXP');
  insert into public.expenses (
    expense_number, expense_category_id, amount, business_date, description,
    payment_method_id, external_reference, attachment_path, notes,
    created_by, updated_by
  ) values (
    allocated_expense_number, target_expense_category_id, expense_amount,
    target_business_date, btrim(target_description), target_payment_method_id,
    nullif(btrim(coalesce(target_external_reference, '')), ''),
    nullif(btrim(coalesce(target_attachment_path, '')), ''),
    nullif(btrim(coalesce(target_notes, '')), ''), actor_id, actor_id
  ) returning id into expense_id;

  result := jsonb_build_object(
    'expenseId', expense_id,
    'expenseNumber', allocated_expense_number,
    'categoryId', target_expense_category_id,
    'amount', expense_amount,
    'businessDate', target_business_date::text,
    'status', 'posted'
  );
  return private.persist_finance_request(
    request_key, 'expense', actor_id, request_fingerprint, result
  );
end;
$$;

revoke all on function public.record_expense(
  uuid, text, bigint, numeric, date, text, bigint, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_expense(
  uuid, text, bigint, numeric, date, text, bigint, text, text, text
) to authenticated;

create or replace view public.salary_cash_positions
with (security_invoker = true)
as
with salary_payments as (
  select salary_record_id, sum(amount)::numeric(14, 2) as paid
  from public.expenses
  where payroll_cash_kind = 'salary_payment' and status = 'active'
  group by salary_record_id
),
ssnit_due as (
  select deduction.salary_record_id, sum(deduction.amount)::numeric(14, 2) as due
  from public.salary_deductions deduction
  join public.salary_deduction_types deduction_type
    on deduction_type.id = deduction.deduction_type_id
  where deduction.status = 'active' and deduction_type.code = 'SSNIT'
  group by deduction.salary_record_id
),
ssnit_remittances as (
  select salary_record_id, sum(amount)::numeric(14, 2) as remitted
  from public.expenses
  where payroll_cash_kind = 'ssnit_remittance' and status = 'active'
  group by salary_record_id
)
select
  salary.id as salary_record_id,
  salary.net_salary,
  coalesce(payment.paid, 0)::numeric(14, 2) as salary_paid,
  case when salary.status = 'reversed' then 0
    else greatest(salary.net_salary - coalesce(payment.paid, 0), 0)
  end::numeric(14, 2) as salary_outstanding,
  case
    when salary.status = 'reversed' then 'reversed'
    when coalesce(payment.paid, 0) = 0 then 'unpaid'
    when coalesce(payment.paid, 0) < salary.net_salary then 'partial'
    else 'paid'
  end as salary_payment_status,
  coalesce(ssnit.due, 0)::numeric(14, 2) as ssnit_due,
  coalesce(remittance.remitted, 0)::numeric(14, 2) as ssnit_remitted,
  case when salary.status = 'reversed' then 0
    else greatest(coalesce(ssnit.due, 0) - coalesce(remittance.remitted, 0), 0)
  end::numeric(14, 2) as ssnit_outstanding,
  case
    when salary.status = 'reversed' then 'reversed'
    when coalesce(ssnit.due, 0) = 0 then 'not_due'
    when coalesce(remittance.remitted, 0) = 0 then 'due'
    when coalesce(remittance.remitted, 0) < coalesce(ssnit.due, 0) then 'partial'
    else 'remitted'
  end as ssnit_status
from public.salary_records salary
left join salary_payments payment on payment.salary_record_id = salary.id
left join ssnit_due ssnit on ssnit.salary_record_id = salary.id
left join ssnit_remittances remittance on remittance.salary_record_id = salary.id;

revoke all on public.salary_cash_positions from public, anon, authenticated;
grant select on public.salary_cash_positions to authenticated;
