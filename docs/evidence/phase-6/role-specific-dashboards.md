# Role-Specific Dashboards

**Task:** P6-R01 role dashboard composition  
**Evidence ID:** E6-09  
**Date:** 15 September 2026  
**Environment:** Authenticated `localhost:3000` against the configured test-only Supabase project

## Implemented scope

- Added a deterministic server-side dashboard resolver with Super Administrator priority for accounts that carry more than one role.
- Replaced the generic finance-or-empty dashboard branch with five intentional dashboard compositions:
  - **Administrator:** active students, admissions this term, teaching staff, class enrollment, and the highest current-term outstanding balances. The balance table links only to permitted Student records and presents the full Outstanding Fees screen as a view/filter/print workflow; it contains no payment or reversal control.
  - **Accountant:** the existing reconciled finance chart, expected/collected/outstanding/expense KPIs, class-filtered outstanding balances, invoice links, and Reports access.
  - **Board Member:** aggregate finance KPIs and read-only governance indicators. The dashboard does not load or render the student-level outstanding table.
  - **Librarian / Book Keeper:** current-term library collection progress, configurable class-rate coverage, expected/collected/outstanding totals, students charged, and recent collection/reversal records.
  - **Super Administrator:** the complete finance dashboard plus a school-operations table for Students, Staff, Classes, access accounts, and Library outstanding balances.
- Extended the shared statistic card to format either money or whole-number operational counts without duplicating the existing dashboard component pattern.
- Kept each route branch server-rendered and limited its queries to the selected role composition. No schema, role, account, permission, or client-finance data changed in this slice.

## Design and authorization boundaries

- Applied the project GPT Taste workflow with the dashboard-specific overrides: the existing App Shell, Inter typography, institutional red tokens, large primary panel plus `2 × 2` KPI composition, full-width operational table, compact controls, and restrained motion were preserved.
- Role selection uses the authenticated server access context. It is presentation composition on top of the E6-07 database grants, RLS, route guards, and server permissions; it does not replace those enforcement layers.
- Accountant and Administrator personal-record mutation rights remain unchanged. Board Member receives aggregate oversight without student-level dashboard PII. Administrator receives no invoice-detail or payment path from the dashboard.

## Verification

- `pnpm exec vitest run src/features/dashboard/role.test.ts`: 1 focused file, 6 tests passed. It covers all operational-role mappings, the empty fallback, and Super Administrator precedence.
- `pnpm typecheck`: exited 0 after the implementation and again in the final gate.
- Authenticated live-browser inspection verified the Super Administrator dashboard at the default desktop viewport and at 390 × 844. The main analytics/KPI/table hierarchy remained intact; mobile cards stacked without document-level horizontal overflow (`documentWidth` 375 within a 390-pixel viewport).
- A fresh browser reload produced no warning or error logs. The temporary mobile viewport override was reset before handover.
- React Doctor scanned 155 files and reported no finding in the new dashboard files. Its 24 findings are pre-existing in unrelated files and were not expanded into this slice.
- `pnpm lint`, `pnpm format`, `pnpm format:check`, `pnpm typecheck`, and `pnpm build` exited 0. The production build includes `/dashboard` as a protected dynamic route.

## Deliberate limits and next step

No broad unit or E2E suite ran. Browser verification reused the existing Super Administrator session; no supplied test identity was created or re-roled, and no payment, reversal, or other financial write occurred. The role resolver test and production compilation cover all five dashboard branches, while E6-07 remains the database authorization proof. P6-R01 stays in progress for authenticated negative-access journeys under each operational role.
