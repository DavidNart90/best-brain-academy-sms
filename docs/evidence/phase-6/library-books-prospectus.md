# Library Books & Prospectus Verification

**Task:** P6-L01  
**Date:** 10 September 2026  
**Owner:** Codex  
**Environment:** Supabase test-only project `cefwopisbgfctzdloequ` and the existing localhost application on port 3000

## Approved rules

- Books & Prospectus is one combined, configurable charge per academic term and class.
- It is billed separately on the student's invoice but is not added to the school-fee invoice total or accounting activity.
- Library Expected, Paid, and Net use a separate balance; Net is Expected minus Paid.
- Nursery 1 is unconfigured because its marked amount is unconfirmed. Nursery 2 is unconfigured because no amount is known.
- JHS 1 (B7) and JHS 2 (B8) are each GHS 924.00. JHS 3 is explicitly not charged.
- The Librarian / Book Keeper may generate charges and record or reverse collections. Rate configuration is restricted to administrators.

## Delivered

- Migration `20260910120000_library_books_prospectus` adds term/class rate configuration, immutable student charge snapshots, and a separate Library collection ledger. Follow-up migration `20260910130000_consolidate_payment_method_read_policy` combines Finance and Library access into one equivalent payment-method read policy.
- Library collections use unique document numbers, request keys, row/advisory locking, overpayment rejection, retained reversals, audit triggers, RLS, and fixed-search-path security-definer functions.
- `/library` provides term/class/search filters, Expected/Paid/Net KPIs, rate states, charge generation, student balances, partial/full collection recording, reversals, and recent Library collections.
- The student invoice shows a separate Books & Prospectus bill without changing its school-fee total.
- Financial Overview shows separate Books & Prospectus Expected/Paid/Net KPIs. Library collections remain absent from the accounting activity report.
- The administrator flow and deployed `administrator-provision` Edge Function version 7 support the Librarian / Book Keeper role.

## Configured 2026/2027 Term 1 rates

| Class     | Amount / state |
| --------- | -------------: |
| Nursery 1 | Not configured |
| Nursery 2 | Not configured |
| KG 1      |     GHS 198.50 |
| KG 2      |     GHS 198.50 |
| Basic 1   |     GHS 291.50 |
| Basic 2   |     GHS 291.50 |
| Basic 3   |     GHS 291.50 |
| Basic 4   |     GHS 500.00 |
| Basic 5   |     GHS 500.00 |
| Basic 6   |     GHS 500.00 |
| JHS 1     |     GHS 924.00 |
| JHS 2     |     GHS 924.00 |
| JHS 3     |    Not charged |

## Verification

- Supabase MCP applied both tracked migrations to the designated test-only project and refreshed the database type contract. Remote migration history lists `library_books_prospectus` and `consolidate_payment_method_read_policy`.
- `supabase/tests/library-collections.sql` passed inside a rolled-back transaction. It checked rate states, role grants, settings denial for the Librarian, duplicate charge generation, partial collection, accounting isolation, idempotent retry, changed-replay and overpayment rejection, retained reversal history, restored balance, direct-write denial, and unauthenticated denial.
- Focused permission tests passed: 5/5.
- Authenticated browser inspection verified the Library workspace at desktop and 390 × 844 mobile sizes, the separate invoice bill, and separate Financial Overview KPIs. No browser console errors or page-level horizontal overflow were observed.
- React Doctor reported no issue in a new Library file; its remaining changed-scope findings pre-date this slice and are outside P6-L01.
- `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test:security-routes`, `pnpm test:client-boundary`, and `pnpm build` exited 0. The route check covered 38 page routes and 17 API route files; the client-boundary scan found no forbidden server implementation or key markers in 43 client chunks.
- Post-migration database state confirmed 13 class states, one current Basic 4 charge at GHS 500.00, no fabricated collection, and no Library source in `financial_activity_report`.
- The post-DDL advisors reported no multiple-permissive-policy warning after consolidation. Remaining warnings are previously reviewed platform findings: intentionally callable permission-checking security-definer RPCs and disabled leaked-password protection; INFO items cover intentionally closed private tables and young/unused indexes.
- No broad Playwright E2E suite was added or run.

## Limits and release status

- Nursery 1 and Nursery 2 intentionally have no rate and generate no charge until confirmed amounts are supplied.
- JHS 3 intentionally generates no charge.
- Only currently active students with confirmed class rates were seeded. No Library cash collection was fabricated.
- This work was applied only to the designated test environment. It is not production release approval.
- Phase 6 remains active: D-05 hosting, recovery, backup, and monitoring decisions are still open, and P6-02 through P6-08 remain subject to their gates.
