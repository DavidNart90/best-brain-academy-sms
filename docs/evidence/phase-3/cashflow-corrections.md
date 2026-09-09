# Phase 3 cashflow corrections

Date: 8 September 2026. Scope: P3-04/P3-05, PAY-01, OPS-01, SEC-01 and affected QA-01 checks. This records the original correction pass; the remaining Phase 3 gates were subsequently closed on 9 September 2026.

## Changes

- School Fees uses debounced server search by invoice number or student name. Both queries filter open invoices before applying a ten-result limit; the previous first-200-invoices dropdown and student preload are removed. Keyboard selection, current balance, no-results/errors, stale-response rejection and invalidated selections are covered.
- Feeding and admission use daily totals without student selection. A total is unique per business date/payment method while active. Corrections use reversal and replacement. Existing student-linked receipts retain their history.
- Miscellaneous income requires an income name, stored as the receipt description without a settings category. Other expenses show a required Other expense name using the existing description field.
- Captured the form element before awaiting a write, retained the request key on uncertain retries, prevented concurrent submissions, reset controls on success, distinguished errors from success, and refreshed affected financial views.
- Fixed reversal RPC argument dispatch: each call receives its own identifier instead of all three incompatible identifier arguments.
- Disabled Next Server Function argument logging in all environments. Failed-post diagnostics contain only the operation, safe error code and correlation reference; raw database messages/form values are excluded.

## Database evidence

Target verified through Supabase MCP: `cefwopisbgfctzdloequ`, the D-01 test-only project. Inspected tables, migrations, function definitions, constraints and triggers before changing the schema.

Reproduced the original posting failure in a rolled-back synthetic transaction: PostgreSQL `42702: column reference "request_key" is ambiguous`. Also identified nonexistent `profiles.first_name/last_name` references and an ambiguous receipt-ID lookup in the school-fee RPC.

Applied and reconciled local filenames with remote migration history:

- `20260908191342_finance_cashflow_daily_totals_and_posting_fix`
- `20260908191601_finance_named_income_entry`

The correction qualifies request references and the conflict constraint, checks request ownership, derives replay identity from actual RPC arguments, and checks replay before changed balances or duplicate guards. School-fee receipts use the actual profile display name, preserve invoice identity snapshots, and obtain their ID through `RETURNING`. All existing authorization, RLS, audit triggers and closed direct-write grants remain in place.

MCP executed [finance-cashflow.sql](../../../supabase/tests/finance-cashflow.sql) successfully with synthetic actors/sessions and fixtures. It verified:

- partial/full payments and exact outstanding balances;
- receipt identity/collector snapshots;
- repeat requests returning the original result, including a fully paid invoice;
- changed amounts/notes and cross-operator replay rejection;
- overpayment, extra decimal places and missing references;
- daily aggregates, duplicate-day/method prevention and reversal/replacement;
- named income without categories and expense posting/replay/void;
- failed-post record/audit rollback, direct posted-write denial and missing-session denial.

Fixture rows, financial records, request records and audit changes rolled back. A subsequent count-only check found zero rows in payments, receipts, feeding/admission/misc receipts and expenses. Identity sequences can retain gaps after rolled-back tests; document counters are transactional.

Types regenerated through MCP. Security advisors report four intentional private deny-all RLS notices, 28 authenticated SECURITY DEFINER warnings (including the explicitly permission-gated new daily-collection RPC), and existing leaked-password-protection configuration. Performance advisors report INFO notices only: eight unindexed foreign keys and 67 unused indexes. No unrelated index or access-policy changes were made.

References: [SECURITY DEFINER review](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [private deny-all tables](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Application checks

- `pnpm test`: 85/85 passed before the final stale-search regression was added.
- `pnpm exec vitest run src/features/finance`: final 18/18 finance tests passed, including the added out-of-order search test.
- `pnpm typecheck`: passed; the final production build also passed its TypeScript gate.
- `pnpm build`: passed after final application changes.
- `pnpm lint` and `pnpm format:check`: passed; final recheck recorded in the session.
- React Doctor initially scanned the branch broadly (73/100, including unrelated findings). The focused `--scope changed --base HEAD` scan scored 85/100 with two complexity warnings (five-mode form and receipt document) and one false positive: `dailyTotal` is a boolean comparison, so its conditional cannot render numeric zero. No suppression or unrelated cleanup was introduced.

Used GPT Taste under the dashboard overrides, Supabase/Postgres skills, Computer Use and React Doctor. Preserved existing school-red tokens, controls and cashflow composition.

## Live browser checks

Used the existing localhost server on port 3000. After the user signed in, inspected:

- actual invoice search by invoice number and student name, with Enter selection and visible outstanding balance;
- feeding/admission forms without student controls;
- miscellaneous name entry and Other expense name;
- conditional payment reference requirements;
- zero-amount rejection, preserved inputs, pending controls and restored usable form;
- desktop 1440×1000, tablet 768×1024, and mobile 390×844 screenshots, including the lower mobile form; no changed controls clipped;
- zero browser console errors returned for the inspected session.

The development log contained zero `recordFinanceAction(` argument traces both before and after the invalid browser submission. Built configuration confirms `logging.serverFunctions=false`. No valid financial records were posted from the user's browser. Restored the normal viewport and left the cleared School Fees form available.

## Closure follow-up

The remaining overlapping-writer, reconciliation/reversal, immutable-document,
access, and print/PDF gates were closed on 9 September 2026. See
[Phase 3 closure verification](phase-3-closure-verification.md). This original
8 September evidence is retained to preserve the cashflow-correction history.
The separate `pnpm test:db` harness still requires its configured `TEST_*`
environment; focused database verification ran through MCP. Production release
and password-policy acceptance remain under the existing release decisions.
