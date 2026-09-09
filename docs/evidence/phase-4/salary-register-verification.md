# Phase 4 Salary Register Verification

**Evidence ID:** E4-01  
**Date:** 9 September 2026  
**Owner:** Codex, under Chief Engineer authorization

## Delivered scope

- Applied `20260909095828_salary_records_and_deductions`, the forward qualification fix `20260909100512_qualify_salary_record_result`, and the RPC precision hardening `20260909101703_salary_precision_and_reversal_reason` to the authorized test project.
- Added effective-dated percentage/fixed deduction settings. The supplied 5.5% SSNIT employee contribution is active and automatically applied from August 2026; salary advance, staff loan, absence, welfare, and other deduction types are available for approved manual amounts.
- Added immutable monthly salary and deduction snapshots, generated gross-minus-deductions net position, unique salary/deduction/reversal references, partial unique active staff/month and salary/type constraints, audit triggers, RLS, and closed direct writes for posted records.
- Added retry-safe salary/deduction posting and reasoned reversal RPCs with server authorization. Reversing an individual deduction recalculates the active net position; reversing a whole salary preserves its historical totals and permits a corrected replacement for the month.
- Added the salary register, monthly totals, bounded filters/pagination, salary detail/correction view, financial-settings deduction editor, and bounded staff salary history.
- Corrected the financial-settings route contract from `/settings/financial` to `/settings/financials`.

No attachment/approval workflow was invented. PAYE, employer pension or liability accounting, automated payroll runs, payslips, bank files, and payment disbursement remain outside this phase.

## Focused database verification

`supabase/tests/salary-register.sql` ran through Supabase MCP against the authorized test project in one rollback-only transaction and passed:

> PASS: salary snapshots, SSNIT, totals, retries, validation, reversals, replacement, audit and access boundaries

The check covered the supplied percentage calculation, exact two-decimal totals, rejection of extra money precision at the public RPC boundary, immutable staff/rule/gross snapshots, same-key replay, changed-payload rejection, duplicate active month/type rejection, month and amount validation, deductions not exceeding gross, individual and whole-record reversal references, corrected replacement, audit rows, denied direct mutation, and unauthenticated denial. Synthetic identities and finance rows rolled back; no test residue or real salary data was written.

## Browser and quality verification

- Authenticated localhost inspection at the active development server verified `/financials/salary-deductions?month=2026-08`, `/settings/financials`, and a staff profile. The new navigation label, August month handling, salary form, zero-state totals, deduction settings (including 5.5% SSNIT), numbering formats, and empty staff salary history rendered with accessible labels and the existing school design system.
- `pnpm format` — passed.
- `pnpm lint` — passed with zero warnings.
- `pnpm typecheck` — passed.
- React Doctor was run on changed scope (74/100, 21 findings across the branch diff). New salary pages/components had no reported bug or performance finding; it continued to report pre-existing broad-file findings, including the already-large staff profile and legacy finance components/schemas.
- `pnpm build` — passed; Next.js emitted both salary-register routes and the existing protected application routes.
- No Playwright E2E or broad unit suite was added or run, per the Chief Engineer's explicit scope.

## Advisor review and residual data decision

Supabase security/performance advisors reported no new missing-policy or unindexed-foreign-key finding for the Phase 4 tables. The four public Phase 4 RPC warnings are intentional: execution is granted to signed-in users, and each function performs its own fresh `finance.transactions.manage` permission check before any write. New indexes are initially reported unused because the register contains no live salary rows.

The supplied schedule was reconciled against the current roster without copying private names or pay amounts into tracked artifacts. One schedule identity has no defensible current-roster match, while one roster identity is absent from the schedule. The entire real August batch remains unposted until the Chief Engineer confirms that mapping; this avoids silently assigning salary to the wrong person.
