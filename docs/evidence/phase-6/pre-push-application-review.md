# Pre-push application review

**Task:** E6-13 pre-push application/security/UI review  
**Date:** 15 September 2026  
**Environment:** authorized Supabase test project and `http://localhost:3000`

## Scope and corrections

This review covered the accumulated local candidate before a source-control push. It did not import client data, post or reverse a financial record, provision a role-test account, approve a production release, or replace the later P6-05 release suite.

The focused corrective pass:

- Removed `useSearchParams` from the shared Student filters and rebuilt the known bounded query contract from controlled state, avoiding a Next.js suspense/rendering hazard while preserving live URL-backed filtering.
- Derived the current salary month once on the Server Component and passed it into client forms, preventing a server/client midnight hydration mismatch. The end-month default also respects a future effective start month.
- Replaced the skipped-invoice array-index key with a stable student/reason identity.
- Hoisted repeated date formatters and reused the existing authorized Supabase client for Library option queries.
- Made the cashflow daily-total render branch explicitly boolean without changing its behavior.

## Security review

- Supabase project `cefwopisbgfctzdloequ` reported `ACTIVE_HEALTHY` on PostgreSQL 17.6.1.166, and the remote migration list includes the complete role, Board, end-term and invoice-policy sequence through `20260915174034_consolidate_invoice_read_policies`.
- All 40 tables in the exposed `public` schema have RLS enabled.
- The `anon` role has no public table grants. Authenticated grants remain operation-specific and are constrained by RLS.
- All four public views (`financial_activity_report`, `salary_cash_positions`, `staff_directory`, and `student_directory`) use `security_invoker=true`.
- Of 49 public `SECURITY DEFINER` functions, none is executable by `anon`; 47 intentionally form the authenticated RPC boundary. Every authenticated definer RPC contains a caller/permission guard and a fixed empty search path. The sole function without a caller guard is the trigger-only `rls_auto_enable`, which is not client-executable.
- Supabase security advisors continue to report the documented authenticated-definer architecture, six private tables that intentionally expose no RLS policy, and leaked-password protection unavailable on the Free-plan test environment. These are not regressions from this pass.
- `pnpm audit --prod` found no known production dependency vulnerabilities.
- Secret-pattern inspection found no credential embedded in tracked application code. The service-role key is read only inside the administrator-provision Edge Function environment.
- Route allowlisting covered 42 protected pages and 18 API route files. The production client-boundary scan found no server implementation or privileged-key marker in 50 client chunks.

## Browser and UI evidence

Authenticated Super Administrator inspection covered:

- Dashboard and financial oversight composition.
- Students directory, live no-result search and reset.
- Financial Settings and server-derived September 2026 salary month default.
- End-of-term invoice mobile state, including the correct disabled generation/print controls while Term 2 fees and Books & Prospectus remain unconfigured.
- Global search returning permitted Student, Staff, invoice and receipt results.
- Desktop and 390 × 844 responsive layouts.

The mobile financial overview and end-term invoice pages had no horizontal page overflow. Browser error/warning logs were empty. The viewport override was reset and the authenticated dashboard was left open.

## Verification

- `pnpm audit --prod` — passed; no known vulnerabilities.
- `pnpm test` — passed; 21 files and 113 tests.
- `pnpm format:check` — passed.
- `pnpm lint` — passed with zero warnings.
- `pnpm typecheck` — passed.
- `pnpm test:security-routes` — passed; 42 pages and 18 API route files.
- `pnpm test:security-live` — passed against localhost; 40 protected pages, 16 protected API methods, auth mutation defenses and response security headers.
- `pnpm test:client-boundary` — passed; 50 client chunks and no forbidden marker.
- `pnpm build` — passed on Next.js 16.3.3; all protected and end-term routes emitted successfully.
- `git diff --check` — passed; line-ending notices are repository/platform normalization warnings, not whitespace errors.
- React Doctor changed-scope score improved from 68/100 with 24 findings to 73/100 with 16 findings. The remainder is 14 maintainability warnings plus two analyzer false positives: both flagged selects have visible Radix labels with matching `htmlFor`/`id` values. No confirmed React bug remains in the reviewed slice.

## Remaining release boundaries

- D-05 hosting, backup/recovery objectives, restore rehearsal and monitoring ownership remain open.
- P6-05 full release-candidate acceptance has not run and is not claimed.
- Leaked-password protection remains a Supabase plan/configuration decision.
- Five-role authenticated negative-access journeys were not recreated because the temporary accounts were intentionally removed after E6-10. That earlier evidence remains the current role-browser proof; database permission/RLS checks remain authoritative for this pass.
- Term 2 rates are intentionally absent, so no real end-of-term invoice was generated.
