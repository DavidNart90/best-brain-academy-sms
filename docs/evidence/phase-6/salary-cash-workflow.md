# Salary Cash Workflow Verification

**Date:** 10 September 2026  
**Scope:** P6-S01 / D-13  
**Target:** Authorized test-only Supabase project `cefwopisbgfctzdloequ`

## Delivered behavior

- Salary posting remains calculation-only: gross salary, automatic/configured deductions, and net salary are snapshotted without marking the employee paid or reducing cash.
- Employee payments apply only to the posted net salary. Partial and full payments produce Unpaid, Partially Paid, and Paid positions from active linked transactions.
- SSNIT remittances apply only to the posted 5.5% employee contribution. Partial and full remittances produce Due, Partially Remitted, and Remitted positions independently of employee payment.
- Each real cash transaction creates exactly one linked entry in the existing expense ledger, so current dashboard, cashflow, and report expense totals change once without a second payroll ledger.
- Salaries and SSNIT remittance are protected system expense categories and are excluded from the generic expense form. Payroll cash must be recorded through the salary workflow.
- Active payments/remittances require reversal rather than deletion. Dependent cash entries prevent salary or SSNIT deduction reversal until the cash entry is reversed.
- Employer SSNIT, PAYE, liability accounting, approval runs, bank files, and payslips were not added.

## Database evidence

Supabase MCP applied tracked migrations `salary_cash_workflow` and `salary_cash_scalar_deduction_fix`. The second is an immutable forward correction: the first rollback proof exposed an unassigned SSNIT-record variable in the employee-payment branch, the transaction failed without persisting data, and the forward migration replaced it with the scalar deduction ID/amount used by the corrected function.

`supabase/tests/salary-cash-workflow.sql` passed as one rollback-only focused proof and left zero `TEST-*` salary or expense rows. It verified:

- GHS 500.00 gross produces GHS 472.50 net and GHS 27.50 SSNIT due;
- initial Unpaid/Due positions;
- partial then complete employee payment and SSNIT remittance;
- identical retry returns the original transaction without duplication;
- overpayment is rejected;
- a deduction cannot reduce net salary below the amount already paid;
- salary and SSNIT reversals are blocked while dependent cash is active;
- active employee payment plus remittance contributes exactly GHS 500.00 to report expenses;
- reversing both cash entries restores the outstanding balances and permits salary reversal.

The deployed RPC is `SECURITY DEFINER` by design, has a fixed empty search path, locks the salary row, checks `finance.transactions.manage` against the active session, denies anonymous execution, and grants execution only to authenticated users. `expenses`, `salary_records`, and `salary_deductions` have RLS; `salary_cash_positions` is a `security_invoker` view. Anonymous SELECT is absent from all four, while authenticated reads remain governed by the underlying policies.

The security advisor's authenticated-definer warning is expected for this public transactional RPC and is mitigated by the verified in-function session/permission boundary described above ([advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)). The two new payroll lookup indexes appear in the test project's unused-index informational list because no payroll cash transaction is retained; they match the status/record predicates exercised by the workflow and focused proof, so removing them before representative traffic would be premature ([unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)). Existing private-table and leaked-password-protection notices are unchanged release decisions outside this slice.

## Application and UI evidence

- Salary register totals now distinguish Gross salary, Net salary due, Salary paid, and Salary outstanding, with a separate SSNIT due/remitted/outstanding period summary.
- Each record row exposes independent employee-payment and SSNIT-remittance statuses.
- Salary detail states explicitly that posting did not pay the employee, then presents separate Employee payment and SSNIT remittance panels with exact outstanding defaults, business date, configured payment method, conditional external reference, notes, and linked reversible cash history.
- Authenticated localhost inspection verified the September register at GHS 1,700.00 gross, GHS 1,606.50 net due, GHS 0.00 paid, GHS 1,606.50 outstanding, and GHS 93.50 SSNIT due/outstanding. The GHS 500.00 record displayed GHS 472.50 employee outstanding and GHS 27.50 SSNIT outstanding with separate disabled-until-method-selected actions.
- In the original single-record workflow check, the August 2026 register remained at zero records and no employee payment or SSNIT remittance was recorded. The later bulk-workflow verification created 15 September calculations without recording cash; that separate event and its pending data decision are documented in [Salary bulk workflow verification](salary-bulk-workflow.md).
- Both inspected screens had no horizontal document overflow and no browser warning/error; only development HMR/React DevTools informational logs were present.

## Quality gates

- `pnpm format` — passed.
- `pnpm lint` — passed with zero warnings.
- `pnpm typecheck` — passed.
- `pnpm build` — passed; all application routes compiled.
- React Doctor changed-scope scan — 28 pre-existing findings and no finding in the changed salary files after extracting focused salary components.
- Supabase focused rollback proof — passed.

No broad unit suite or E2E suite was added or run. Port 31000 remained closed; the localhost development server was restored on port 3000 after production-build verification.
