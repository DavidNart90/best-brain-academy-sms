# Phase 4 Salary Configuration Reconciliation

**Evidence ID:** E4-02  
**Date:** 9 September 2026  
**Owner:** Codex, under Chief Engineer authorization

## Delivered scope

- Applied tracked migration `20260909152652_staff_salary_configurations` to the authorized test project.
- Added effective-dated gross-salary configurations with positive two-decimal amounts, non-overlapping periods, audit metadata, history-preserving end dates, and one current configuration per staff member.
- Added retry-safe, permission-gated add/change/end RPCs. Monthly salary posting now resolves and snapshots the applicable configured rate instead of accepting a manually typed gross amount.
- Added a Staff salaries section to Financial Settings, including current rates, add/change/end controls, and preserved ended history. No salary record is created by changing a setting.
- Added the confirmed schedule-only person to the roster as an active non-teaching cook. The roster-only person remains active without a salary configuration because the Chief Engineer confirmed they are paid outside the register.

No payroll run, PAYE, pension liability, payslip, bank file, or disbursement workflow was added.

## Data reconciliation

The authorized test project now contains 19 active staff records and 18 active August salary configurations. The configured gross total is **GHS 12,450.00**, matching the supplied schedule. The confirmed cook has staff number `BBS-Staff-019` and an August rate of GHS 400.00. The off-register staff member has no salary configuration.

The `salary_records` table contains **zero rows**, including zero for August 2026. The Chief Engineer explicitly kept that batch unposted.

## Focused database and security verification

The existing `supabase/tests/salary-register.sql` was extended rather than creating another suite. It ran through Supabase MCP in one rollback-only transaction and passed:

> PASS: configurable salary history, posting snapshots, deductions, reversals, audit and access boundaries

It covered configuration add/change/end history, configured-rate posting, retry behavior, duplicate and precision rejection, deduction/reversal behavior, direct-write denial, anonymous denial, and audit creation. The transaction left no residue.

RLS is enabled on `staff_salary_configurations` with one `financials.read` policy. Anonymous table access and RPC execution are denied; authenticated users have select-only table access, while writes go through fixed-empty-search-path RPCs that re-check `finance.settings.manage` or `finance.transactions.manage` before mutation. Supabase's [SECURITY DEFINER advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) therefore reports the three public salary RPCs intentionally. No new missing-RLS or unindexed-foreign-key finding applies to this table. Two fresh audit foreign-key indexes are reported unused because the configuration has just been introduced and is retained for referential operations.

The existing Free-plan [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) is unchanged and is not caused by this work.

## Browser and quality verification

- Authenticated inspection of `/settings/financials#staff-salaries` verified 18 current rates, the cook's GHS 400.00 configuration, editable rate/effective-month controls, history-preserving End salary action, and the roster-only person appearing only in Add staff salary.
- Authenticated inspection of `/financials/salary-deductions?month=2026-08` verified the cook's configured GHS 400.00 is displayed after selection and that the August register remains at zero records and zero totals. No form was submitted.
- Browser console errors/warnings: none. Desktop document width remained within the 1280 px viewport (`scrollWidth` 1265 px). The connected browser did not expose viewport emulation, so no new mobile screenshot is claimed; the forms retain the existing responsive grid contracts.
- `pnpm format` — passed.
- `pnpm lint` — passed with zero warnings.
- `pnpm typecheck` — passed.
- React Doctor changed-scope scan completed. All four findings introduced or exposed in the changed salary code were resolved; remaining findings are pre-existing outside this slice.
- `pnpm build` — passed and emitted the financial-settings and salary-register routes.
- No broad unit or Playwright E2E suite was added or run, per the Chief Engineer's direction.

The required project-local `.agents/skills/react-doctor/SKILL.md` was absent. The installed user-level React Doctor skill listed for the workspace was read and used instead; this substitution is explicit rather than claimed as a project-local reference.
