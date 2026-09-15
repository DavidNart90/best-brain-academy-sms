# Role Workspace Access Foundation

**Task:** P6-R01 access foundation  
**Date:** 15 September 2026  
**Environment:** Configured test-only Supabase project and authenticated `localhost:3000`

## Implemented scope

- Applied tracked migration `20260915145048_role_workspace_access_foundation` through Supabase MCP.
- Kept the stored `MANAGEMENT` role code for compatibility and changed its visible label to **Board Member**.
- Added the narrow `finance.outstanding.read` and `finance.outstanding.print` permissions.
- Replaced the four operational-role grants with the approved least-privilege matrix. Super Administrator continues to receive every permission.
- Added an authenticated invoice `SELECT` policy that exposes only unpaid or partially paid rows with a positive outstanding balance to actors with `finance.outstanding.read`.
- Aligned route protection and navigation. Administrators receive a direct Outstanding Fees destination without the broader Financials workspace; Accountants receive Students, Staff, all Financials, Reports, and Financial Settings. Super Administrator retains every destination without a duplicate Financial Settings link.
- Kept Student and Staff mutations behind their existing `students.manage` and `staff.manage` server permissions. Accountants receive only `students.read` and `staff.read`.
- Removed invoice-detail links from the Outstanding Fees table when the actor lacks `financials.read`, preventing the Administrator workspace from offering an inaccessible or transaction-adjacent path.
- Updated administrator role selectors and spreadsheet role names to use Board Member while still accepting the legacy `Management` import value.

## Verified role grants

| Role                        | Effective permissions in this slice                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrator               | Dashboard; Admissions; Student read/manage/import/export; Classes read; Staff read; Outstanding Fees read/print                                |
| Accountant                  | Dashboard; Student read; Staff read; Financials read; finance transaction management; Financial Settings; Outstanding Fees read/print; Reports |
| Board Member (`MANAGEMENT`) | Dashboard; Financials read; Reports read                                                                                                       |
| Librarian / Book Keeper     | Dashboard; Library read; Library collection management                                                                                         |
| Super Administrator         | All 23 registered permissions                                                                                                                  |

## Verification

- Supabase migration history contains `20260915145048_role_workspace_access_foundation`.
- Read-only database inspection returned the exact four operational-role grant arrays above and the `invoices_read_outstanding_balances` policy for `authenticated` users.
- `pnpm exec vitest run src/lib/permissions/contracts.test.ts`: 1 file, 8 tests passed. The focused tests cover Administrator finance exclusion, Accountant read-only people access, Accountant finance access, route permission resolution, and Board Member labeling.
- Authenticated live-browser inspection at `localhost:3000/settings/roles` showed five roles, 23 permissions, the Board Member label, and the expected grants.
- Authenticated live-browser inspection at `localhost:3000/financials/outstanding` showed the existing outstanding balance table and working Super Administrator invoice links. Desktop/default and 390 × 844 mobile navigation were inspected; the browser console contained no warnings or errors.
- React Doctor completed with no finding in the files changed for this slice. Its 24 findings are pre-existing elsewhere in the branch and were not expanded into this access change.
- `pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm build` exited 0.

## Deliberate limits and next step

No broad unit or E2E suite was run. No user role was changed and no financial transaction was created, reversed, or deleted during verification. The Administrator outstanding-fees screen still needs the approved class and academic-term filters plus filter-faithful printing. Role-specific dashboard composition and an authenticated negative-access journey for each operational role also remain within P6-R01.
