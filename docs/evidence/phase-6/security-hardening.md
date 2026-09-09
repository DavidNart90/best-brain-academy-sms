# Phase 6 security hardening evidence

**Date:** 9 September 2026  
**Scope:** P6-01 security slice only. This does not close P6-01 or approve production release; D-05 hosting, backup/Storage recovery, recovery objectives, and monitoring ownership remain open.

## Route and access audit

- Static inventory checked 37 page routes and 17 API route files against an explicit allowlist.
- All 34 operational pages under `(protected)` call `requirePermission`; the protected layout also requires a current verified Supabase user, an active profile, at least one role, and completion of the mandatory password change.
- `/change-password` independently requires a verified active account in the forced-change state. `/login` is intentionally public and `/` only redirects to the dashboard.
- Fourteen API route files require a fresh access context and permission. The only public API files are the login boundary, forced password-change boundary, and read-only school-branding logo proxy.
- Live unauthenticated checks on `localhost:3000` verified 35 protected page redirects and 15 protected API methods returning `401`. Cross-origin login returned `403`; an oversized login body returned `413`; the login page carried nonce CSP, `nosniff`, and frame-denial headers.

## Hardening applied

- Added exact Origin/Host and Fetch Metadata checks to every POST Route Handler.
- Replaced unbounded JSON/multipart parsing with streaming byte limits before JSON, workbook, photo, or logo parsing.
- Added a local hashed fixed-window login backstop in addition to Supabase Auth's provider rate limits.
- Added database-owned per-account rate-limit policies for administrator changes, school/academic configuration, student/staff changes, finance settings and transactions, invoice search, imports, exports, uploads, report exports, and password changes. Callers cannot provide their own limits or reset windows.
- Added rate-limit enforcement to sensitive Server Actions and API exports/uploads/imports. Administrator provisioning enforces its limit in the Edge Function boundary so direct calls cannot bypass it.
- Deployed JWT-verified `administrator-provision` Edge Function version 6 with bounded JSON input, no-store/nosniff responses, fresh caller verification, database rate limiting, and the existing permission-gated preparation RPC.
- Replaced the minimal static CSP with a per-request nonce CSP and added DNS-prefetch, origin-agent-cluster, opener, HSTS-in-production, referrer, permissions, frame, and content-type headers. Private responses remain `no-store`.
- Added an index for rate-limit policy maintenance and aligned generated database types with `consume_rate_limit`.

## Database and storage audit

- Supabase MCP applied `20260909132831_security_rate_limits` and `20260909134702_rate_limit_bucket_index` to the authorized test-only project.
- A rollback-only database proof passed 10 checks: both private tables have RLS; anonymous/authenticated users cannot inspect policy/counters; anonymous execution is denied; the authenticated function grant is deliberate; the fixed window allows two and denies the third request; unknown buckets are rejected; a revoked session is denied immediately.
- All 35 public tables have RLS. Anonymous users can read none of the public tables or three public views. All three views use `security_invoker=true`.
- All 35 authenticated-callable `SECURITY DEFINER` functions have an empty fixed `search_path` and an active-session permission boundary, either directly or through a private core. Their advisor notices are expected exposure-boundary warnings, not unreviewed grants.
- `student-photos` remains private, limited to JPEG/PNG/WebP and 5 MiB with permission-gated object policies. `school-branding` is intentionally public-read for the login identity, PNG-only, and limited to 2 MiB; writes remain permission-gated.

## OWASP ASVS 5.0 Level 2 review map

| Area                            | Evidence and disposition                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V4 API and web-service security | Explicit public-route allowlist, fresh authentication/permission guards, same-origin mutation checks, bounded bodies, safe status handling, and live negative-route verification pass.                                                   |
| V5 File handling                | Server, Storage, MIME, size, and image-signature/dimension limits pass. Production malware scanning or safe image re-encoding remains a D-05/P6-01 deployment decision.                                                                  |
| V6 Authentication               | Supabase provider throttling, generic login failures, a hashed local backstop, forced temporary-password replacement, and bounded password requests are present. Leaked-password screening remains unavailable on the Free test project. |
| V7 Session management           | Server authorization uses `getUser` plus a fresh database access context tied to a live `auth.sessions.session_id`; the rollback proof confirms immediate denial after session revocation.                                               |
| V8 Authorization                | Per-page and per-API permissions, RLS on every public table, security-invoker views, private storage, fixed definer search paths, and fresh permission checks pass the inspected scope.                                                  |
| V13 Configuration               | Server-only privileged modules, client-bundle boundary scan, CSP, security headers, no production dependency advisories, and JWT verification on the privileged Edge Function pass.                                                      |
| V14 Data protection             | Dynamic/private responses use `no-store`; student photos are private; logs and client chunks contain no discovered key markers. Retention and tested database plus Storage recovery remain open under D-05.                              |

## Verification

- `pnpm format` — passed.
- `pnpm lint` — passed with zero warnings.
- `pnpm typecheck` — passed.
- `pnpm exec vitest run src/lib/security/request.test.ts src/features/finance/server/actions.test.ts` — 14/14 passed.
- `pnpm test:security-routes` — 37 pages and 17 API route files passed the static access/mutation checks.
- The fast static route-security check now runs in the normal GitHub quality job; no browser E2E job was added.
- `pnpm test:security-live` — 35 protected pages, 15 protected API methods, auth mutation defenses, and response headers passed against port 3000.
- `pnpm test:client-boundary` — 43 client chunks checked; no forbidden server implementation/key markers found.
- `pnpm build` — production build passed; no broad E2E suite was added or run.
- `pnpm audit --prod --audit-level low` — no known production dependency vulnerabilities.
- Supabase security advisor — no ERROR findings; six INFO no-policy notices are intentional private deny-all tables. Thirty-five WARN notices are the reviewed permission-gated definer functions. The remaining leaked-password-protection warning is a known limitation of the Free test project.
- Supabase performance advisor — eight historical unindexed-FK INFO notices and 73 unused-index INFO notices; the newly introduced rate-limit FK is indexed.

## Remaining release work

- D-05 still needs the Chief Engineer's hosting/domain/region, retention, recovery objectives, backup coverage/cost, and monitoring owner decisions.
- Before production, enable Supabase leaked-password protection on a plan that supports it, require/verify privileged MFA, configure approved production origins, rehearse database and Storage recovery, and run the single release-candidate suite required by P6-05.
- Arcjet was evaluated, but its CLI is not authenticated and no project key exists. No inactive SDK code was added. The implemented controls do not depend on Arcjet; an external edge/WAF layer can be selected with the hosting decision.
- Public Supabase RPCs remain intentionally callable by authenticated roles and enforce fresh session/permission checks themselves. The application quotas cover supported UI/API paths, and administrator provisioning is limited at its direct Edge boundary; platform-wide throttling for direct PostgREST traffic remains part of the D-05 edge/WAF decision.
