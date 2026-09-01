# Phase 0 backend setup and verification

The Chief Engineer designated `cefwopisbgfctzdloequ` as test-only on 31 August 2026
and authorized migrations on its Free plan. D-01 is resolved for testing; no separate
paid project or branch is required. The dashboard's main/Production label does not
authorize live school data. Phase 0 passed its integrated gate on 1 September 2026;
Phase 1 has not started.

## Applied migrations

Applied through MCP, with matching local files and verified remote history:

| Identity                                              | Purpose                                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `20260831200632_foundation_access`                    | Five RLS tables, pending-profile trigger, caller-bound access helpers/RPC, role definitions     |
| `20260831200637_restrict_existing_rls_trigger_grants` | Revoke API execution of the existing RLS event-trigger function; preserve its owner and trigger |
| `20260831200843_verify_foundation_access_contracts`   | Executable SQL acceptance checks; all fixture writes roll back inside a subtransaction          |
| `20260901100905_configure_phase0_test_actors`         | Resolve fixed synthetic emails and assign explicit test-only status/roles                        |

Do not reapply or edit applied migrations. Reverify the project, tables and migration
history before new changes. MCP-generated types now represent the actual schema.
The security advisor now reports leaked-password protection disabled; Supabase
documents that control as Pro-only, while this authorized target is Free. Two
informational unused foreign-key indexes are retained pending real workload. See
[backend evidence](evidence/phase-0/backend-verification.md).

## Access model

- Authenticated clients have SELECT only; no profile or role writes, even for super
  administrators. Anonymous clients have no application-table or access-RPC grants.
- New Auth accounts receive pending profiles and no roles. Editable metadata supplies
  only a bounded display name; role/status metadata never grants access.
- The invoker RPC returns the caller's current database grants. Restricted private
  definer helpers avoid recursive RLS and require a matching, unexpired Auth session.
- Management has dashboard/financial/report read access only. Further grants depend
  on D-03. Protected pages and the endpoint authorize server-side.
- No business tables, finance writes, Storage buckets or real school seeds exist.

## Hosted Auth

The local config does not configure hosted Auth. On 31 August 2026 the signed-in
dashboard was used to disable and save public signup. Live settings plus an actual
rejected signup confirmed it. Anonymous sign-ins and manual linking are off; email
confirmation remains on. Email is enabled, all other listed providers are disabled,
and there are no custom providers. Site URL is `http://localhost:3000`; no additional
redirect URLs are configured. No wildcard production origin was added.

Configured limits per IP: sign-up/sign-in 30 requests per five minutes,
refresh 150 per five minutes, OTP/magic-link verification 30 per five minutes. IP
forwarding is off. A controlled invalid-login probe received HTTP 429 on attempt 34,
after prior login traffic in the same five-minute window. Server Actions share the
server's source IP; do not trust arbitrary forwarded headers. Evaluate CAPTCHA,
privileged MFA, approved origins and email delivery before deployment. No paid
feature was enabled.

## Synthetic actors and administrator bootstrap

Three test-only Auth users and profiles now persist for repeatable verification:

| Prefix          | Suggested email                   | Required database state                                         |
| --------------- | --------------------------------- | --------------------------------------------------------------- |
| `TEST_ALLOWED`  | `phase0-allowed@example.invalid`  | Active, explicitly assigned SUPER_ADMIN                         |
| `TEST_DENIED`   | `phase0-denied@example.invalid`   | Pending, no roles                                               |
| `TEST_DISABLED` | `phase0-disabled@example.invalid` | Disabled with an explicit role, proving status overrides grants |

They were created through Auth administration with auto-confirm enabled. Strong
generated passwords exist only in ignored `.env.test.local`; no password, token or
generated UUID entered source/migration history. The tracked assignment migration
resolves the three fixed emails, asserts their initial pending/unassigned state, then
assigns only the expected test statuses/roles. It must not be reused for real users.

Synthetic fixtures are not the first school administrator. A real administrator
later needs a named approved person, verified UUID and separate activation/role
migration. Never promote every profile or infer privileges from an email domain.
Administrator management remains Phase 2.

## Tests and gate

`pnpm test:db` requires HTTPS, a publishable key, matching project reference,
`TEST_TARGET_ACK=isolated-test-only`, and the approved manifest in
`tests/fixtures/supabase-target.json`. D-01 permits the app and test project to match.
`pnpm test:db` passes eight tests: four provider preflight checks plus anonymous and
three authenticated actors. It verifies anonymous table/RPC denial, private schema
non-exposure, disabled signup/anonymous Auth including an actual rejected signup,
invalid login, own-profile visibility, exact permissions, refresh, forged metadata
non-escalation, direct-write denial and post-logout session revocation.

The applied SQL verification actually switches to authenticated/anonymous Postgres
roles. It checks trigger non-escalation, own-profile isolation, super/management
grants, pending/disabled denial, rejected direct writes, removed roles, changed
status and missing/expired/mismatched/revoked sessions. All fixture writes roll back.
This is real database permission evidence, but does not verify Auth-issued JWTs.

The separate 14-assertion pgTAP file has not run. The migration is executable SQL
evidence, not a claimed pgTAP run. Future changes need fresh SQL verification through
the MCP workflow or an explicitly approved runner. Do not run write tests through
read-only `execute_sql`.

`pnpm test:e2e:auth` passes three real-provider browser journeys: allowed
login/reload/logout and protected-route denial after logout, plus pending and disabled
account denial. SQL contracts separately verify expired/missing/mismatched sessions
and current database role/status changes. The standalone pgTAP file and hosted GitHub
workflow remain unrun and must not be called passing; required local gates and real
provider checks passed. Keep live-provider traces/screenshots off.

## Cleanup and eventual live use

Three Auth users, three profiles and two role assignments are persistent test
fixtures. Zero Auth sessions remained after the final tests. Preserve four roles,
nine permissions and 21 role-permission mappings: they are application configuration.
Preserve the schema and migration history.

Before conversion, inventory and remove only identified synthetic fixtures through
reviewed operations. Revoke sessions before deleting test Auth accounts. Verify
counts/permissions, remove test credentials, disable the approved test-target
manifest and CI dispatch, and rebuild with the intended environment. Do not truncate
the whole schema. Backups/recovery, real administrator provisioning, MFA, monitoring,
approved origins and the later release gate still apply. Clearing data alone is not
release approval; D-07 remains open.

For failures, revert application changes first and use reviewed forward migrations
for policy/schema repairs. Preserve Auth/profile/role records. Never reset live data
as a troubleshooting shortcut. Phase 1 remains unstarted.
