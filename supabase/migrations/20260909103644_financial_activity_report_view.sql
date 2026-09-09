-- Phase 5 P5-01/P5-03: normalized, read-only financial activity for bounded reports.
-- security_invoker keeps every underlying RLS policy and permission check in force.

create view public.financial_activity_report
with (security_invoker = true)
as
select
  payment.id as record_id,
  'income'::text as record_kind,
  'School fees'::text as source,
  payment.payment_number as reference,
  receipt.receipt_number as document_reference,
  receipt.student_name_snapshot as person_name,
  'School fees'::text as category,
  invoice.class_name_snapshot as class_name,
  payment.amount,
  payment.business_date,
  payment.status,
  receipt.payment_method_name_snapshot as payment_method,
  invoice.academic_year_id,
  invoice.academic_term_id,
  invoice.class_id,
  invoice.student_id,
  null::bigint as staff_id,
  payment.payment_method_id,
  null::bigint as expense_category_id,
  null::bigint as deduction_type_id,
  payment.reversal_number as reversal_reference,
  payment.reversal_reason,
  payment.created_at
from public.payments payment
join public.invoices invoice on invoice.id = payment.invoice_id
left join public.receipts receipt on receipt.payment_id = payment.id

union all

select
  receipt.id,
  'income',
  'Feeding',
  receipt.receipt_number,
  receipt.receipt_number,
  coalesce(receipt.student_name_snapshot, 'Daily aggregate'),
  'Feeding',
  receipt.class_name_snapshot,
  receipt.amount,
  receipt.business_date,
  receipt.status,
  receipt.payment_method_name_snapshot,
  null::bigint,
  null::bigint,
  null::bigint,
  receipt.student_id,
  null::bigint,
  receipt.payment_method_id,
  null::bigint,
  null::bigint,
  receipt.reversal_number,
  receipt.reversal_reason,
  receipt.created_at
from public.feeding_receipts receipt

union all

select
  receipt.id,
  'income',
  'Admission',
  receipt.receipt_number,
  receipt.receipt_number,
  coalesce(receipt.student_name_snapshot, 'Daily aggregate'),
  'Admission',
  receipt.class_name_snapshot,
  receipt.amount,
  receipt.business_date,
  receipt.status,
  receipt.payment_method_name_snapshot,
  null::bigint,
  null::bigint,
  null::bigint,
  receipt.student_id,
  null::bigint,
  receipt.payment_method_id,
  null::bigint,
  null::bigint,
  receipt.reversal_number,
  receipt.reversal_reason,
  receipt.created_at
from public.admission_receipts receipt

union all

select
  receipt.id,
  'income',
  'Miscellaneous',
  receipt.receipt_number,
  receipt.receipt_number,
  coalesce(receipt.payer_name, 'Unattributed payer'),
  receipt.income_name_snapshot,
  null::text,
  receipt.amount,
  receipt.business_date,
  receipt.status,
  receipt.payment_method_name_snapshot,
  null::bigint,
  null::bigint,
  null::bigint,
  receipt.student_id,
  null::bigint,
  receipt.payment_method_id,
  null::bigint,
  null::bigint,
  receipt.reversal_number,
  receipt.reversal_reason,
  receipt.created_at
from public.misc_receipts receipt

union all

select
  expense.id,
  'expense',
  'Expenses',
  expense.expense_number,
  expense.expense_number,
  expense.description,
  expense.expense_category_name_snapshot,
  null::text,
  expense.amount,
  expense.business_date,
  expense.status,
  expense.payment_method_name_snapshot,
  null::bigint,
  null::bigint,
  null::bigint,
  null::bigint,
  null::bigint,
  expense.payment_method_id,
  expense.expense_category_id,
  null::bigint,
  expense.reversal_number,
  expense.reversal_reason,
  expense.created_at
from public.expenses expense

union all

select
  deduction.id,
  'deduction',
  'Salary deductions',
  deduction.deduction_number,
  deduction.deduction_number,
  salary.staff_name_snapshot,
  deduction.deduction_type_name_snapshot,
  null::text,
  deduction.amount,
  salary.payroll_month,
  deduction.status,
  null::text,
  null::bigint,
  null::bigint,
  null::bigint,
  null::bigint,
  salary.staff_id,
  null::bigint,
  null::bigint,
  deduction.deduction_type_id,
  deduction.reversal_number,
  deduction.reversal_reason,
  deduction.created_at
from public.salary_deductions deduction
join public.salary_records salary on salary.id = deduction.salary_record_id;

revoke all on public.financial_activity_report from public, anon, authenticated;
grant select on public.financial_activity_report to authenticated;

comment on view public.financial_activity_report is
  'Read-only normalized Phase 5 reporting surface. Underlying RLS remains in force through security_invoker.';
