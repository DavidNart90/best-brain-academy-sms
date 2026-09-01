# Phase 0 backend verification — 1 September 2026

Owner: Codex. Working-tree evidence; no deployment. **Phase 0 integrated gate
passed.** This report supersedes the historical unapplied/backend-blocked state and
supplements the local UI/test report.

## Authorization and changes

The Chief Engineer explicitly designated `cefwopisbgfctzdloequ` as test-only on its
Free plan and authorized migrations. MCP verified the URL, empty public schema,
empty migration history and zero Auth accounts before applying changes.

| Applied identity                                      | Observed result                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `20260831200632_foundation_access`                    | Success; five RLS tables, restricted grants, pending-profile trigger, invoker RPC and private session helpers |
| `20260831200637_restrict_existing_rls_trigger_grants` | Success; broad EXECUTE grants removed from pre-existing event-trigger function, trigger preserved             |
| `20260831200843_verify_foundation_access_contracts`   | Success; executable SQL checks and verified rollback of all temporary fixtures                                |
| `20260901100905_configure_phase0_test_actors`         | Success; fixed synthetic emails resolved to generated Auth IDs and explicit test states/roles assigned        |

Remote migration history matches the local filenames. Actual schema types were
regenerated through MCP into `src/types/database.ts`. No ad hoc DDL or direct
database connection bypassed MCP. No business schema or finance writes were added.

## Executed database checks

The third migration assumes real PostgreSQL authenticated/anon roles with synthetic
caller claims. It verifies five-table RLS, denied writes and anonymous access,
restricted helper/trigger grants, invoker RPC, pending/no-role creation despite
forged metadata, own-profile visibility, nine super and three management permissions,
no grants for pending/disabled accounts, immediate role/status changes, and rejection
of expired, missing, mismatched and revoked session rows. Super administrators also
cannot write roles/profiles directly. Any failed assertion aborts the migration.

All fixture writes roll back in a nested subtransaction. Final read-only MCP counts:

| Data                     | Count |
| ------------------------ | ----: |
| Auth users               |     3 |
| Auth sessions            |     0 |
| Profiles                 |     3 |
| User-role assignments    |     2 |
| Roles                    |     4 |
| Permissions              |     9 |
| Role-permission mappings |    21 |

These tests validate Postgres authorization, not Auth-issued JWTs or actual password
login. The separate 14-assertion pgTAP file was not run and is not reported as passing.

After users were created, the security advisor reported
`auth_leaked_password_protection`. Supabase documents leaked-password protection as
available on Pro and above; the Chief Engineer explicitly chose this Free target for
testing. Generated fixture passwords are long and random, but the hosted control is
a production-release limitation. [Supabase password security](https://supabase.com/docs/guides/auth/password-security).
Performance advisors returned two INFO unused-index findings
(`role_permissions_permission_idx`, `user_roles_role_idx`). Retained because the
application has no real workload yet; assess usage later.
[Supabase unused-index advisory](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Hosted Auth and live provider preflight

After the user signed in, the dashboard was used to disable and save public signup.
Anonymous sign-ins/manual linking are off, email confirmation is on, only email
is enabled among listed providers, and no custom providers exist. Site URL:
`http://localhost:3000`; no extra redirect URLs. No paid feature was enabled.

Configured limits per IP: signup/sign-in 30 per five minutes; token refresh 150 per
five minutes; OTP/magic-link verification 30 per five minutes. IP forwarding is off.
A controlled invalid-login probe returned HTTP 429 on attempt 34 after earlier login
traffic in the same window. Shared server IP limiting, CAPTCHA/host protection and
privileged MFA still need deployment review.

`pnpm test:db` runs four real-provider preflight tests, all passing:

1. All five tables and the access RPC deny anonymous access with `42501`.
2. The private schema rejects Data API selection with `PGRST106` (not exposed).
3. Hosted settings disable signup and anonymous sign-in; an actual unique synthetic
   signup is rejected with `signup_disabled`, no user and no session.
4. Invalid synthetic credentials return `invalid_credentials` with no session.

Three auto-confirmed synthetic Auth users were created. Strong generated passwords
were stored only in ignored `.env.test.local`. The assignment migration resolves
fixed test emails and never records generated UUIDs or passwords. Final states are
active/SUPER_ADMIN, pending/unassigned and disabled/SUPER_ADMIN.

`pnpm test:db` passed all eight preflight/actor tests. Real Auth sessions verified
exact permission sets, caller-only profile reads, refresh, metadata tampering without
escalation, denied profile/role writes, and immediate database denial after local
logout revoked the session. The SQL migration tests cover expired, missing,
mismatched and revoked session rows.

`pnpm test:e2e:auth` passed three Chromium journeys: allowed login/reload/logout and
post-logout route protection; pending denial; disabled denial. No real credentials,
tokens or school records were written to evidence.

## Gate and residual limits

Phase 0's integrated local/real-provider gate passed. The separate 14-assertion pgTAP
file was not executed; the tracked executable contract migration is the SQL evidence.
The GitHub workflow is authored but was not run on the hosted runner. Neither item is
misreported as passing. Leaked-password protection is unavailable on the selected
Free plan and must be resolved or explicitly accepted at the production release gate.
Phase 1 remains unstarted.

Final local regression passed lint, format, typecheck, 25 unit/component tests,
coverage (96.66% lines / 93.10% branches), 21 synthetic browser tests in 47.9 seconds,
production build and client-boundary inspection. The final build uses the actual
approved test-project configuration, not the loopback fixture. Environment files
are Git-ignored. The current Pro-only leaked-password advisor is recorded above.

Local commands and responsive UI evidence are recorded in
[verification.md](verification.md). Preserve role/permission definitions when later
cleaning up synthetic data. Disable test authorization before live conversion and
complete the release gates in Plan.md. Phase 1 remains unstarted.
