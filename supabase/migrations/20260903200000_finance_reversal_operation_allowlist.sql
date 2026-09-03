-- P3-05 compatibility migration: allow reversal operations in the shared request ledger.
-- The reversal RPCs are defined in the preceding 20260903190000 migration.

alter table private.finance_requests
  drop constraint if exists finance_requests_operation_check;
alter table private.finance_requests
  add constraint finance_requests_operation_check check (
    operation in (
      'school_fee_payment', 'feeding_receipt', 'admission_receipt', 'misc_receipt', 'expense',
      'school_fee_payment_reversal', 'feeding_receipt_reversal',
      'admission_receipt_reversal', 'misc_receipt_reversal', 'expense_void'
    )
  );
