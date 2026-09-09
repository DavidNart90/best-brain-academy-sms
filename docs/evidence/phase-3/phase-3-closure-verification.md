# Phase 3 finance closure verification

Date: 9 September 2026. Scope: P3-02 through P3-06, PAY-01, FEE-01,
OPS-01, SEC-01, QA-01, and the STAFF-01 entry prerequisite. Target:
Supabase project `cefwopisbgfctzdloequ`, verified as the authorized test-only
project before changes.

## Closure result

Phase 3 Finance Core is verified complete. Phase 4 and Phase 5 were not opened.
No broad end-to-end suite was added or run. Verification used the existing
rollback-only finance SQL check, two focused concurrency probes, read-only
reconciliation queries, the active localhost application, and one focused
browser-to-PDF capture.

## Migration and immutable documents

Applied tracked migration
`20260909091307_finance_document_snapshots_and_reversal_references`; the local
filename matches the hosted migration ledger.

The migration:

- asserts that every earlier transactional finance RPC is present, providing a
  tracked reconciliation point for the hosted ledger's missing original
  `finance_transactional_rpcs` entry without replacing newer corrected RPCs;
- captures school identity, academic period, operator, payment-method,
  income-name, and expense-category snapshots at document creation;
- prevents later updates from rewriting those reprint fields;
- adds persisted `BBA/REV/{YYYY}/{NNNNN}` references and reversal-actor
  snapshots; a school-fee payment and its receipt share one reversal reference;
- protects historical logo objects from deletion while any finance document
  references them; and
- keeps all existing posting/reversal RPC signatures and closed direct-write
  grants unchanged.

Generated TypeScript database types were refreshed from the hosted schema.
Count-only verification returned zero missing snapshot fields and zero
invoice-cancellation/payment/receipt/expense reversal-audit mismatches. Existing
invoice `amount_paid` values exactly match the sum of active payments.

## Transaction and access evidence

The existing rollback-only
[`finance-cashflow.sql`](../../../supabase/tests/finance-cashflow.sql) passed
after adding assertions for invoice/receipt/operator identity snapshots,
reference-name snapshots, shared payment/receipt reversal references, daily
collection reversal metadata, and expense-voucher reversal metadata. It still
covers partial/full payments, exact decimals, overpayment rejection, idempotent
replay, changed-payload rejection, duplicate daily collections, named income,
failed-write rollback, direct-write denial, and missing-session denial. All
synthetic data and audit rows rolled back.

Two authenticated sessions concurrently attempted a GHS 1,000.00 payment
against the same invoice. Writer A held the invoice row for three seconds;
writer B completed only after that lock was released. Both transactions rolled
back. A residue check found zero matching payments and receipts and the invoice
still reconciled exactly.

An active Management user with `financials.read` but without
`finance.transactions.manage` was denied a receipt reversal in a rolled-back
probe. The ACCOUNTANT positive path, direct-write denial, and missing-session
denial are covered by the finance SQL regression.

## STAFF-01 prerequisite

The live database now contains 12 active, separate head-teacher assignments:
12 distinct staff covering 12 distinct supplied classes, including Nursery 1
and Nursery 2. Every assignment uses 2026/2027 Term 1 and starts 8 September
2026; the context-mismatch count is zero. Unspecified specialist assignments
remain unset rather than inferred.

Two authenticated staff-create transactions then competed for the same
server-side number counter. The second waited for the first counter lock; both
rolled back. The next staff number remains 019, with zero synthetic staff or
request residue. This closes the previous STAFF-01 concurrency limitation.

## Application and print evidence

Authenticated localhost checks covered:

- `/settings/financials`, including all term rates, payment methods, expense
  categories, and server numbering formats;
- the existing A4 invoice with immutable academic/school/operator snapshots;
- the compact receipt with stored method/operator identity and balance context;
- the compact expense voucher with stored category/method/operator identity;
- desktop and 390 × 844 mobile document layouts; and
- ledger links and the `Print / save PDF` action.

A focused Chromium print capture of the existing expense voucher produced one
unencrypted, single-page A5 PDF (`420 × 594.96 pt`). Poppler rendering confirmed
the crest, reference, category, method, recorder, amount, and footer are visible
without clipping. No browser transaction was posted or reversed.

React Doctor's final changed-file scan scored 90/100. Its one remaining
receipt-page complexity warning is a maintainability signal on an already
working conditional document renderer, not a correctness, accessibility, or
runtime failure; no risky refactor was introduced for closure.

## Advisors and accepted limitations

Post-migration security advisors report the same intentional boundary notices:
four private RLS tables have no policies because all public/anonymous/direct
authenticated access is denied; 28 authenticated SECURITY DEFINER RPC notices
refer to intentionally exposed, fixed-`search_path`, permission-checked entry
points; and leaked-password protection remains a release-plan configuration
decision. Performance advisors report INFO-only unused/missing-index suggestions;
representative load and index tuning remain Phase 5 work.

References: [SECURITY DEFINER review](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[private deny-all tables](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Final local commands

- `pnpm format`: passed; Prettier completed without errors.
- `npx -y react-doctor@latest . --verbose --scope changed --base HEAD`: passed
  with a 90/100 score and the one accepted maintainability warning described
  above.
- `pnpm lint`: passed with zero warnings.
- `pnpm typecheck`: passed after route-type generation.
- `pnpm build`: passed; Next.js compiled, completed TypeScript and static-page
  generation, and emitted all finance routes.

No broad Vitest or Playwright E2E suite was added or run during closure.
