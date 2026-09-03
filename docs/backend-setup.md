# Backend setup and verification

The Chief Engineer designated `cefwopisbgfctzdloequ` as test-only on 31 August 2026
and authorized migrations on its Free plan. D-01 is resolved for testing; no separate
paid project or branch is required. The dashboard's main/Production label does not
authorize live school data. Phase 0 passed its integrated gate on 1 September 2026.
Phase 1 academic configuration is verified complete after the Chief Engineer supplied
the school requirements and operating profile. Phase 2 is dependency-ready.

## Applied migrations

Applied through MCP, with matching local files and verified remote history:

| Identity                                              | Purpose                                                                                             |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `20260831200632_foundation_access`                    | Five RLS tables, pending-profile trigger, caller-bound access helpers/RPC, role definitions         |
| `20260831200637_restrict_existing_rls_trigger_grants` | Revoke API execution of the existing RLS event-trigger function; preserve its owner and trigger     |
| `20260831200843_verify_foundation_access_contracts`   | Executable SQL acceptance checks; all fixture writes roll back inside a subtransaction              |
| `20260901100905_configure_phase0_test_actors`         | Resolve fixed synthetic emails and assign explicit test-only status/roles                           |
| `20260901111519_academic_configuration`               | Academic cycles, terms, classes, transport locations/settings, immutable audit, RLS and seed values |

Do not reapply or edit applied migrations. Reverify the project, tables and migration
history before new changes. MCP-generated types now represent the actual schema.
The security advisor reports only leaked-password protection disabled; Supabase
documents that control as Pro-only, while this authorized target is Free. New and
existing indexes report informational unused notices before representative workload;
review them with the real reporting workload in Phase 5. See [Phase 0 backend evidence](evidence/phase-0/backend-verification.md)
and the [Phase 1 configuration evidence](evidence/phase-1/configuration-verification.md).

## Access model

- Authenticated clients have SELECT only; no profile or role writes, even for super
  administrators. Anonymous clients have no application-table or access-RPC grants.
- New Auth accounts receive pending profiles and no roles. Editable metadata supplies
  only a bounded display name; role/status metadata never grants access.
- The invoker RPC returns the caller's current database grants. Restricted private
  definer helpers avoid recursive RLS and require a matching, unexpired Auth session.
- Management has dashboard/financial/report read access only. Further grants depend
  on D-03. Protected pages and the endpoint authorize server-side.
- Academic configuration is readable by active staff and writable only with
  `settings.manage`; audit history also requires `audit.read` and cannot be changed
  through the API. No people records, finance writes or Storage buckets exist.

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
approved origins, monitoring, and the explicitly accepted password-only privileged
access risk before deployment. No paid feature was enabled.

## Synthetic actors and administrator bootstrap

The three historical Phase 0 test actors were removed on 1 September 2026 at the
Chief Engineer's direction. The hosted project now contains one confirmed active
SUPER_ADMIN, created through the reviewed bootstrap, with mandatory first-login
password replacement. Do not recreate the old fixed test emails on this target.

Public signup remains disabled. Additional administrators must be created by the
Super Administrator with an explicit role and a temporary password. The Auth Admin
operation confirms the email without sending an invitation or OTP; the temporary
password must be shared through a trusted channel and is replaced at first sign-in.
Never promote every profile or infer privileges from an email domain.

## Tests and gate

The historical `pnpm test:db` setup requires HTTPS, a publishable key, matching project reference,
`TEST_TARGET_ACK=isolated-test-only`, and the approved manifest in
`tests/fixtures/supabase-target.json`. D-01 permits the app and test project to match.
It previously passed eight tests: four provider preflight checks plus anonymous and
three authenticated actors. It verifies anonymous table/RPC denial, private schema
non-exposure, disabled signup/anonymous Auth including an actual rejected signup,
invalid login, own-profile visibility, academic configuration read/write RLS, exact
permissions, refresh, forged metadata non-escalation, direct-write denial and
post-logout session revocation.

The applied SQL verification actually switches to authenticated/anonymous Postgres
roles. It checks trigger non-escalation, own-profile isolation, super/management
grants, pending/disabled denial, rejected direct writes, removed roles, changed
status and missing/expired/mismatched/revoked sessions. All fixture writes roll back.
This is real database permission evidence, but does not verify Auth-issued JWTs.

The separate 14-assertion pgTAP file has not run. The migration is executable SQL
evidence, not a claimed pgTAP run. Future changes need fresh SQL verification through
the MCP workflow or an explicitly approved runner. Do not run write tests through
read-only `execute_sql`.

`pnpm test:e2e:auth` previously passed three real-provider browser journeys: allowed
login/reload/logout and protected-route denial after logout, plus pending and disabled
account denial. SQL contracts separately verify expired/missing/mismatched sessions
and current database role/status changes. The standalone pgTAP file and hosted GitHub
workflow remain unrun and must not be called passing; required local gates and real
provider checks passed. Keep live-provider traces/screenshots off.

## Cleanup and eventual live use

The hosted cleanup left one Super Administrator and zero students, guardians,
relationships, enrollments, staff, staff assignments, provisioning requests,
sessions, photo objects, and audit rows. Preserve four roles, 16 permissions, 36
role-permission mappings, the schema, migration history, and school configuration.

The stale ignored `.env.test.local` credential file was removed with the actors.
Before conversion, disable the approved test-target manifest and CI dispatch, and rebuild with the intended environment. Do
not truncate the whole schema. Backups/recovery, monitoring, approved origins,
password-policy acceptance, and the later release gate still apply. Clearing data
alone is not release approval; D-07 remains open.

For failures, revert application changes first and use reviewed forward migrations
for policy/schema repairs. Preserve Auth/profile/role records. Never reset live data
as a troubleshooting shortcut. The exact school network speed remains a Phase 5/6
field-validation item, not a blocker for Phase 2.
