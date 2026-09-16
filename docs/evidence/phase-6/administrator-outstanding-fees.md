# Administrator Outstanding-Fees Workflow

**Task:** P6-R01 filtered outstanding-fees slice  
**Evidence ID:** E6-08  
**Date:** 15 September 2026  
**Environment:** Authenticated `localhost:3000` against the configured test-only Supabase project

## Implemented scope

- Replaced the single unbounded outstanding-balance search with a bounded 25-row table and stable pagination.
- Added student-name/admission/invoice search, class filtering, and academic-term filtering. Academic-term options include their academic year and identify the current term.
- Kept filters in the URL so pagination and report links preserve the active scope.
- Added a dedicated `/financials/outstanding/print` route. It reruns the same normalized query, shows the active filters and exact total outstanding amount, includes school identity, uses repeated table headers, and selects A4 landscape print styling.
- Limited a single print request to 1,000 matching rows and displays an explicit instruction to narrow filters if that safety cap is reached.
- Linked student names only when the actor has `students.read` and invoice numbers only when the actor has `financials.read`. No payment, reversal, or transaction control is present in either the table or report.

## Authorization and data boundaries

- The main route requires `finance.outstanding.read`.
- The print route independently requires `finance.outstanding.print`.
- Both routes reuse the E6-07 invoice RLS policy, which exposes only unpaid or partially paid invoices with a positive outstanding balance to this narrow workspace.
- No schema, policy, role, account, or client-finance data was changed in this slice. The supplied test identities were not needed.

## Verification

- `pnpm exec vitest run src/features/finance/outstanding-query.test.ts`: 1 file, 2 tests passed. The test covers query sanitization, invalid-filter fallback, and preservation of student/class/term filters in pagination and print URLs.
- `pnpm typecheck`: exited 0 before browser verification and again in the final gate.
- Authenticated live-browser inspection combined a seeded student-name search, Basic 4, and 2026/2027 Term 1. The URL contained all three normalized filters and the table returned the matching open balance.
- The report route preserved those exact filters, visibly named the selected class and term, and reconciled its displayed total outstanding to the single matching row.
- Default desktop and 390 × 844 mobile layouts were inspected. Controls remained usable; the dense finance table used intentional horizontal scrolling on mobile without widening the document.
- Browser warning/error logs were empty. No print job was sent to a device; the print-ready route and print stylesheet were inspected without invoking the system print dialog.
- React Doctor scanned the changed branch and reported no finding in the outstanding-fees files. Its 24 reported findings are pre-existing in unrelated files.
- `pnpm lint`, `pnpm format`, `pnpm format:check`, `pnpm typecheck`, and `pnpm build` exited 0. The production build includes both `/financials/outstanding` and `/financials/outstanding/print` as protected dynamic routes.

## Deliberate limits and next step

No broad unit or E2E suite ran. Browser verification used the existing Super Administrator session; it did not create or re-role an account, and it did not create, record, reverse, or delete any payment. E6-07 remains the database and least-privilege proof for the Administrator boundary. P6-R01 stays in progress for role-specific dashboard composition and per-role authenticated negative-access journeys.
