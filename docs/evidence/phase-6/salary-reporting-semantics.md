# Salary-reporting semantics

**Date:** 10 September 2026  
**Decision:** Salary posting records a monthly calculation. It does not record payment to the employee.

## Implemented correction

- Preserved gross salary, configured payroll deductions, salary-register net pay, audit history, reversals, and the detailed payroll-deduction report.
- Excluded posted SSNIT and other payroll deductions from operating net, weekly final position, and recorded cash position.
- Kept the existing report contract stable: `salaryDeductions` remains available and `finalPosition` now equals `operatingNet` until an actual payment/remittance ledger exists.
- Reworded the financial summary to name a single deduction type directly. The current GHS 27.50 therefore appears as `SSNIT employee contribution (informational)` rather than the generic `Salary deductions`; multiple future types use the umbrella label `Payroll deductions (informational)`.
- Updated `Project Files/Financial Structure.md` and Plan decision D-13 so the business rule is not inferred differently later.

## Database evidence

Supabase MCP applied tracked migration `salary_deductions_reporting_semantics` to the authorized test-only project. The migration retains the original bounded, permission-gated aggregation as a private implementation and exposes corrected public reporting functions with fixed empty search paths and explicit `authenticated` grants.

A rollback-only focused proof created a synthetic GHS 500.00 monthly salary calculation. It confirmed:

- GHS 27.50 automatic SSNIT remained visible in the detailed activity report;
- GHS 27.50 remained visible in the weekly deduction total;
- operating net remained GHS 0.00 because no cash income or expense was recorded;
- recorded cash position remained GHS 0.00; and
- all synthetic records rolled back.

## Verification

- Focused SQL proof: passed.
- `supabase/tests/phase5-reporting.sql`: updated to assert informational-deduction semantics and the current configured-salary posting signature.
- Authenticated localhost report inspection showed GHS 27.50 as the SSNIT employee contribution, GHS 1,200.00 operating net, and the unchanged GHS 1,200.00 recorded cash position. The explanatory note rendered directly below, and SSNIT remained visible in the payroll-deduction breakdown.
- React Doctor changed-scope scan: 32 existing findings, unchanged from the recorded baseline; the corrected report component introduced no finding.
- `pnpm format`, `pnpm lint`, `pnpm typecheck`, the focused four-case period-summary test, and `pnpm build`: passed.
- Post-migration security verification confirmed fixed empty search paths, no anonymous execution, authenticated access only to the two public permission-gated functions, and no new security-advisor finding.

No E2E suite was added or run. At the time of this correction, a real salary-payment or SSNIT-remittance ledger remained outside scope. The Chief Engineer subsequently authorized the focused cash workflow recorded in [Salary cash workflow](salary-cash-workflow.md); bank files, employer contributions, PAYE, and payroll-liability accounting remain excluded.
