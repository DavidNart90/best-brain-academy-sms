# Finance oversight and end-of-term invoice verification

**Task:** E6-12 / P6-F01  
**Date:** 15 September 2026  
**Environment:** authorized Supabase test project and `http://localhost:3000`

## Delivered behavior

- Replaced the fee-centric Financial Overview with a finance-operations view covering gross receipts, expenses, operating net, recorded cash position, fee recovery, separate Library exposure, collection sources, expense categories and recent posted collections.
- Reused the reconciled reporting engine and Month, Academic term and Academic cycle filters while giving financial staff a distinct operational layout from Board oversight.
- Applied the same finance composition to the Accountant dashboard. Existing database grants and route checks continue to expose Students and Staff as read-only reference workspaces for Accountants.
- Added `/financials/end-of-term-invoices` with parent-note setup, readiness counts, class/school scope, 50-student generation batches, live invoice search/filtering, detail documents and 25-document print batches.
- Added immutable invoice snapshots for the source-term outstanding balance, next-term school-fee components, Books & Prospectus planning amount and parent note. Books & Prospectus remains outside the school-fee and Library collection ledgers.
- Generation is retry-safe. An existing active target-term invoice is skipped, and a cursor continues the next bounded batch without duplicate documents.

## Access and integrity boundaries

- `finance.end_term_invoices.read`: Super Administrator, Accountant, Administrator and Board Member.
- `finance.end_term_invoices.manage`: Super Administrator, Accountant and Administrator only.
- Board Member can select the end-term invoice and its lines under RLS but cannot save configuration or generate documents.
- Administrator receives no payment/reversal permission; the new management permission is limited to end-term configuration and generation.
- Parent notes lock after the first invoice is issued. Invoice updates preserve kind, source term, configuration, prior-balance, prospectus and note snapshots.
- Same-year next-term invoices use the source-term enrollment context. Cross-academic-year generation requires a target-term enrollment instead of guessing promotion/class placement.
- The existing one-active-invoice-per-student/term constraint remains the duplicate and concurrency boundary.

## Database evidence

Supabase MCP applied:

- `20260915172552_end_of_term_invoices`
- `20260915174034_consolidate_invoice_read_policies`

The second migration consolidated invoice SELECT policies after the performance advisor identified multiple permissive policies. Final inspection returned one SELECT policy each for `invoices`, `invoice_lines`, and `end_term_invoice_configurations`; the multiple-policy advisor finding is absent.

The rollback-only `supabase/tests/end-of-term-invoices.sql` proof verified:

- Accountant Student and Staff read grants.
- Exact Board read-without-manage permissions and effective RLS row access.
- GHS 200.00 source-term balance snapshot.
- GHS 800.00 next-term school-fee invoice from two immutable fee lines.
- GHS 150.00 Books & Prospectus informational snapshot without a `library_charges` posting.
- Immutable parent note after issuance.
- Retry produces zero duplicate invoices.
- Board mutation is rejected.

The proof passed after policy consolidation. A residue query returned zero end-term configurations, zero end-term invoices, and zero synthetic end-term users.

Current real configuration remains intentionally incomplete: 2026/2027 Term 2 has no school-fee or Books & Prospectus rates. The live page reports one student, one school-fee gap and one prospectus gap, disables generation/printing, and links authorized staff to the relevant configuration pages. No values were invented and no real next-term invoice was generated.

## Verification

- `pnpm format` and `pnpm format:check` — passed.
- `pnpm lint` — passed with zero warnings.
- `pnpm typecheck` — passed.
- Focused Vitest run — 24/24 permission, dashboard-role and finance-action assertions passed.
- `pnpm test:security-routes` — passed for 42 page routes and 18 API route files.
- `pnpm test:client-boundary` — passed across 48 client chunks with no forbidden server implementation/key markers.
- `pnpm build` — passed; all three end-of-term routes emitted as dynamic protected routes.
- React Doctor changed-scope review — no finding in the new finance dashboard, end-term invoice document, batch manager, pages or corrected PWA update manager. Twenty-four existing findings remain in older changed files.
- Authenticated browser — Financial Overview and End-of-Term Invoices rendered on desktop; the end-term workspace was inspected at 390 × 844; the protected empty print route rendered the correct state; final warning/error logs were empty.

No broad E2E suite was added or run, following the Chief Engineer's focused-test direction.
