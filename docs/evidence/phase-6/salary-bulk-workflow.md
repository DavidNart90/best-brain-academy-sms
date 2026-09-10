# Salary Bulk Workflow Verification

**Date:** 10 September 2026  
**Scope:** P6-S01 / D-13  
**Target:** Authorized test-only Supabase project `cefwopisbgfctzdloequ`

## Delivered behavior

- The salary register now presents one restrained two-step monthly workflow: **Post all salaries** and **Dispatch all salaries**.
- Post all creates only missing monthly salary calculations from active effective-dated salary configurations. It does not mark anyone paid, create an expense, or reduce cash.
- Dispatch all becomes available only when every eligible configured salary has been posted. It pays each active salary record's exact outstanding net pay and creates one linked outgoing expense per employee.
- SSNIT stays separate from employee salary dispatch. The bulk action neither pays nor remits SSNIT.
- Both actions show the employee count and exact total before confirmation. Completed records are skipped safely, identical retry keys return the original result, and one failed item rolls back the entire batch.
- The individual partial/full employee-payment and SSNIT-remittance controls remain available on salary detail pages.

## Database evidence

Supabase MCP applied tracked migrations `salary_bulk_workflow` and `salary_bulk_dispatch_guard`. The first adds `post_salary_batch` and `dispatch_salary_batch`, extends the finance request-operation allowlist, and aligns single-record salary posting with the same month-scoped advisory lock used by the bulk workflow. The forward guard migration also enforces at the database boundary that all active configured staff have salary calculations before dispatch can begin.

`supabase/tests/salary-bulk-workflow.sql` passed as one rollback-only focused proof. It verified rejection of dispatch against an incompletely posted roster, exact configured/post/skip totals, a pre-existing partial payment, replay without duplicate salary or expense rows, rejected invalid payment references with no residue, full dispatch of exact remaining net salary, SSNIT remaining due, and anonymous denial. The synthetic test rows were rolled back; follow-up inspection found zero synthetic staff and zero future salary records.

The two RPCs:

- require the active session to hold `finance.transactions.manage`;
- deny anonymous execution and grant RPC execution only to authenticated users;
- use a fixed empty search path plus 5-second lock and 30-second statement timeouts;
- lock the month and affected rows in deterministic order;
- use the existing idempotent finance-request records and existing salary-payment core;
- preserve one database transaction for the entire batch.

The Supabase security advisor reports both authenticated `SECURITY DEFINER` functions as expected. They are intentionally public transactional entry points; the active-session permission check, denied anonymous grant, fixed search path, and focused negative proof are the compensating boundary ([advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)). Existing private-table and leaked-password-protection notices are unchanged. The performance advisor reported only existing informational unindexed-foreign-key and unused-index findings; this migration added no index.

## Application and UI evidence

- Authenticated desktop inspection confirmed the monthly counts/totals, the post confirmation language, dispatch prerequisites, conditional bank-reference validation, and all-or-nothing warning.
- At 390 × 844, the two steps stack within the salary register without horizontal overflow. The active action remains visually distinct while completed/blocked states remain clear.
- Browser warning and error logs were empty. The viewport was restored after the responsive check.
- The August 2026 salary batch remains unposted: remote inspection shows zero active August salary records.

## Verification data note

During authenticated UI verification, a completed `salary_batch_post` request under the signed-in test account created the 15 missing September 2026 salary calculations and skipped the three that already existed. Remote evidence records request `ae766f10-22b4-4749-bb5d-1fdbf03fbd70`, GHS 10,750.00 additional gross, GHS 591.25 deductions, and GHS 10,158.75 additional net. The September register now contains 18 active calculations.

No employee salary dispatch or SSNIT remittance occurred: September has zero active salary-payment expenses and GHS 0.00 paid through this workflow. These 15 calculations were not reversed because a financial correction must remain an explicit Chief Engineer decision. August was not affected.

## Quality gates

- `pnpm format` — passed.
- `pnpm lint` — passed with zero warnings.
- `pnpm typecheck` — passed.
- `pnpm build` — passed; all application routes compiled.
- React Doctor full-project scan — the new salary bulk component has no finding; the repository retains pre-existing findings outside this slice.
- Focused rollback-only salary-batch SQL proof — passed.

No broad unit suite or E2E suite was added or run. Port 3000 remained listening and port 31000 remained closed after the production build.
