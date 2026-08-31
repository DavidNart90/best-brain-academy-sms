# Best Brain Academy: Implementation Plan

**Owner:** Chief Engineer (the user)  
**Created:** 31 August 2026  
**Execution status:** Phase 0 blocked at its integrated backend gate; local foundation verified within the scope below.  
**Next phase:** Remain in Phase 0 until P0-09 is verified.  
**Current implementation task:** P0-05 waits for synthetic Auth credentials; schema/RLS, hosted signup restriction and local regression checks are verified.

## 1. How to Use This Plan

Read [AGENTS.md](AGENTS.md), [Project.md](Project.md), and [design.md](Project%20Files/design.md) at session startup, then this plan's current phase, dependencies, decisions, and handover. Read the [original project guide](Project%20Files/PROJECT_GUIDE_BEST_BRAIN_ACADEMY.md) for business rules and the [detailed design system](Project%20Files/design_system.md) plus [inspiration image](Project%20Files/design_inspiration.jpg) for visual work.

This document controls sequence and progress, not product scope. `Project.md` controls engineering standards; the original guide controls business rules; the design documents control appearance. This plan adds the requested Phase 0 foundation before the original guide's six phases. It does not authorize production changes, expand scope, or record unprovided approvals.

When implementation is requested, begin the next dependency-ready task and proceed within the authorized scope. Do not stop for routine permission on every task. Bring material scope, architectural, financial-policy, and release-risk decisions to the Chief Engineer with evidence and a recommendation. Do not skip a failed gate to make the schedule look complete.

### Task status and evidence

- **Not started:** No implementation claimed.
- **In progress:** Active work; record owner, files, and next action in the handover.
- **Blocked:** A specific dependency is unavailable; record what is needed and continue independent authorized work.
- **Verified complete:** Deliverable and applicable checks passed, with an evidence entry. Written code without verification stays in progress or blocked.

Each task table lists its direct dependencies; prerequisites also apply transitively. A phase is complete only when its exit-gate task is verified complete. Dependencies within a phase permit independent work, but do not authorize spawning agents automatically.

Keep IDs stable. Update this plan after meaningful progress and before ending an implementation session. Do not silently remove tasks, weaken acceptance criteria, or mark skipped tests as passing. Use evidence records containing task ID, date, responsible agent, changed files/commit if available, migration identity, commands and exit codes, browser/database results, artifact paths, and remaining risks. Do not invent commit IDs or store secrets in evidence.

## 2. Phase Overview and Requirement Coverage

| Phase | Outcome | Entry dependency | Exit gate | Status |
| --- | --- | --- | --- | --- |
| 0 | Reproducible, protected application foundation and reference-based shell | Specifications available; environment decisions only block dependent tasks | P0-09 | Blocked — authenticated-provider journeys / hosted CI; D-01 resolved for testing |
| 1 | Academic configuration, school settings, audit foundation, fast table pattern | P0-09 | P1-05 | Not started |
| 2 | Admissions, people records, enrollment history, administrator management | P1-05 | P2-06 | Not started |
| 3 | Invoice, payment, receipt, reversal, and outstanding-balance correctness | P2-06 | P3-09 | Not started |
| 4 | Audited expenses and salary deductions | P3-09 | P4-04 | Not started |
| 5 | Reconciled dashboards/reports, exports, and measured performance | P4-04 | P5-05 | Not started |
| 6 | Validated client import, release acceptance, deployment, and handover | P5-05 | P6-08 | Not started |

| Project requirement | Delivery coverage | Required evidence |
| --- | --- | --- |
| AUTH-01 | Phases 0, 2, 6 | Sign-in/session tests, explicit role assignment, denied access, privileged-account protection. |
| ACAD-01 | Phases 1–2 | Valid academic context, archive rules, preserved enrollment history. |
| PEOPLE-01 | Phase 2 | Admission/student/guardian/staff journeys, uniqueness, no automatic staff login. |
| FEE-01 | Phase 3 | Fee configuration, immutable invoice snapshots, correct historical reprints. |
| PAY-01 | Phase 3 | Exact amounts, atomic writes, concurrent requests, idempotency, reversals, unique receipts. |
| OPS-01 | Phase 4 | Valid expenses/deductions, protected corrections, void exclusion from totals. |
| REPORT-01 | Phase 5 | Reports and exports reconcile to authoritative records under the same filters. |
| ADMIN-01 | Phases 0–2, 6 | Restricted settings/admin operations, audit integrity, controlled provisioning. |
| IMPORT-01 | Phase 6 | Preview, validation, explicit confirmation, retry safety, reconciliation. |
| SEC-01 | Every phase | Server authorization, RLS, safe secrets/storage, security review and negative tests. |
| PERF-01 | Phases 1–6 | Bounded queries, query plans, realistic data/load measurements, no security bypass. |
| QA-01 | Every phase | Relevant unit/integration/browser checks plus lint, typecheck, and production build. |

## 3. Gates Applied to Every Phase

### Engineering and design

Use modular features, thin routes, typed server-only data access, validated inputs, semantic tokens, and reusable accessible components. Read `gpt-taste` for every visual change and apply the dashboard-specific overrides in `design.md`. Inspect the reference and desktop/tablet/mobile screenshots. Run `react-doctor` after React changes and use the browser skill for interactive inspection. Read other skills when relevant; a missing skill is a reported limitation, not permission to pretend compliance.

### Database changes

Apply the already-defined Supabase and Postgres skill workflow. Confirm the target environment, inspect tables/migration history through MCP, prepare versioned SQL, apply reviewed migrations through MCP, regenerate types, and verify grants/RLS with representative actors. Record advisors and diagnostic evidence; do not substitute a service-role query for a permissions test.

Use separate migrations for coherent changes. Record compatibility, locking/backfill effects, verification, and forward-recovery instructions. Test first in an isolated environment. No production reset, untracked DDL, manual deletion of posted records, or silent direct-connection fallback. If MCP is unavailable, prepare code/docs/tests offline but do not mark database tasks or the phase verified complete.

### Test and build gate

Once P0-02 establishes tooling, phase exit requires these checks on the integrated result:

```text
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:db
pnpm build
pnpm test:e2e
```

Run tests against controlled fixtures and the intended test target. E2E configuration must serve the production build using `pnpm start` in CI. Check browser console/network errors, keyboard navigation, meaningful states, and responsive layouts. By release, cover Chromium, Firefox, and WebKit. Retain useful failure traces/screenshots without credentials or personal data.

For a task that does not touch a particular layer, record why a check is not applicable; this does not waive the phase's integrated gate. An unavailable environment means the affected gate is blocked, not passed. Coverage and latency targets remain proposals from `Project.md` until baselined; any adjustment needs a recorded rationale rather than editing a target to fit a failure.

## 4. Phase 0: Production-Quality Foundation

**Objective:** Establish the approved stack, authentication, permission boundaries, and dashboard shell without business CRUD.  
**Requirements:** AUTH-01, ADMIN-01 foundation, SEC-01, PERF-01 foundation, QA-01.  
**Entry:** Read the specifications; identify D-01/D-02 dependencies without blocking offline scaffolding.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P0-01 | None | Inspect repository; scaffold Next.js App Router with `src/`, strict TypeScript, supported Node LTS, pnpm, and latest stable compatible Tailwind. Recheck versions, use v4 CSS/PostCSS configuration, pin dependencies, and preserve existing documents. | Verified complete — E0-01 |
| P0-02 | P0-01 | Configure ESLint, Prettier, typecheck, Vitest/Testing Library, Playwright, database-test harness, and CI commands. Create meaningful test scaffolding and isolated fixture conventions; do not use empty tests as green gates. | Blocked — local tooling and migration SQL checks pass; authenticated harness/hosted CI pending, E0-02/E0-04 |
| P0-03 | P0-01; D-01 | Verify intended Supabase development/test targets via MCP. Configure browser/server clients, public versus secret environment variables, `.env.example`, and environment validation. | Verified complete — approved test-only project matches clients and harness; E0-04 |
| P0-04 | P0-03 | Create profiles linked to `auth.users`, roles, permissions, role-permission and user-role assignments, RLS/grants, and safe profile creation. Seed role definitions; document explicit initial administrator assignment without automatic escalation. | Verified complete — three migrations applied, actual SQL role/grant/trigger checks passed, generated types and bootstrap documented; E0-04 |
| P0-05 | P0-04 | Implement email/password login, logout, verified SSR session handling, protected routes, redirects, account-status enforcement, sign-in abuse controls, and safe auth errors. Disable public signup. | Blocked — signup disabled and live rejection verified; real actor credentials, expiry/refresh and abuse enforcement remain, E0-05 |
| P0-06 | P0-05 | Implement server-only permission helpers, minimal typed data contracts, and permission-aware navigation. Cover direct endpoint access, not just hidden menu items. | Blocked — local contracts/direct-denial checks pass; real-provider gate pending |
| P0-07 | P0-01; P0-06 | Implement school-red tokens, accessible login, AppShell, sidebar, top bar, state components, Money formatting, and chart plus four-KPI dashboard with visibly labeled synthetic fixtures. | Blocked on P0-06 — UI implemented, responsive/keyboard/axe checks pass; E0-02 |
| P0-08 | P0-06; P0-07 | Add the full Phase 0 route shells from the brief, including expandable Admissions/Financials navigation, permission-denied states, loading/error/not-found handling, and clearly unavailable future actions. | Blocked on dependencies — 26 module/detail shells checked locally; E0-02 |
| P0-09 | P0-02; P0-08 | Verify foundation, update README setup/run/migration instructions, and record the first integrated quality/security/browser evidence. | Blocked — local and SQL/preflight checks pass; full authenticated Auth and hosted CI gates remain, E0-04/E0-05 |

**Affected areas:** `src/app/`, shared components, `features/auth/`, `lib/supabase/`, `lib/auth/`, `lib/permissions/`, generated types, environment/configuration files, CI, and auth/permission migrations. Establish `/login`, `/dashboard`, `/admissions`, `/admissions/new`, `/students`, `/classes`, `/staff`, the documented `/financials/*` routes, `/reports`, `/administrators`, and `/settings`.

**Exit evidence:** All common gates; successful and failed login, expiry/refresh/logout, tampered role denial, disabled account denial, no public signup, safe profile trigger, and direct unauthorized route/action access. Inspect desktop/tablet/mobile shell and assert `GHS 1,250.00` formatting. Verify no privileged values enter client bundles. Record initial bundle/network measurements; do not claim real table performance from demo fixtures.

**Recovery:** Rebuild only disposable test environments. Never reset a live Auth project or use a role seed to promote arbitrary accounts.  
**Excluded:** People CRUD, academic business CRUD, fee calculations, payments, receipts, expenses, reporting, and production deployment.

## 5. Phase 1: Academic Configuration and Shared Operations

**Objective:** Make school/academic configuration and audit behavior usable, and establish the first measured table implementation.  
**Requirements:** ACAD-01, ADMIN-01, SEC-01, PERF-01, QA-01.  
**Entry:** P0-09 verified complete.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P1-01 | P0-09 | Create academic-year, term, class, school-setting, and protected audit structures with validation, referential integrity, suitable indexes, and permission policies. | Not started |
| P1-02 | P1-01 | Implement authorized academic years/terms/classes and school settings, valid current context, archive behavior, and audited configuration changes. Use configurable values rather than real-school assumptions. | Not started |
| P1-03 | P1-02 | Build reusable table/query contracts: bounded server pagination, stable sorting, URL filters, debounced search, typed errors, and consistent empty/loading states. Apply first to classes/configuration. | Not started |
| P1-04 | P1-03; D-02 | Establish synthetic data generation and reproducible read/browser benchmarks. Record query count, payloads, RLS-aware plans, network assumptions, and initial target assessment. | Not started |
| P1-05 | P1-04 | Verify academic/context/archive rules, audit restrictions, denied writes, table behavior, and common gates. | Not started |

**Affected areas:** `features/academics/`, `features/settings/`, shared table controls, `/classes`, academic/school settings, audit helpers, and academic/settings/audit migrations.

**Exit evidence:** Reject invalid term/year relationships and duplicate identifiers; enforce current-context rules; preserve referenced archives; management cannot change configuration or audit history. Refresh/back navigation retains filters, sorting is database-wide, page limits cannot be bypassed, and no per-row query waterfall appears. Record actual bounded-query benchmarks rather than indexing by assumption.

**Recovery:** Prefer additive schema and setting changes; preserve referenced records and audit entries.  
**Excluded:** Admissions, student/staff management, and financial transactions.

## 6. Phase 2: People and Administrator Workflows

**Objective:** Support operational admissions, student/guardian/staff records, historical enrollment, and controlled user administration.  
**Requirements:** PEOPLE-01, ACAD-01, AUTH-01, ADMIN-01, SEC-01, PERF-01, QA-01.  
**Entry:** P1-05 verified complete.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P2-01 | P1-05 | Create students, guardians, relationships, enrollments, staff, and class assignments with unique identifiers, history preservation, indexing, and least-privilege policies. | Not started |
| P2-02 | P2-01 | Implement admission validation and transactional student/guardian/enrollment creation, records search, duplicate handling, and explicit failure states. Admission works without an invoice. | Not started |
| P2-03 | P2-02 | Implement student profiles, guardian links, enrollment changes/history, and secure photo upload/access. Keep finance tabs explicitly unavailable until Phase 3. | Not started |
| P2-04 | P2-01 | Implement staff profiles, assignments, search, archive rules, and audit context; a staff record creates no login account. | Not started |
| P2-05 | P1-05; D-03 | Implement authorized administrator invitations/provisioning, role assignment, account disablement, fresh permission enforcement, and privileged-account MFA workflow. Prevent self-escalation and unsafe loss of administrative access. | Not started |
| P2-06 | P2-03; P2-04; P2-05 | Verify complete people/admin journeys, private storage boundaries, concurrency/uniqueness, role changes, search performance, and common gates. | Not started |

**Affected areas:** `features/admissions/`, `features/students/`, `features/staff/`, admin/auth modules, corresponding list/detail routes, Storage policies, and people/enrollment migrations.

**Exit evidence:** Duplicate admissions rejected; failure does not leave half-created admissions; historical classes remain readable; staff/login separation holds. Unauthorized users cannot fetch another restricted resource by changing an ID or object path. Test expired/signed storage links, invalid uploads, disabled users, role removal with old sessions, and persisted table filters. Benchmark representative student records with RLS enabled.

**Recovery:** Preserve historical links; repair imports/records through audited permitted operations. Do not delete people records with financial/history dependencies.  
**Excluded:** Live finance, bulk client import, payroll, attendance, examinations, or parent portals.

## 7. Phase 3: Finance Core

**Objective:** Establish trustworthy invoicing and cash collection before reporting.  
**Requirements:** FEE-01, PAY-01, SEC-01, PERF-01, QA-01.  
**Entry:** P2-06 verified complete; establish financial-policy and document assumptions under D-04.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P3-01 | P2-06; D-04 | Design coherent finance migrations: fee structures/items, invoices/items, payments, reversals, receipts, payment methods, and replay protection. Define exact money transport, numbering, constraints, and permitted write boundaries. | Not started |
| P3-02 | P3-01 | Implement configurable fee types/structures for year/term/class and validation of required/optional amounts without hard-coded school fees. | Not started |
| P3-03 | P3-02 | Implement invoice generation and immutable line/document snapshots, unique numbering, authorized cancellation, invoice views, and school-branded printable/PDF output. | Not started |
| P3-04 | P3-03 | Verify invoice subgate: decimal/rounding rules, snapshot stability after fee/school changes, concurrent numbering, rejected invalid invoices, cancellation permissions, and historical rendering. | Not started |
| P3-05 | P3-04 | Implement atomic payment RPC, protected balance checks, concurrency control, idempotency keys/fingerprints, one receipt record per payment, and atomic audit entries. Deny bypass writes through exposed APIs. | Not started |
| P3-06 | P3-05 | Implement authorized reversals with reason/actor/time, rejection of invalid amounts/overpayments/cancelled-invoice payments, and safe retry/unknown-outcome recovery. | Not started |
| P3-07 | P3-05; P3-06 | Implement payment entry UI, receipt list/view/reprint/PDF, void presentation, and retryable document rendering after commit without repeating the payment. | Not started |
| P3-08 | P3-07 | Implement current outstanding balances, student account history, payment/receipt filters, indexed pagination, and targeted refresh after writes. | Not started |
| P3-09 | P3-04; P3-08 | Verify finance gate through database/API/browser tests, reconciliation, measured read/write behavior, and all common gates. | Not started |

**Affected areas:** `features/finance/`, student finance tabs, invoice/payment/receipt/outstanding routes, document components, RPCs, constraints, grants/RLS, and versioned finance migrations. Exact schema details are reviewed at P3-01; do not treat this list as pre-applied SQL.

**Exit evidence:** Full/partial/multiple payments; zero/negative/overpayment rejection; two writers competing for the same balance; duplicate request returns the original result; changed payload with the same key is rejected; lost response does not duplicate records. Inject a transactional failure and confirm payment/balance/receipt/audit roll back together. Verify receipt uniqueness, prohibited posted edits/deletes, reversal history, exact serialization, and changed settings not altering old documents. A PDF failure must not undo or repeat a committed payment. Measure locking and RPC latency with actual permissions.

**Recovery:** Prefer forward fixes and audited reversals over destructive rollback. Verify recovery on test data before schema promotion.  
**Excluded:** Expenses, salary deductions, live aggregate dashboards/reporting, credits unless explicitly approved, payment gateways, and any full payroll engine. Phase 5 cannot start while P3-09 is unverified.

## 8. Phase 4: Operational Finance

**Objective:** Add traceable expenses and salary deductions without expanding into payroll.  
**Requirements:** OPS-01, ADMIN-01, SEC-01, PERF-01, QA-01.  
**Entry:** P3-09 verified complete.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P4-01 | P3-09 | Create configurable expense/deduction categories, expense/reversal records, salary deductions, restricted attachments, constraints, and indexes/policies. | Not started |
| P4-02 | P4-01 | Implement expense recording, unique references, safe retry behavior, attachments, filters, and authorized voiding with transactional audit context. | Not started |
| P4-03 | P4-01 | Implement staff/month/year deduction records, positive-amount validation, controlled corrections, and audit history; no tax or payslip calculations. | Not started |
| P4-04 | P4-02; P4-03 | Verify permissions, invalid amounts, retries, protected posted records, private attachments, void exclusion, pagination, and common gates. | Not started |

**Affected areas:** Finance expense/deduction modules, staff deduction tab, financial settings, `/financials/expenses`, `/financials/salary-deductions`, Storage policies, and operational-finance migrations.

**Exit evidence:** Posted expenses cannot be edited/deleted through an alternate API; voids retain reason/actor/time and leave active totals; deduction edits are auditable; unauthorized roles and invalid uploads fail. Check concurrent/replayed expense requests and realistic table latency.

**Recovery:** Correct posted expenses through a traceable void/replacement, never by erasing history.  
**Excluded:** PAYE, SSNIT, pensions, payslips, automated payroll, and formal financial reporting.

## 9. Phase 5: Dashboards, Reports, and Performance

**Objective:** Replace demo summaries with reconciled authorized data and deliver useful, fast reporting.  
**Requirements:** REPORT-01, PERF-01, SEC-01, QA-01.  
**Entry:** P4-04 verified complete, including the finance gate transitively.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P5-01 | P4-04 | Build authorized aggregate queries/functions or reviewed views with explicit year/term/date semantics and documented freshness. Reconcile collections, expenses, and balances. | Not started |
| P5-02 | P5-01 | Connect reference-layout dashboard, financial overview, four KPIs, charts, and recent collections to authorized database records; remove demo indicators only where the data connection is implemented and verified. | Not started |
| P5-03 | P5-01 | Implement required financial/admin reports, student statements, and bounded print/PDF/CSV/Excel exports with matching filters and formula-injection protection. | Not started |
| P5-04 | P5-02; P5-03; D-02 | Benchmark representative volumes/concurrency, cache invalidation, query plans, bundles, payloads, and export limits. Fix evidenced bottlenecks and record p50/p95/error rates. | Not started |
| P5-05 | P5-04 | Verify report reconciliation, access boundaries, no stale post-write balances, cross-browser visuals, performance evidence, and common gates. | Not started |

**Affected areas:** `features/reports/`, financial/dashboard queries, `/dashboard`, `/financials`, `/reports`, export modules, aggregate/view/index migrations, and telemetry.

**Exit evidence:** Summaries and exported rows reconcile to invoices/payments/reversals/expenses under identical filters; void records are excluded correctly; management cannot mutate records or export unauthorized fields. Test empty periods, date boundaries, large exports, permission changes, and cache isolation. Inspect official documents in grayscale and at print size.

Use `Project.md` performance budgets with recorded conditions. Start with approximately 5,000 synthetic students, 100,000 financial records, and 20 concurrent sessions, recalibrating from D-02. Measure first usable data separately from skeleton display and warm versus cold behavior. Report browser lab measurements honestly; field p75 metrics require sufficient production samples. Do not call a single successful request a load test.

**Recovery:** Keep aggregates reconstructible from authoritative records; remove a faulty derived cache/view without rewriting the ledger.  
**Excluded:** Client-data import, production rollout, invented growth metrics, and unrelated analytics modules.

## 10. Phase 6: Client Data, Release, and Handover

**Objective:** Deliver a recoverable, verified system on confirmed school configuration.  
**Requirements:** IMPORT-01, REPORT-01, AUTH-01, ADMIN-01, SEC-01, PERF-01, QA-01.  
**Entry:** P5-05 verified complete. Infrastructure, client data, and release decisions apply only to their dependent tasks.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P6-01 | P5-05; D-05 | Establish release environments, domain/configuration plan, security headers/rate limits review, alerts, database plus Storage backups, recovery objectives, and a tested restore runbook. | Not started |
| P6-02 | P5-05 | Implement required CSV/Excel import templates, preview, validation, duplicate detection, confirmation, bounded batches, retry-safe behavior, and import outcome records. | Not started |
| P6-03 | P6-01; P6-02; D-06 | Validate confirmed school files and configuration, rehearse imports in staging, reconcile source counts/amounts, and fix row-level issues without silently discarding data. | Not started |
| P6-04 | P6-03; D-04 | Run school acceptance scenarios, inspect invoices/receipts with confirmed samples, verify actual role matrix/device baseline, and produce a release evidence report. | Not started |
| P6-05 | P6-04 | Run all release gates on the candidate build, review applicable security controls/advisors, rehearse recovery, clear critical findings, and document residual risks for the Chief Engineer. | Not started |
| P6-06 | P6-05; D-07 | After release acceptance, apply reviewed production migrations through MCP, set verified configuration, provision the initial administrator explicitly, and perform authorized final import with reconciliation. | Not started |
| P6-07 | P6-06 | Deploy the accepted build, verify HTTPS/domain/session behavior, run non-destructive production smoke checks, confirm no test data, and monitor launch errors. | Not started |
| P6-08 | P6-07 | Deliver staff training, operating/recovery documentation, access ownership, support responsibilities, and the Chief Engineer's handover acceptance. | Not started |

**Affected areas:** Import modules/templates, deployment/CI configuration, operational documentation, finalized settings/roles, release migrations, production bootstrap, and private storage/backup procedures.

**Exit evidence:** Trial import matches source records and configured fee values; malformed/duplicate rows are explainable; retries do not duplicate records; explicit import confirmation is enforced. Demonstrate database and uploaded-file recovery. Verify privileged MFA or an explicitly accepted alternative, no test accounts/data in production, and no public signup. Record the accepted release/version, migration identities, smoke results, monitoring owner, and handover artifacts. Keep real records out of screenshots and logs.

**Recovery:** Use the rehearsed application rollback or compatible forward migration; do not restore production blindly after new payments have been collected. Pause affected writes and obtain the required decision before a recovery that could discard financial history.  
**Excluded:** New product scope, destructive live testing, automatic production resets, and public release without acceptance.

## 11. Decisions and External Dependencies

These are unresolved planning inputs, not requests to answer everything now. Resolve each by its listed task; progress on independent work can continue.

| ID | Decision/input | Needed by | Owner | Status |
| --- | --- | --- | --- | --- |
| D-01 | Correct school Supabase project, development/test separation, MCP connection, and required environment access. | P0-03 | Chief Engineer supplies context; agent verifies target safely | Resolved for testing, 2026-08-31 — Chief Engineer designated `cefwopisbgfctzdloequ` as the test-only project on the Free plan; no separate paid branch required. Production conversion remains subject to D-07. |
| D-02 | School browsers/devices, typical network, expected volumes/concurrency, and acceptance of measured performance/coverage budgets. | P1-04, revisited P5-04 | Chief Engineer with agent benchmark evidence | Open |
| D-03 | Administrator permission matrix and privileged-account controls, including protection against accidental loss of admin access. | P2-05 | Chief Engineer | Open |
| D-04 | Fee/discount/adjustment and numbering rules, financial date/time semantics, and invoice/receipt samples. Keep credits disabled unless approved; use clearly provisional samples until final confirmation. | P3-01 for policies; P6-04 for final samples | Chief Engineer/client, with configurable agent proposals | Open |
| D-05 | Hosting/domain/region, data retention, recovery objectives, backup coverage/cost, monitoring ownership. | P6-01; revisit earlier if environment choice requires it | Chief Engineer | Open |
| D-06 | Confirmed student/staff/admin files, classes, terms, fees, and categories; treatment of any existing balances must be specified rather than fabricated. | P6-03 | Chief Engineer/client | Open |
| D-07 | Acceptance of release evidence and explicitly documented residual risks; authorization for production promotion/import. | P6-06 | Chief Engineer | Open |

Resolve decisions with a dated rationale and reference, not by merely changing `Open` to `Resolved`. Requirements already established in `Project.md` need no repeated approval; decisions capture missing specifics and material exceptions. Do not set delivery dates until dependencies and effort estimates are grounded. Quality gates remain mandatory if the requested schedule is shorter than the work allows.

## 12. Progress Ledger and Session Handover

### Baseline

This plan contains implementation tasks only; all begin as **Not started**. Existing documents are planning inputs, not completed application phases. There is no `package.json`, application, migration set, or configured test runner at plan creation. The earlier pnpm command attempts failed because the manifest was absent; do not repeat those failures as supposed test coverage.

### Evidence log

Evidence from 31 August 2026 (owner: Codex; no commit created):

| ID / tasks | Change and checks | Limits / next step |
| --- | --- | --- |
| E0-01 / P0-01 | Pinned Node 24.20.0, pnpm 10.33.0, Next 16.3.3, React 19.2.8, Tailwind/PostCSS 4.3.3, TS 5.9.3; strict modular `src/` scaffold and lockfile. Frozen install, lint, types and production build exit 0. Original project references retained. | ESLint 9.39.5 remains for Next compatibility after ESLint 10 plugin failure; revisit upstream. Runtime setup and versions in README and decisions. |
| E0-02 / P0-02, P0-05–P0-08 local scope | 25 unit/component tests pass; scoped coverage 96.66% lines / 93.10% branches. Production-mode browser run: 21/21 pass across Chromium desktop/tablet/mobile in 51.5 s, including axe, filters, keyboard scrolling, focus return, all documented shells, status/grant changes, direct API denial and service-failure handling. School-red screenshots inspected against reference; GPT Taste dashboard overrides applied. | Auth double is synthetic and loopback only; no claim of real RLS, provider rate limiting or token-expiry refresh. Browser evidence, performance scope and review findings in [Phase 0 evidence](docs/evidence/phase-0/verification.md). |
| E0-03 / P0-03, P0-04, P0-09 — historical, before D-01 resolution | `.env.local` matched `https://cefwopisbgfctzdloequ.supabase.co`; initial MCP inspection found public tables `[]`, migrations `[]`, branches `[]`. Auth session column types confirmed. Two existing `rls_auto_enable` grant warnings; performance advisors empty. Migrations and 14 pgTAP assertions were then prepared but unapplied. Database/live browser commands exited 1 for missing configuration. | Historical baseline only, superseded by E0-04/E0-05 below. No writes had occurred at that point. |
| E0-04 / P0-03, P0-04 | Supersedes E0-03's environment/migration blockers. Chief Engineer authorized existing Free-plan project as test-only. MCP applied `20260831200632_foundation_access`, `20260831200637_restrict_existing_rls_trigger_grants`, `20260831200843_verify_foundation_access_contracts`; local filenames match history. Five tables have RLS. Executable SQL tests used authenticated/anon roles for isolation, metadata non-escalation, super/management/pending/disabled access, denied writes, changed grants/status and invalid/revoked sessions. All transient fixtures rolled back. Types regenerated from MCP. | Security advisors empty; two INFO unused foreign-key indexes retained without workload. Counts: zero Auth users/sessions/profiles/user-role assignments; four roles, nine permissions, 21 role-permission definitions. SQL checks are not Auth-issued JWT tests; separate pgTAP file not run. [Backend evidence](docs/evidence/phase-0/backend-verification.md). |
| E0-05 / P0-05, P0-09 | Signed-in hosted dashboard: disabled/saved public signup; anonymous sign-ins/manual linking off, email confirmation on, other providers disabled. Four live preflight tests pass: anonymous table/RPC denial, private schema unexposed, signup disabled with actual rejected attempt, invalid login. Existing rate limits and localhost origin inspected. | `pnpm test:db` still exits 1 after preflight because three synthetic actor credentials are absent; live Auth E2E also exits 1. No persisted users created. User asked to create synthetic accounts and configure ignored credentials; agent will assign roles by reviewed UUID-specific migration afterward. Real expiry/refresh, browser journeys, abuse enforcement and hosted CI remain before Phase 0 acceptance. |

Final local regression after E0-04/E0-05 (31 August 2026): `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` (25 tests), `pnpm test:coverage` (96.66% lines / 93.10% branches), `pnpm build` and `pnpm test:client-boundary` all exited 0. Production-mode synthetic `pnpm test:e2e` passed 21/21 in 55.0 seconds across desktop/tablet/mobile. Rebuilt afterward with the configured Supabase test project, not the loopback fixture. Both real-provider gate commands remain exit 1 for missing synthetic actor credentials. Latest security advisors remain empty. Local environment files are Git-ignored; no deployment or commit was created.

For future entries, retain these fields:

| Field | Required content |
| --- | --- |
| Task / date / owner | Stable task ID, verification date, responsible agent. |
| Change | Files and commit if available; schema/migration identity where applicable. |
| Checks | Exact commands, exit codes, test cases, and results; explain skips. |
| Browser / database / performance | Relevant tested roles, viewports, scenarios, query plans, measurements, and artifact locations. |
| Remaining risk | Known limitations, dependency, recovery implications, or none observed within the tested scope. |

Link larger logs/reports when created; keep this ledger readable and redact sensitive information. Reopen affected tasks when later changes invalidate their evidence.

### Current handover

- **Verified:** P0-01 scaffold; P0-03 test-project/client setup; P0-04 applied schema, RLS, SQL role tests and generated types. Other locally implemented tasks retain their dependency blocks. Three migrations are applied; do not reapply them.
- **Gate:** Phase 0 is not accepted. Phase 1, business CRUD and finance workflows remain untouched. SQL role tests and synthetic browsers do not establish real Auth-issued session behavior.
- **Next executable work:** User must set passwords for three synthetic Auth accounts through the open Auth administration form and configure the six actor variables in ignored `.env.test.local`. The browser credential-entry boundary prevents doing this password step for them. Verify exact synthetic UUIDs with MCP; prepare/apply a reviewed, UUID-restricted test role/status migration, then run authenticated integration and live browser checks. Follow [backend setup](docs/backend-setup.md); no need to ask again whether the Free project is authorized for testing.
- **Still required:** Actual login/logout/expiry/refresh/revocation, disabled and removed-role scenarios with real sessions, abuse-limit enforcement evidence, remaining live browser coverage and hosted CI. The 14 pgTAP assertions remain unrun, distinct from the successfully executed migration contract checks. No account is promoted from metadata or seeds.
- **Hosted state:** Public signup is disabled and an actual signup attempt was rejected; anonymous sign-ins are off. No users, sessions, profiles or assignments persist; role/permission configuration remains. Current origin is localhost with no extra redirects. No paid plan/branch, deployment or Git commit was created.
- **Lifecycle:** D-01 permits this same project for testing only. Before live data, remove identified synthetic accounts/sessions through reviewed cleanup, preserve configuration/migrations, disable test-target authorization and credentials, and satisfy later release/backup/MFA gates. Clearing tables alone does not authorize live use; D-07 is open.
- **Artifacts/runtime:** [Local verification](docs/evidence/phase-0/verification.md), [backend evidence](docs/evidence/phase-0/backend-verification.md), six sanitized screenshots, scoped coverage and network snapshots. pnpm-managed Node 24.20.0; system default unchanged. Generated output and real environment files are ignored. Preserve the user's `.env.local` and all existing untracked documents/skills; stage only reviewed files.
- **Next agent:** Read startup sources, this handover and current evidence. Reverify MCP target and account state without printing credentials; rerun affected checks after account/backend integration. Never carry old local evidence forward as proof of changed Auth behavior.
