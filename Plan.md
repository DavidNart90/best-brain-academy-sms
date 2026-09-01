# Best Brain Academy: Implementation Plan

**Owner:** Chief Engineer (the user)  
**Created:** 31 August 2026  
**Execution status:** Phase 1 is complete. Phase 2 implementation is in final mop-up: student, staff, administrator, authentication, and branding work is implemented; the P2-06 verification gate remains.
**Next phase work:** Finish the focused Phase 2 verification/mop-up only. Do not begin Phase 3 finance implementation without Chief Engineer authorization.
**Current implementation task:** The live settings hub and auth redesign are integrated. P2-06 is the next dependency-ready gate.

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

Keep IDs stable. Update this plan after meaningful progress and before ending an implementation session. Checks must be proportional to the change: do not rerun unrelated suites or create one-off harnesses merely to close a phase. Keep security, data-integrity, and financial invariants where applicable, and never mark a failed or skipped applicable check as passing. Evidence should be concise: task/date, material files or migration, applicable results, and remaining risk. Do not invent commit IDs or store secrets in evidence.

## 2. Phase Overview and Requirement Coverage

| Phase | Outcome | Entry dependency | Exit gate | Status |
| --- | --- | --- | --- | --- |
| 0 | Reproducible, protected application foundation and reference-based shell | Specifications available; environment decisions only block dependent tasks | P0-09 | Verified complete — E0-06 |
| 1 | Academic configuration, school settings, audit foundation, fast table pattern | P0-09 | P1-05 | Verified complete — E1-01 |
| 2 | Admissions, people records, enrollment history, administrator management | P1-05 | P2-06 | Final mop-up — implementation complete; focused verification remains |
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
| PERF-01 | Phases 1–4 | Bounded queries and pagination; Phase 5 performs representative load measurements and optimization. |
| QA-01 | Every phase | Relevant unit/integration/browser checks plus lint, typecheck, and production build. |

## 3. Gates Applied to Every Phase

### Engineering and design

Use modular features, thin routes, typed server-only data access, validated inputs, semantic tokens, and accessible components. Apply the required design guidance only when UI changes, run `react-doctor` only after React changes, and inspect only the affected journeys and responsive breakpoints. Documentation-only or backend-only work does not require browser/design checks.

### Database changes

For a database change, confirm the target, prepare one coherent versioned migration, apply it through MCP, regenerate types when contracts changed, and verify its constraints and RLS with representative roles. Run advisors or query diagnostics when the change or a failure gives a concrete reason; do not perform broad diagnostics for UI/documentation-only work.

Test migrations in the isolated target. Keep recovery notes for risky or data-changing migrations. No production reset, untracked DDL, deletion of posted records, or silent direct-connection fallback.

### Test and build gate

Run the smallest set that proves the changed behavior:

```text
pnpm lint
pnpm typecheck
pnpm test                 # relevant unit/component tests
pnpm build
```

Add `pnpm test:db` only for database/Auth/RLS changes and affected Playwright journeys only for UI or browser-auth changes. Use coverage checks at major integration/release gates, not after every task. Full cross-browser, full E2E, performance/load, advisor, and recovery suites belong in Phase 5/6 unless an earlier change directly affects those risks.

Do not generate long evidence for routine green checks. Record failures, material security/database results, and known limitations. An unavailable environment blocks only the affected deliverable; it does not require rerunning unrelated checks.

## 4. Phase 0: Production-Quality Foundation

**Objective:** Establish the approved stack, authentication, permission boundaries, and dashboard shell without business CRUD.  
**Requirements:** AUTH-01, ADMIN-01 foundation, SEC-01, PERF-01 foundation, QA-01.  
**Entry:** Read the specifications; identify D-01/D-02 dependencies without blocking offline scaffolding.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P0-01 | None | Inspect repository; scaffold Next.js App Router with `src/`, strict TypeScript, supported Node LTS, pnpm, and latest stable compatible Tailwind. Recheck versions, use v4 CSS/PostCSS configuration, pin dependencies, and preserve existing documents. | Verified complete — E0-01 |
| P0-02 | P0-01 | Configure ESLint, Prettier, typecheck, Vitest/Testing Library, Playwright, database-test harness, and CI commands. Create meaningful test scaffolding and isolated fixture conventions; do not use empty tests as green gates. | Verified complete — local, database and browser harnesses pass; CI definition reviewed, E0-02/E0-06 |
| P0-03 | P0-01; D-01 | Verify intended Supabase development/test targets via MCP. Configure browser/server clients, public versus secret environment variables, `.env.example`, and environment validation. | Verified complete — approved test-only project matches clients and harness; E0-04 |
| P0-04 | P0-03 | Create profiles linked to `auth.users`, roles, permissions, role-permission and user-role assignments, RLS/grants, and safe profile creation. Seed role definitions; document explicit initial administrator assignment without automatic escalation. | Verified complete — four migrations applied, SQL/RLS contracts and explicit test assignments verified, E0-04/E0-06 |
| P0-05 | P0-04 | Implement email/password login, logout, verified SSR session handling, protected routes, redirects, account-status enforcement, sign-in abuse controls, and safe auth errors. Disable public signup. | Verified complete — real login/refresh/logout/revocation, denied statuses, signup denial and hosted 429 verified, E0-06 |
| P0-06 | P0-05 | Implement server-only permission helpers, minimal typed data contracts, and permission-aware navigation. Cover direct endpoint access, not just hidden menu items. | Verified complete — real RLS actors, direct-write denial, metadata tampering and browser route denial pass, E0-06 |
| P0-07 | P0-01; P0-06 | Implement school-red tokens, accessible login, AppShell, sidebar, top bar, state components, Money formatting, and chart plus four-KPI dashboard with visibly labeled synthetic fixtures. | Verified complete — responsive/keyboard/axe and formatting checks pass, E0-02/E0-06 |
| P0-08 | P0-06; P0-07 | Add the full Phase 0 route shells from the brief, including expandable Admissions/Financials navigation, permission-denied states, loading/error/not-found handling, and clearly unavailable future actions. | Verified complete — 26 module/detail shells and direct-denial states pass, E0-02/E0-06 |
| P0-09 | P0-02; P0-08 | Verify foundation, update README setup/run/migration instructions, and record the first integrated quality/security/browser evidence. | Verified complete — all common gates plus real-provider checks pass, E0-06 |

**Affected areas:** `src/app/`, shared components, `features/auth/`, `lib/supabase/`, `lib/auth/`, `lib/permissions/`, generated types, environment/configuration files, CI, and auth/permission migrations. Establish `/login`, `/dashboard`, `/admissions`, `/admissions/new`, `/students`, `/classes`, `/staff`, the documented `/financials/*` routes, `/reports`, `/administrators`, and `/settings`.

**Exit evidence:** All common gates; successful and failed login, expiry/refresh/logout, tampered role denial, disabled account denial, no public signup, safe profile trigger, and direct unauthorized route/action access. Inspect desktop/tablet/mobile shell and assert `GHS 1,250.00` formatting. Verify no privileged values enter client bundles. Record initial bundle/network measurements; do not claim real table performance from demo fixtures.

**Recovery:** Rebuild only disposable test environments. Never reset a live Auth project or use a role seed to promote arbitrary accounts.  
**Excluded:** People CRUD, academic business CRUD, fee calculations, payments, receipts, expenses, reporting, and production deployment.

## 5. Phase 1: Academic Configuration and Shared Operations

**Objective:** Make school/academic configuration and audit behavior usable, with a bounded reusable table implementation.
**Requirements:** ACAD-01, ADMIN-01, SEC-01, PERF-01, QA-01.  
**Entry:** P0-09 verified complete.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P1-01 | P0-09 | Create academic-year, term, class, school-setting, and protected audit structures with validation, referential integrity, suitable indexes, and permission policies. | Verified complete — E1-01 |
| P1-02 | P1-01 | Implement authorized academic years/terms/classes and school settings, valid current context, archive behavior, and audited configuration changes. Use configurable values rather than real-school assumptions. | Verified complete — E1-01 |
| P1-03 | P1-02 | Build reusable table/query contracts: bounded server pagination, stable sorting, URL filters, debounced search, typed errors, and consistent empty/loading states. Apply first to classes/configuration. | Verified complete — E1-01 |
| P1-04 | P1-03; D-02 | Record the school operating profile and confirm the reusable list uses bounded pagination and no per-row query waterfall. Defer load testing to Phase 5 when representative finance data exists. | Verified complete — operating profile supplied; bounded class query verified in E1-01 |
| P1-05 | P1-04 | Verify academic/context/archive rules, audit restrictions, denied writes, and the affected configuration/table journeys. | Verified complete — E1-01 |

**Affected areas:** `features/academics/`, `features/settings/`, shared table controls, `/classes`, academic/school settings, audit helpers, and academic/settings/audit migrations.

**Exit evidence:** Invalid term/year relationships and duplicate identifiers are rejected; current context, archive behavior, audit immutability, permission denial, URL filters, stable sorting, and 25-row pagination work. Representative load testing is intentionally deferred to P5-04.

**Recovery:** Prefer additive schema and setting changes; preserve referenced records and audit entries.  
**Excluded:** Admissions, student/staff management, and financial transactions.

## 6. Phase 2: People and Administrator Workflows

**Objective:** Support operational admissions, student/guardian/staff records, historical enrollment, and controlled user administration.  
**Requirements:** PEOPLE-01, ACAD-01, AUTH-01, ADMIN-01, SEC-01, PERF-01, QA-01.  
**Entry:** P1-05 verified complete.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P2-01 | P1-05 | Create students, guardians, relationships, enrollments, and class/location assignments with unique identifiers, history preservation, indexing, and least-privilege policies. Staff remains a separate P2-04 task. | Verified complete — E2-01/E2-02 |
| P2-02 | P2-01 | Implement admission validation and transactional student/guardian/enrollment creation, records search, duplicate handling, explicit failure states, and the approved student Excel onboarding workflow. Admission works without an invoice. | Verified complete — E2-01/E2-02 |
| P2-03 | P2-02 | Implement student profiles, guardian links, enrollment changes/history, and secure photo upload/access. Keep finance tabs explicitly unavailable until Phase 3. | Verified complete — E2-03 |
| P2-04 | P2-01 | Implement staff profiles, assignments, search, archive rules, and audit context; a staff record creates no login account. | Verified complete — E2-04 |
| P2-05 | P1-05; D-03 | Implement authorized administrator password provisioning, forced first-login password replacement, role assignment, account disablement, and fresh permission enforcement. Prevent self-escalation and unsafe loss of administrative access. | Verified complete — E2-05/E2-05A |
| P2-06 | P2-03; P2-04; P2-05 | Verify admission rollback/duplicates, student and staff journeys, private photos, administrator role changes, and denied access. | Not started |

**Affected areas:** `features/admissions/`, `features/students/`, `features/staff/`, admin/auth modules, corresponding list/detail routes, Storage policies, and people/enrollment migrations.

**Exit evidence:** Duplicate or failed admission leaves no partial records; enrollment history remains readable; staff records do not create login accounts; unauthorized IDs/photos are denied; disabled or de-privileged accounts lose access; student search remains bounded for the expected 200 students.

**Recovery:** Preserve historical links; repair imports/records through audited permitted operations. Do not delete people records with financial/history dependencies.  
**Excluded:** Live finance, broader release/client migration beyond the approved student onboarding template, payroll, attendance, examinations, or parent portals.

## 7. Phase 3: Finance Core

**Objective:** Establish trustworthy invoicing and cash collection before reporting.  
**Requirements:** FEE-01, PAY-01, SEC-01, PERF-01, QA-01.  
**Entry:** P2-06 verified complete; establish financial-policy and document assumptions under D-04.
**Finance authority:** [Financial Structure.md](Project%20Files/Financial%20Structure.md) defines the supplied fee matrix, daily receipt categories, calculations, controls, phase mapping, and beta decisions.

| Task | Depends on | Deliverable | Status |
| --- | --- | --- | --- |
| P3-01 | P2-06; D-04 | Design coherent finance migrations for fee components, invoices, payments, feeding/admission/miscellaneous receipts, reversals, receipts, payment methods, idempotency, and audit. Define exact money transport, numbering, constraints, and permitted write boundaries. | Not started |
| P3-02 | P3-01 | Implement effective-dated base class fees, location/transport charges, feeding/admission defaults, income categories, and required/optional components without hard-coded application amounts. | Not started |
| P3-03 | P3-02 | Implement invoice generation and immutable line/document snapshots, unique numbering, authorized cancellation, invoice views, and school-branded printable/PDF output. | Not started |
| P3-04 | P3-03 | Verify invoice subgate: decimal/rounding rules, snapshot stability after fee/school changes, concurrent numbering, rejected invalid invoices, cancellation permissions, and historical rendering. | Not started |
| P3-05 | P3-04 | Implement atomic school-fee payments and daily feeding/admission/miscellaneous receipt posting with protected balances, duplicate prevention, idempotency, one receipt/reference per committed payment, and atomic audit. | Not started |
| P3-06 | P3-05 | Implement authorized reversals with reason/actor/time, rejection of invalid amounts/overpayments/cancelled-invoice payments, and safe retry/unknown-outcome recovery. | Not started |
| P3-07 | P3-05; P3-06 | Implement the daily accounts workspace for school fees, feeding, admission, and miscellaneous receipts; add receipt list/view/reprint/PDF and clear reversal presentation. | Not started |
| P3-08 | P3-07 | Implement current outstanding balances, student account history, daily receipt journal, payment/receipt filters, bounded pagination, and targeted refresh after writes. | Not started |
| P3-09 | P3-04; P3-08 | Verify the critical invoice/payment/reversal invariants, reconciliation, permissions, and affected browser journeys. | Not started |

**Affected areas:** `features/finance/`, student finance tabs, daily accounts workspace, invoice/payment/receipt/outstanding routes, document components, RPCs, constraints, grants/RLS, and versioned finance migrations. Exact schema details are reviewed at P3-01; do not treat this list as pre-applied SQL.

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
| P4-04 | P4-02; P4-03 | Verify permissions, invalid amounts, retry safety, protected posted records, private attachments, void exclusion, and bounded lists. | Not started |

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
| P5-01 | P4-04 | Build authorized daily, weekly, monthly, and term aggregates with explicit date semantics. Reconcile school-fee, feeding, admission, miscellaneous, expense, deduction, and outstanding figures to source records. | Not started |
| P5-02 | P5-01 | Connect reference-layout dashboard, financial overview, four KPIs, charts, and recent collections to authorized database records; remove demo indicators only where the data connection is implemented and verified. | Not started |
| P5-03 | P5-01 | Implement required financial/admin reports, student statements, and bounded print/PDF/CSV/Excel exports with matching filters and formula-injection protection. | Not started |
| P5-04 | P5-02; P5-03; D-02 | Test the actual high-value dashboard, list, payment, and export paths at the agreed school volumes and 10-user peak. Fix evidenced bottlenecks; avoid a separate general-purpose benchmark framework. | Not started |
| P5-05 | P5-04 | Verify report reconciliation, access boundaries, fresh post-write balances, supported-browser visuals, and the measured high-value paths. | Not started |

**Affected areas:** `features/reports/`, financial/dashboard queries, `/dashboard`, `/financials`, `/reports`, export modules, aggregate/view/index migrations, and telemetry.

**Exit evidence:** Summaries and exported rows reconcile to invoices/payments/reversals/expenses under identical filters; void records are excluded correctly; management cannot mutate records or export unauthorized fields. Test empty periods, date boundaries, large exports, permission changes, and cache isolation. Inspect official documents in grayscale and at print size.

Use the supplied operating profile: approximately 200 students, 5,000–10,000 finance records per academic term, 10 devices, and a 10-user peak. Test Chrome/Edge-compatible Chromium on desktop plus responsive tablet/mobile layouts. Use one ordinary connection profile and one constrained profile until the school connection is measured.

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
| P6-05 | P6-04 | Run the full release suite once on the candidate build, review applicable security findings, confirm recovery, and document residual risks for the Chief Engineer. | Not started |
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
| D-02 | School browsers/devices, typical network, expected volumes/concurrency, and acceptance of measured performance/coverage budgets. | P1-04, revisited P5-04 | Chief Engineer with agent benchmark evidence | Resolved for planning, 2026-09-01 — 10 devices; about 200 students; 5–10 concurrent users; Chrome/Edge; desktop-first with tablet/mobile responsiveness; 5,000–10,000 finance records per academic term (confirm if “each team” meant something else). Exact school network speed is unmeasured, so P5 uses ordinary and constrained profiles and P6 validates on site. |
| D-03 | Administrator permission matrix and privileged-account controls, including protection against accidental loss of admin access. | P2-05 | Chief Engineer | Revised and resolved for implementation, 2026-09-01 — use password-only login with no OTP/MFA. Only SUPER_ADMIN receives `administrators.manage` and `settings.manage`; ADMINISTRATOR receives all other current permissions. New accounts use an administrator-set temporary password and must replace it at first sign-in. Fresh permission/session checks, one explicit role, no self-role/status changes, and final-active-Super-Administrator protection remain mandatory. Release acceptance remains under D-07. |
| D-04 | Fee/income/expense/deduction rules, numbering, financial date/time semantics, and invoice/receipt samples. Keep credits disabled unless approved; use clearly provisional samples until final confirmation. | P3-01 for policies; P6-04 for final samples | Chief Engineer/client, with configurable agent proposals | Partially resolved, 2026-09-01 — [Financial Structure.md](Project%20Files/Financial%20Structure.md) confirms class fee + location/transport, a GHS 10 feeding payment manually recorded each day by an authorized accountant only for students who paid, GHS 50 new-student admission fee, miscellaneous income, daily/weekly/monthly aggregation, monthly salary-deduction treatment, configurable categories, and immutable audit/reversal rules. Expense categories, deduction accounting treatment, payment methods, numbering, discounts/credits/refunds, opening balances, date-close rules, and final document samples remain open. |
| D-05 | Hosting/domain/region, data retention, recovery objectives, backup coverage/cost, monitoring ownership. | P6-01; revisit earlier if environment choice requires it | Chief Engineer | Open |
| D-06 | Confirmed student/staff/admin files, classes, terms, fees, and categories; treatment of any existing balances must be specified rather than fabricated. | P6-03 | Chief Engineer/client | Partially resolved, 2026-09-01 — 13 classes, three terms, five locations and the current fee schedule were supplied and cross-checked against the handwritten image. Student/staff/admin files, remaining categories and existing-balance treatment remain open. |
| D-07 | Acceptance of release evidence and explicitly documented residual risks; authorization for production promotion/import. | P6-06 | Chief Engineer | Open |

Resolve decisions with a dated rationale and reference, not by merely changing `Open` to `Resolved`. Requirements already established in `Project.md` need no repeated approval; decisions capture missing specifics and material exceptions. Do not set delivery dates until dependencies and effort estimates are grounded. Applicable security and financial-integrity checks cannot be traded away for schedule.

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
| E0-05 / P0-05, P0-09 — historical, before actor provisioning | Signed-in hosted dashboard: disabled/saved public signup; anonymous sign-ins/manual linking off, email confirmation on, other providers disabled. Four live preflight tests pass: anonymous table/RPC denial, private schema unexposed, signup disabled with actual rejected attempt, invalid login. Existing rate limits and localhost origin inspected. | At that point, both real-provider commands exited 1 because synthetic actors were absent. Superseded by E0-06. |
| E0-06 / P0-02, P0-04–P0-09 | On 1 September 2026, three auto-confirmed synthetic Auth users were created with strong generated passwords stored only in ignored `.env.test.local`. MCP applied `20260901100905_configure_phase0_test_actors`, resolving fixed test emails without storing generated UUIDs or passwords. Final states: allowed active/SUPER_ADMIN, denied pending/unassigned, disabled/SUPER_ADMIN; zero sessions after tests. `pnpm test:db` passed 8/8 including real login, RLS, refresh, metadata tampering, direct-write denial and post-logout revocation. `pnpm test:e2e:auth` passed 3/3 allowed/pending/disabled journeys. Controlled invalid login reached hosted HTTP 429 at attempt 34. Common gates passed: lint, format, typecheck, 25 unit tests, coverage 96.66% lines / 93.10% branches, build, client-boundary scan and 21/21 synthetic browser tests across desktop/tablet/mobile in 47.9 s; final real-project rebuild passed. | Supabase security advisor reports only `auth_leaked_password_protection`; official docs say this protection requires Pro, so it is recorded as a production-release limitation of the authorized Free test plan. Two INFO unused FK indexes remain pending workload. The standalone 14-assertion pgTAP file and hosted GitHub workflow were not run; executable migration SQL and every required local gate did run. No business data, deployment or Phase 1 work. [Backend evidence](docs/evidence/phase-0/backend-verification.md). |
| E1-01 / P1-01–P1-05 | On 1 September 2026, the Chief Engineer supplied the 2026/2027 academic, class, location, fee-reference, and operating-profile requirements. MCP applied `20260901111519_academic_configuration`; the local migration matches. Six RLS tables hold one year, three terms, 13 classes, five locations, one school-settings row and 23 immutable seed audit records. Term 1 starts 8 September; its 7 December end is disclosed as a revisable three-month planning date, while Terms 2/3 remain unscheduled. Explicit routes provide calendar/context/forms, locations and a bounded, stable, URL-filtered classes table. Database/Auth, affected browser journeys, unit tests, lint, types, and production build passed. | Fee values remain Phase 3 requirements; no finance records were created. Representative performance testing is deferred to Phase 5 at 200 students, 5,000–10,000 finance records per term, and a 10-user peak. Exact school network speed remains a release-site validation. [Configuration evidence](docs/evidence/phase-1/configuration-verification.md). |
| E1-02 / P1-02 settings hub completion | On 1 September 2026, the obsolete `/settings` Phase 0 placeholder was replaced by a live, permission-protected settings hub. A bounded server summary now shows the configured school identity, current academic year and term, active class/location counts, crest and last update. Three responsive destination cards open the implemented School Settings, Academic Settings and Administrator Access workflows; the remaining Phase 3 finance configuration is disclosed without a fake action. TypeScript passed, React Doctor scored 100, Prettier passed after formatting, and final `pnpm lint`/`pnpm build` exited 0 with `/settings` emitted as a dynamic route. | Authenticated visual verification is pending the separate browser credential-transmission confirmation. The summary is read-only; all mutations remain inside their existing permission-protected workflows. Phase 1 remains complete and finance remains unimplemented. |
| E2-01 / P2-01–P2-02 student slice | On 1 September 2026, MCP applied tracked migration `20260901133516_student_directory_and_onboarding`. Four RLS tables and a security-invoker directory view preserve students, guardians, links, and enrollment history. Direct writes are closed; permission-gated RPCs create one record or a validated batch atomically. `/students` now provides the ordered empty state, bounded URL-filtered 25-row table, Excel export, and reusable preview/validation/duplicate/confirmation import; `/students/new` and `/admissions/new` provide Zod-validated onboarding. Real Auth/RLS, RPC rollback/duplicate checks, targeted unit/import tests, and the affected desktop/tablet/mobile browser journey passed. | Staff, Administrators, student profiles/photos, and enrollment-change UI were not implemented. Student/guardian/enrollment verification fixtures and their synthetic sessions were removed; all four people tables remain empty. No finance schema or records were created. [Student evidence](docs/evidence/phase-2/student-directory-verification.md). |
| E2-02 / P2-01–P2-02 student details extension | On 1 September 2026, MCP applied tracked migration `20260901141827_add_student_disability_and_religion`. Student onboarding now records a required disability Yes/No answer, requires details when Yes, and records religious denomination. The same Zod contract drives manual onboarding and Excel import; previews and exports include the fields. Database constraints/RPC rollback, hosted RLS checks, 11 focused tests, lint, types, build, React Doctor, and the desktop/tablet/mobile onboarding journey passed. | The marked verification transaction rolled back without adding records. One unmarked student/guardian/enrollment bundle and one active session created through the workflow were present at final review and preserved. Existing intentional RPC and Free-plan security-advisor warnings are unchanged. No finance records were created. [Student evidence](docs/evidence/phase-2/student-directory-verification.md). |
| E2-03 / P2-03 student profiles | On 1 September 2026, Supabase MCP applied tracked migrations `20260901143834_student_profiles_enrollment_and_photos` and `20260901144333_require_uploaded_student_photo`. `/students/[id]` now shows personal details, guardian links, chronological enrollment history, private validated photos, and explicitly locked Phase 3 finance sections. Guardian links and enrollment changes are permission-gated transactional RPCs; enrollment changes append history and retain exactly one active row. Private Storage uses RLS, 5 MB/MIME limits, file-signature validation, and authenticated delivery. Hosted Auth/RLS, rolled-back positive writes, 15 focused tests, the real desktop/tablet/mobile browser journey, axe, lint, formatting, types, build, and React Doctor passed. | One unmarked enrollment change made through the application was preserved. Three sessions created by browser verification were revoked by exact ID; the earlier active session remains. Security advisors intentionally flag five authenticated transactional RPCs; each has a fixed search path, active-session permission check, closed direct writes, and negative tests. Free-plan leaked-password protection remains open. [Profile evidence](docs/evidence/phase-2/student-profile-verification.md). |
| E2-04 / P2-04 staff | On 1 September 2026, Supabase MCP applied tracked migration `20260901145746_staff_directory_and_assignments`. RLS-protected staff and assignment-history tables, a security-invoker directory view, audit triggers, and permission-gated transactional create/import/assign/end/archive RPCs keep employment records separate from Auth users. `/staff`, `/staff/new`, and `/staff/[id]` provide the reusable empty/import/export pattern, Zod onboarding, bounded search/pagination, assignment history, guarded archive, audit context, loading/no-results states, and locked salary deductions. One rollback-only database/RLS scenario and one real browser journey passed, followed by lint, formatting, typecheck, build, axe, mobile-fit and React Doctor 100. | Broad unit/coverage suites were intentionally not run per Chief Engineer direction. All exact-scope staff browser fixtures and sessions created during verification were removed; final staff/assignment counts are zero and the one pre-existing session remains. Five new staff RPC advisor warnings are intentional: fixed search paths, active-session permission checks, denied direct writes and focused negative tests cover them. No administrator or finance records were created. [Staff evidence](docs/evidence/phase-2/staff-management-verification.md). |
| E2-05 / P2-05 administrators | On 1 September 2026, Supabase MCP applied three tracked administrator migrations and deployed JWT-verified `administrator-provision` Edge Function version 2. RLS tables, fresh permission checks, AAL2 write gates, transaction locks, audit entries, self-protection, and final-active-Super-Administrator protection secure invitations, role changes, and disablement. `/administrators` reuses the empty/import/export/paginated directory pattern; TOTP enrollment/challenge routes protect privileged writes. One rollback-only DB/RLS scenario and one real browser journey passed, followed by lint, formatting, types, build, axe, mobile fit, and React Doctor 100. | No invitation email or new Auth user was created during verification; positive MFA/email delivery and cleanup remain for P2-06. Four new security-definer RPC notices are intentional and permission/AAL/session checked. Broad suites were omitted per Chief Engineer direction. [Administrator evidence](docs/evidence/phase-2/administrator-management-verification.md). |
| E2-05A / P0-02, P2-05 password-only correction | On 1 September 2026, the Chief Engineer replaced the invitation/MFA design with administrator-issued passwords and mandatory first-login replacement. Supabase MCP applied tracked migrations `20260901162112_force_initial_password_change` and `20260901163026_password_only_administrator_provisioning`; JWT-verified `administrator-provision` version 5 uses Auth Admin `createUser` with confirmed email and never stages passwords in Postgres. Credential-bearing login and password-change traffic moved from Server Actions to size/origin-checked Route Handlers, preventing credential values from appearing in Next Server Action traces. The hosted data reset removed all test Auth/people/admin/session/audit data and created only the named active SUPER_ADMIN with `must_change_password=true`. The real crest and a responsive Framer Motion auth shell passed desktop/mobile browser UI checks with no console errors or overflow; React Doctor scored 100, `pnpm lint` and `pnpm build` exited 0. | Per the Chief Engineer's testing limit, broad suites and a completed password replacement were not run; the supplied temporary password remains unchanged for handoff. Password-only privileged administration is an explicitly accepted alternative to MFA and has higher account-takeover risk. Free-plan leaked-password protection remains disabled. P2-06 remains open. |
| E2-05B / P0-02 auth visual refinement | On 1 September 2026, the login experience was reworked after live visual inspection of Dribbble login results, Pinterest login concepts, and Mobbin's production sign-in. The shared auth shell now uses a restrained editorial split, the real school crest, an image-led classroom context, a compact staff-access form, and reduced-motion-aware Framer Motion entrances. The classroom asset is locally optimized from [Katerina Holmes's Pexels photograph](https://www.pexels.com/photo/black-woman-and-students-during-lesson-5905554/). In-app browser checks at desktop and 390 x 844 confirmed loaded images, working password visibility, no Next.js error overlay, and `scrollWidth === innerWidth`; React Doctor scored 100, TypeScript, `pnpm lint`, and `pnpm build` exited 0. | Pinterest required sign-in for full pin browsing and Mobbin gated its design library, so only visible Pinterest search concepts/original pin assets and Mobbin's public production login were treated as evidence. No authentication behavior or backend state changed in this refinement. |
| E2-05C / P0-05 password length correction | On 1 September 2026, the mandatory first-login replacement rule changed from 15 to 8 minimum characters in the shared Zod contract and visible checklist. Uppercase, lowercase, number, symbol, 128-character maximum, confirmation, and non-reuse checks remain. Supabase MCP documentation confirms eight characters is the recommended lower bound when the strongest mixed-character requirement is used. Boundary verification accepted an eight-character password and rejected seven; typecheck, lint, and React Doctor 100 passed. | This changes application validation only; no database schema, account, password, or remote Auth state was changed. |
| E2-05D / P0-02 school branding | On 1 September 2026, the supplied transparent `logo.png` replaced the bounded JPEG treatment on desktop/mobile sign-in and the protected shell. Supabase MCP applied tracked migration `20260901173121_school_branding_logo_upload`: `school_settings.logo_path`, a public-read `school-branding` bucket restricted to PNG/2 MB, UUID-path insert/delete policies gated by `settings.manage`, and an anon allowlist limited to public branding columns. School Settings now has a permission-protected uploader with client/server MIME, signature, byte-size, and dimension checks; unique immutable object paths prevent stale replacement caches and failed database writes remove the just-uploaded object. The bundled PNG is the resilient fallback while no Storage logo exists. Focused validation passed 3/3, TypeScript and React Doctor 100 passed, Supabase types matched, desktop/mobile in-app browser inspection showed an unclipped transparent crest, anonymous School Settings access redirected to sign-in, and final lint/build exited 0. | No administrator credential or logo upload was used during verification. The branding bucket is intentionally public-read because the crest appears before login; object writes remain RLS-protected. Final database count is zero branding objects, so the supplied bundled PNG is currently displayed until an authorized administrator uploads a replacement. Existing RPC and Free-plan password-advisor warnings are unchanged. |

E0-06 implementation checkpoint: commit `2e1ab95` (`Complete Phase 0 authentication gate`). It is local and has not been pushed or deployed.

Historical local regression after E0-04/E0-05 (31 August 2026): `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` (25 tests), `pnpm test:coverage` (96.66% lines / 93.10% branches), `pnpm build` and `pnpm test:client-boundary` all exited 0. Production-mode synthetic `pnpm test:e2e` passed 21/21 in 55.0 seconds across desktop/tablet/mobile. The then-current real-provider blockers and empty advisor result are superseded by E0-06.

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

- **Gate:** Phase 1 is complete. Phase 2 is in final mop-up: P2-01–P2-05 and the auth/branding corrections are implemented; P2-06 is the remaining focused verification gate.
- **Applied state:** Sixteen migrations match remote history; never edit or reapply them. Final MCP inspection found exactly one confirmed active Auth/profile/administrator account, assigned only SUPER_ADMIN and flagged for first-login password replacement. Students, guardians, relationships, enrollments, staff, staff assignments, provisioning requests, Auth sessions, photo objects, branding objects, and audit rows are zero. The Phase 1 configuration remains: one current year, three terms, 13 classes, five locations, and one school-settings row. The public-read `school-branding` bucket accepts only PNG files up to 2 MB; writes require `settings.manage`, and the supplied bundled crest is the current fallback while `logo_path` is null. Four roles, 16 permissions and 36 role-permission mappings remain application configuration; ADMINISTRATOR has 14 permissions and cannot manage administrators or settings.
- **School decisions:** `2026/2027` is current. Term 1 starts 8 September 2026; 7 December is a clearly disclosed, revisable three-month planning end. Terms 2/3 are unscheduled. The supplied fee file/image agree and are captured as Phase 3 requirements, not database fee configuration. See [school configuration reference](docs/requirements/school-configuration-2026-2027.md).
- **Finance structure:** [Financial Structure.md](Project%20Files/Financial%20Structure.md) records the current school-fee matrix, GHS 10 feeding fee, GHS 50 admission fee, miscellaneous income, daily/weekly/monthly formulas, expenses, salary deductions, daily-entry workflow, accountability controls, and remaining beta decisions. No financial schema or records have been created.
- **Verified behavior:** Student, staff, and administrator reads plus private student photos are RLS-protected; direct people/admin-table writes are denied; create/import/profile writes are permission-gated. Staff records remain separate from Auth. Administrator account creation uses a temporary password without OTP/email invitation, and the application blocks protected routes while `must_change_password` is true. Administrator mutations require a valid session and fresh SUPER_ADMIN permission; self-management and loss of the final active Super Administrator remain blocked. Finance sections remain explicitly unavailable.
- **Auth redesign:** Authentication is email-and-password only: no OTP, invitation link, or MFA step. A Super Administrator creates each administrator with an issued temporary password; first sign-in is forced to the dedicated password-replacement route before any protected workflow is available. Credential-bearing login/change-password requests use size/origin-checked Route Handlers instead of Server Actions so passwords are not serialized into Next action traces. Replacement passwords require at least eight characters plus uppercase, lowercase, number and symbol, must differ from the temporary password, and are capped at 128 characters. The responsive editorial auth shell uses the modern African classroom image, transparent official crest and reduced-motion-aware Framer Motion entrances.
- **Operating profile:** 10 devices, about 200 students, Chrome/Edge, desktop-first responsive UI, 5–10 concurrent users, and 5,000–10,000 finance records per academic term. Exact school network speed is not measured; validate it at P5/P6 rather than blocking feature delivery.
- **Residuals:** The security advisor intentionally flags fourteen authenticated `SECURITY DEFINER` RPCs (five student, five staff, four administrator); all retain fixed search paths, explicit active-session permission checks, and closed direct writes. Administrator writes now use the Chief Engineer-approved password-only compatibility gate instead of AAL2. Free-plan leaked-password protection remains a production-release limitation ([remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). Low-volume indexes remain reported unused while people tables are empty. Positive first-password replacement and broader P2-06 security journeys remain open.
- **Lifecycle:** D-01 permits this project for testing only. The three synthetic Auth users, all identified test people data, and the ignored `.env.test.local` credential file are removed; historical live-provider suites require newly authorized fixtures before they can run again. Before live data, disable the test-target manifest/CI dispatch, preserve schema/role/configuration history, and satisfy D-05/D-07 backup, approved origins, monitoring, password-policy acceptance, and release approval. Clearing arbitrary tables remains prohibited.
- **Artifacts/runtime:** [Administrator evidence](docs/evidence/phase-2/administrator-management-verification.md), [Staff evidence](docs/evidence/phase-2/staff-management-verification.md), [Student directory evidence](docs/evidence/phase-2/student-directory-verification.md), [Phase 1 evidence](docs/evidence/phase-1/configuration-verification.md), [Phase 0 local verification](docs/evidence/phase-0/verification.md), and [Phase 0 backend evidence](docs/evidence/phase-0/backend-verification.md). Node 24.20.0 and pnpm 10.33.0 are pinned. Secrets and generated output remain ignored; only the test-target Edge Function was deployed, with no production deployment.
- **Next agent:** Read startup sources and this handover. The next dependency-ready task is P2-06 Phase 2 verification. Do not start finance without authorization; preserve student enrollment and staff assignment history and keep people records independent of login provisioning.
