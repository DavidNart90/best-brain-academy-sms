# P2-05 Administrator Provisioning Verification

**Date:** 1 September 2026  
**Owner:** Codex  
**Target:** Supabase test-only project `cefwopisbgfctzdloequ`

## Delivered

- Supabase MCP applied tracked migrations `20260901153234_administrator_provisioning_and_roles`, `20260901153428_administrator_invitation_status`, and `20260901154514_harden_administrator_access_indexes`.
- RLS-protected administrator accounts and invitation requests preserve full name, email, phone, role, status, invitation state, audit context, and fresh access enforcement. Existing reviewed Auth users were backfilled without creating staff records.
- MFA-gated RPCs stage invitation batches transactionally, change one explicit role, and enable/disable accounts. They block self-role/status changes and protect the final active Super Administrator under an advisory transaction lock.
- JWT-verified Edge Function `administrator-provision` version 2 is active on the test project. It alone uses server-side Auth administration, sends invitations, and finalizes or records per-row provider failures.
- `/administrators` provides the shared three-action empty state, Zod invitation form, paginated/searchable directory, role/status confirmation, clear MFA state, template/import preview with row errors and duplicate detection, and filtered Excel export. `/account/security/mfa` and `/mfa/verify` provide TOTP enrollment and challenge states.

## Verification

- One rollback-only MCP database/RLS scenario passed: AAL1 write rejection, AAL2 invitation staging, authorized directory reads, self-protection, transactional role/status changes, audit creation, RLS denial, and immediate permission loss. No fixture survived rollback.
- `LIVE_E2E_APP_PORT=3012 pnpm exec playwright test --config playwright.auth.config.ts --grep "review accounts and preview invitations"`: 1/1 passed against real Supabase. It covered the directory, visible MFA gate, blocked invitation before MFA, duplicate-row preview, disabled confirmation, no-results search, axe, and desktop/mobile content fit.
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, and `git diff --check`: passed; only Windows line-ending notices were emitted.
- `npx -y react-doctor@latest . --verbose --diff`: 100/100, no issues.
- Supabase migration history, generated TypeScript types, and active Edge Function version were verified. Advisor recheck found no missing P2-05 foreign-key indexes or duplicate permissive policies.

Broad unit, coverage, load, and unrelated system suites were intentionally not run, following the Chief Engineer's lean-check direction.

## Final state and residuals

The directory contains the same three test-only administrator accounts, zero invitation requests, and no new Auth users; the existing one active session remains. No staff or finance records were created.

The security advisor intentionally flags four new authenticated `SECURITY DEFINER` administrator RPCs. Each has a fixed search path, active-session permission checks, AAL2 on writes, closed direct writes, and focused negative verification. New low-volume indexes are reported as unused until real invitation traffic exists. The Free-plan leaked-password warning remains a release limitation. A positive email delivery was not triggered in verification because the test actor intentionally remains without an enrolled factor; P2-06 should exercise and clean up a full MFA invitation/role-change journey before the phase exit gate.
