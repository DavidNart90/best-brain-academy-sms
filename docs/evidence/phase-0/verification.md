# Phase 0 verification — 31 August 2026

**Gate: passed on 1 September 2026.** Local, database and real-provider checks pass.
This report records Codex's work in the current working tree; no deployment or real
privileged school account was created. Four migrations and hosted signup hardening
are verified; see the
[backend evidence](backend-verification.md) for current state.

## Implemented scope

- Reproducible pnpm / Node 24.20.0 / Next 16.3.3 / strict TypeScript foundation;
  Tailwind and PostCSS 4.3.3, owned shadcn primitives, Inter and Lucide.
- Validated public configuration, server-only Supabase access, verified Auth user
  plus caller-bound database permission lookup, SSR cookie handling, login/logout,
  safe errors, active-account checks and direct endpoint denial.
- Sidebar/top bar, permission-aware navigation, all documented route shells,
  reusable page states, exact decimal-string money display and an explicitly
  synthetic chart/four-KPI/collections preview. No business writes or finance logic.
- Applied schema/RLS, event-trigger grant hardening and executable SQL verification
  migrations; MCP-generated schema types; provider preflight/integration harness;
  14 separate unrun pgTAP assertions; real-provider browser smoke setup and CI.

## Commands and observed results

| Check                            | Result                     | Scope                                                                                                       |
| -------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm exec node --version`       | Exit 0, `v24.20.0`         | pnpm-managed runtime; system default was not changed                                                        |
| `pnpm install --frozen-lockfile` | Exit 0                     | Exact compatible pins; `unrs-resolver` install script intentionally remains blocked                         |
| `pnpm lint`                      | Exit 0                     | Zero lint warnings                                                                                          |
| `pnpm format:check`              | Exit 0                     | Code/config/new docs; authoritative pre-existing planning docs excluded from wholesale reformatting         |
| `pnpm typecheck`                 | Exit 0                     | Next route type generation plus strict `tsc --noEmit`                                                       |
| `pnpm test`                      | Exit 0, 25 tests / 5 files | Environment rejection, access contracts, route permission mapping, login validation, money formatting       |
| `pnpm test:coverage`             | Exit 0                     | 96.66% lines, 93.10% branches, 97.29% statements, 100% functions over explicitly selected handwritten logic |
| `pnpm build`                     | Exit 0                     | Both synthetic-config production build and final current-environment build passed                           |
| `pnpm test:e2e`                  | Exit 0, 21 tests in 47.9 s | Production app with loopback synthetic Auth; Chromium desktop/tablet/mobile                                 |
| `pnpm test:client-boundary`      | Exit 0                     | 21 client JS chunks, 1,469,567 uncompressed bytes across all routes; no listed server/key markers           |
| `pnpm audit --json`              | Exit 0                     | 0 reported vulnerabilities, 692 dependencies; not a complete provenance/security audit                      |
| React Doctor full scan           | Exit 0; no errors          | Review notes below; score and external supply-chain scan disabled                                           |
| `pnpm test:db`                   | Exit 0, 8 tests            | Four provider preflight plus anonymous/allowed/pending/disabled real Auth/RLS tests                          |
| `pnpm test:e2e:auth`             | Exit 0, 3 tests            | Allowed login/reload/logout plus pending and disabled denial through real Supabase                           |
| pgTAP / hosted CI                | **Not run**                | Separate pgTAP file not run; migration SQL contract checks passed; workflow not executed on GitHub          |

Coverage is **not whole-application coverage**. Its include set is environment
validation, permission contracts/catalog, login schema and money formatting. UI
and server boundaries have separate browser evidence. Executed SQL contract checks
are described in the backend report; no SQL percentage coverage is claimed.

The Windows Playwright command shim once returned exit 0 after a configuration
exception. `scripts/test-live-auth.mjs` now checks prerequisites itself, invokes the
Node CLI directly and propagates failure. Re-running missing-config live Auth
checks returned exit 1. Missing infrastructure is never counted as a passing test.

## Browser and design evidence

The latest suite runs seven scenarios for each viewport: anonymous routes/API and
login validation; invalid/rate-limited/disabled/unassigned login; dashboard filters,
keyboard behavior and logout; account disablement and unavailable access service;
26 documented module/detail shells and not-found; management denial and query-role
spoofing; revoked sessions and removed permissions. Synthetic fixtures cannot prove
Supabase's real session behavior or RLS.

- Desktop: 1440 × 1000 CSS viewport, persistent 232 px sidebar and 72 px top bar.
- Tablet: 768 × 1024 CSS viewport, collapsible navigation and two-column KPIs.
- Mobile: iPhone 13 emulation, measured content viewport 390 × 664; one-column
  summaries, stacked filters and horizontally scrollable data region.
- Axe: no violations in tested login/dashboard states. This is not a full WCAG audit.
- Keyboard: focusable table region scrolls with ArrowRight; mobile dialog Escape
  returns focus to navigation trigger. The skip link appears only on focus.
- Console: no uncaught page errors in the normal dashboard journey. Intentional
  access-service failure tests log the safe server error and verify a failed-closed
  UI plus HTTP 503; these are expected negative-test output.
- In-app browser: login, dashboard, status filter and desktop composition inspected.
  Final current-environment build redirects an anonymous dashboard visit to login;
  no warning/error entries were observed. Browser viewport restored afterward.

GPT Taste was applied with the project's dashboard overrides: reference composition,
school red `#BD3B36` / hover `#9F302C`, compact Inter typography, restrained surfaces,
functional search/filter controls, no decorative gradients, invented growth,
marketing scroll choreography or randomized layout. The book icon is a provisional
wordmark asset; an approved school crest was not supplied.

Screenshots contain synthetic accounts and rows only:

| Surface          | Desktop                          | Tablet                         | Mobile                         |
| ---------------- | -------------------------------- | ------------------------------ | ------------------------------ |
| Dashboard        | [Desktop](dashboard-desktop.png) | [Tablet](dashboard-tablet.png) | [Mobile](dashboard-mobile.png) |
| Login validation | [Desktop](login-desktop.png)     | [Tablet](login-tablet.png)     | [Mobile](login-mobile.png)     |

Initial axe checks caught an unfocusable horizontal table region; that was fixed
and all three viewports passed. The initial keyboard test used End incorrectly;
the final check uses ArrowRight and waits for observable scrolling. No rules were
disabled to make these checks pass.

## Initial network/bundle observations

Warm local production reload, Windows, one browser worker, no CPU/network throttle,
synthetic Auth and five demo rows. Resource timings exclude the main navigation
body from resource totals and are browser-cache affected. These single samples are
not cold-load, Core Web Vitals, p50/p95, real-database or load-test evidence.

| Viewport | Navigation duration | Resource requests | Transferred resource bytes | Decoded resource bytes |
| -------- | ------------------: | ----------------: | -------------------------: | ---------------------: |
| Desktop  |            130.6 ms |                27 |                      9,640 |              1,404,102 |
| Tablet   |            113.0 ms |                16 |                          0 |              1,393,355 |
| Mobile   |             95.4 ms |                16 |                          0 |              1,393,355 |

Zero transfer size reflects cached resources, not a zero-byte application. Raw
snapshots: [desktop](network-desktop.json), [tablet](network-tablet.json),
[mobile](network-mobile.json). All-route client JS totals 1,469,567 bytes uncompressed;
this is not route initial-transfer size. Recharts is dynamically imported inside a
small chart island. Full realistic performance work remains Phase 1/5 under D-02.

## Backend inspection and unresolved gate

Initial read-only inspection found an empty schema and two event-trigger grant
warnings. After the Chief Engineer designated the existing Free project as test-only,
four MCP migrations were applied, actual SQL role checks passed, types were generated
and three explicit test actors were configured. The signed-in dashboard was used to
disable public signup; an actual signup attempt was rejected.

See [backend verification](backend-verification.md) for identities, RLS scenarios,
eight passing database/provider tests, three live browser journeys, hosted settings,
rate-limit evidence and final fixture counts. Hosted CI and the standalone pgTAP file
remain unrun and are reported as residual limits. P0-09 passed; Phase 1 remains
unstarted.

## Review notes and recovery

React Doctor's required diff scan could not evaluate initially untracked source, so
a full scan was run instead (`--verbose --scope full --yes --no-score
--no-supply-chain`). The final scan covered 66 files: zero errors and seven reviewed
warnings. No score is claimed. Reviewed residual warnings concern static
API header allocation, short navigation array passes, normal shadcn variant exports,
the chart implementation import (already behind a dynamic parent), and browser
client/fixture files referenced outside static analysis. A throwing URL parse in
test configuration was changed to `URL.parse` with explicit denial. No diagnostic
suppression was added. CI credential-scope findings were fixed by restricting real
credentials to test steps on trusted default-branch manual runs.

ESLint 10 was incompatible with Next's installed React plugin; ESLint 9.39.5 passes
and its upstream deprecation is recorded for review. The CSP is a basic frame/base/
object/form restriction, not a complete nonce-based script policy. Live abuse and
privileged MFA settings need verification before any Internet deployment.

Migrations are applied; use reviewed forward repairs if needed. Keep local environment files untracked. Rebuild with
the intended public environment after synthetic E2E work. For subsequent migration
failures, preserve Auth/role records and use reviewed forward fixes; reset only a
confirmed disposable test target. Phase 1 remains unstarted.
