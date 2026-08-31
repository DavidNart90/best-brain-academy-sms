# Best Brain Academy: Project Engineering Specification

**Owner:** Chief Engineer (the user)  
**Research baseline:** 31 August 2026  
**Status:** Phase 0 scaffold and Supabase schema/RLS verified; authenticated-provider journeys and the phase gate remain blocked.  
**Execution plan:** [Plan.md](Plan.md) contains current task statuses, verification evidence, and handover. Phase 1 has not started.

## 1. Purpose and Engineering Ownership

Deliver a secure, maintainable school administration and finance system. Professional engineering here means explicit requirements, small reviewable changes, enforceable access controls, measured performance, reproducible builds, and evidence that important workflows work. A polished screenshot is not proof of correctness.

The Chief Engineer directs scope, resolves material business ambiguities, and approves changes to the agreed architecture, risk acceptance, and release readiness. Agents perform routine implementation and verification within the authorized scope without repeatedly requesting permission. Present consequential decisions with evidence, alternatives, a recommendation, and impact before taking an irreversible action. Do not label a proposal as approved.

Engineering responsibilities cover architecture, frontend/accessibility, backend/security, and verification. These are responsibilities, not a requirement to spawn separate agents. When delegation is authorized, assign bounded ownership and integrate through one reviewed contract; no agent may bypass security or acceptance gates.

Preserve this priority order from the project guide: financial correctness, data integrity, security, auditability, staff usability, reporting, performance, then visual polish.

## 2. Document Map and Authority

Resolve all paths from the repository root. Read current files rather than relying on a previous session's memory.

| Document | Authority and when to read |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Session startup, required skills, operational rules, and document routing. |
| [Project.md](Project.md) | Read at session startup; engineering architecture, quality requirements, and acceptance gates. |
| [Plan.md](Plan.md) | Read the overview, current phase, dependencies, decisions, and handover at session startup; maintain task status and verification evidence. |
| [Original project guide](Project%20Files/PROJECT_GUIDE_BEST_BRAIN_ACADEMY.md) | Product scope and financial/business rules; read fully before architectural work and revisit relevant sections for each feature. |
| [design.md](Project%20Files/design.md) | Read at every session startup; design workflow, GPT Taste adaptation, and no-slop acceptance criteria. |
| [design_system.md](Project%20Files/design_system.md) | Detailed tokens and component/page patterns; read before design work. |
| [design_inspiration.jpg](Project%20Files/design_inspiration.jpg) | Inspect before visual changes; dashboard composition reference, not source branding or business scope. |
| [README.md](README.md) | Contributor entry point; installation, configuration, and operational commands once implemented. |

Explicit user decisions supersede older documents. The original guide governs business rules; this specification governs engineering; the design documents govern appearance; `Plan.md` governs execution order without changing those requirements. School red `#BD3B36` supersedes older blue guidance. Document conflicts and material decisions rather than silently rewriting requirements. Keep all authoritative files in version control for other checkouts.

## 3. Product Scope and Traceable Requirements

The system is for Best Brain Academy staff. It is not a public registration service or a general learning platform. Preserve the original guide's fields, navigation, reports, and rules; the following IDs provide anchors for `Plan.md` and tests.

| ID | Required capability and invariant |
| --- | --- |
| AUTH-01 | Email/password sign-in, protected routes, profiles, roles, and permission-aware navigation; no public signup or automatic privileged roles. |
| ACAD-01 | Configurable academic years, terms, classes, and enrollment history; class changes preserve prior records. |
| PEOPLE-01 | Admissions, students, guardians, staff, and staff/class assignments. Staff records do not automatically grant login access. |
| FEE-01 | Configurable fees by academic year, term, and class. Issued invoice lines retain their original values. |
| PAY-01 | Full/partial payments, concurrency-safe balances, unique receipts, replay protection, and audited reversals. |
| OPS-01 | Configurable expenses and salary deduction records; void posted expenses without deleting history. No full payroll engine. |
| REPORT-01 | Financial/admin reports and student statements reconcile to valid posted records; print, PDF, and CSV/Excel where required. |
| ADMIN-01 | School settings, explicit administrator provisioning, least-privilege permissions, and protected audit history. |
| IMPORT-01 | Validated import previews, duplicate detection, explicit confirmation, and an outcome report. No unconfirmed real school data. |
| SEC-01 | Layered authorization, safe session handling, protected storage, validation, and verifiable security controls. |
| PERF-01 | Bounded table queries, efficient writes, and measured frontend/backend performance. |
| QA-01 | Automated tests, real browser checks, lint, type checks, and production build evidence. |

Default roles remain `SUPER_ADMIN`, `ADMINISTRATOR`, `ACCOUNTANT`, and `MANAGEMENT`. Map permissions to actions; management is read-only by default. Configure ambiguous grants conservatively and record them for review.

The business sequence is admission → student → enrollment → fee structure → invoice → payment → receipt → outstanding balance → reporting. Admission must succeed without mandatory invoice generation. Exclude attendance, exams/grading, parent/student portals, learning content, full payroll, messaging integrations, online payment gateways, library, inventory, and transport tracking unless scope is explicitly expanded.

Phase 0 remains foundation only: authentication, permission infrastructure, navigation, design tokens, route shells, and visibly labeled demo dashboards. Do not build all business modules while creating the foundation. Delivery dates from the original brief are planning inputs, not permission to skip quality gates.

## 4. Stack and Dependency Policy

| Area | Baseline |
| --- | --- |
| Runtime/package manager | Supported Node.js LTS and pnpm; pin the chosen runtime and `packageManager` version for local development and CI. |
| Application | Stable Next.js App Router, a compatible React release, and strict TypeScript. Prefer Server Components. |
| Styling | Latest stable Tailwind CSS; **4.3.3** was verified for both `tailwindcss` and `@tailwindcss/postcss` during this research. |
| Components | shadcn/ui components styled with school tokens, Lucide icons, and Recharts only where charts are needed. |
| Forms | React Hook Form for interactive forms; Zod for all external/server input contracts. |
| Backend | Supabase PostgreSQL, Auth, RLS, Storage, `@supabase/supabase-js`, and `@supabase/ssr`. |
| Tables | shadcn/ui table primitives with a compatible TanStack Table version when filtering/sorting/selection warrants it. |
| Verification | ESLint, Prettier, TypeScript, Vitest, React Testing Library, Playwright, and database integration tests; use pgTAP for SQL invariants when useful. |

Use a supported LTS runtime for production, following the [Node.js release policy](https://nodejs.org/en/about/previous-releases). The installed Node `22.14.0` and pnpm `10.33.0` are environment observations, not an endorsement of those patches for deployment. Recheck security updates and compatibility at initialization.

Re-resolve latest stable Tailwind at scaffolding using `pnpm view tailwindcss version`; then pin resolved compatible versions and commit `pnpm-lock.yaml`. Do not put floating `latest` ranges into reproducible builds. CI uses `pnpm install --frozen-lockfile`. Review dependency provenance, install scripts, maintenance, licenses, and vulnerability findings before additions. See the [Tailwind release](https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.3.3) and [pnpm installation guidance](https://pnpm.io/cli/install).

Follow Tailwind's current Next.js setup: `@tailwindcss/postcss`, `@import "tailwindcss"`, and CSS theme variables. Translate the older JavaScript theme example in `design_system.md` into v4 CSS configuration while preserving values. Do not initialize legacy v3 directives/configuration by habit. Check school devices against the supported browser baseline. [Next.js installation](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [theme variables](https://tailwindcss.com/docs/theme), [browser compatibility](https://tailwindcss.com/docs/compatibility).

Do not add Express, NestJS, another backend platform, or Prisma. Add a query-cache library, virtualization, error-monitoring service, load-test tool, or decimal library only for a concrete need. Select export/PDF dependencies when that module is planned, after checking supported formats and security; do not preload speculative dependencies.

## 5. Modular Application Architecture

Use a modular monolith: one application with explicit domain boundaries, backed by Supabase. Keep routes thin and avoid both giant components and unnecessary abstraction layers.

```text
src/
  app/                  # Route groups, pages, layouts, handlers, error/loading states
  components/
    ui/                 # Owned shadcn/ui primitives
    layout/             # App shell, sidebar, top bar
    data-display/       # Table shell, Money, StatusBadge, empty states
  features/
    auth/
    academics/
    admissions/
    students/
    staff/
    finance/
    reports/
    settings/
  lib/
    supabase/           # Separate browser/server clients
    auth/               # Verified current user and account status
    permissions/        # Shared server permission checks
    observability/      # Safe logging and request correlation
  hooks/                # Shared client behavior only
  types/                # Shared contracts and generated database types
  utils/                # Small general helpers
tests/
  e2e/                  # Playwright journeys
  integration/          # API/auth/database boundary tests
  fixtures/             # Clearly synthetic data
supabase/
  migrations/           # Reviewed, ordered SQL migrations
  tests/                # Database invariant and RLS tests
  seed.sql              # Development-only seed definitions
public/                 # Approved static assets
docs/decisions/         # Short material architecture decisions, as needed
```

Within a feature, separate `components/`, `schemas.ts`, `types.ts`, `server/queries.ts`, and `server/actions.ts` when the feature warrants them. Use pure `domain/` functions for reusable rules; do not create empty files solely to complete a template. Feature code owns business-specific columns and workflows. Shared table primitives must not know invoice or admission rules.

The server data-access layer verifies identity/permission and returns minimal typed records. Mark privileged modules `server-only`. Client Components receive only permitted fields and cannot import server implementation. Server Components call this layer directly instead of making internal HTTP calls to their own Route Handlers. This follows the [Next.js data-security guidance](https://nextjs.org/docs/app/guides/data-security).

Reads follow page → authorized feature query → user-scoped Supabase client → RLS. Writes follow validated Server Action/Route Handler → authorization → domain operation or database function → committed result → targeted refresh. Never treat a hidden button or protected layout as authorization for an action endpoint.

Keep cross-feature contracts explicit and avoid circular imports. Place forms, table controls, and charts behind small client boundaries instead of making the whole dashboard client-rendered. Use URL state for filters; reserve global client state for proven shared needs.

## 6. Code Quality and Maintainability

- Enable TypeScript `strict`; avoid `any`, unchecked casts, non-null assertions, and suppressed errors. Narrow `unknown` values and validate external data. Generated database types are not runtime validation.
- Use two spaces, kebab-case filenames, PascalCase components/types, and camelCase functions. Preserve Next.js special filenames and `@/*` imports. Configure ESLint and Prettier once; keep style checks separate from correctness tests.
- Use domain names and short cohesive functions. Extract repeated behavior when it clarifies ownership; avoid giant utility modules, speculative generic repositories, and duplicated finance logic.
- Validate all IDs, search terms, date ranges, amounts, pagination, sort keys, uploads, and writable fields. Allowlist patch fields rather than spreading user input into a database write.
- Use structured, typed error results with stable codes. Show useful user messages without exposing SQL, secrets, or stack traces. Record a correlation ID for diagnosis.
- Handle empty, loading, validation, conflict, denied, and failed states deliberately. Never catch and silently ignore a write failure or report success before commit.
- Comment on business constraints and reasoning, not obvious syntax. Remove dead code and unused dependencies. Track unfinished scope explicitly; do not ship placeholder implementations as complete.
- Keep changes focused. Review security, query count, loading behavior, and maintainability together, not only formatting.

## 7. Authentication, Authorization, and Data Protection

### AUTH-01: trusted identity and explicit grants

Use Supabase Auth with the current cookie-based SSR integration and separate browser/server clients. Verify identity using the documented `getClaims`/`getUser` approach appropriate to the operation; never trust an unverified cookie session or client-supplied user/role. Follow the installed Next.js version's Proxy/session refresh conventions. [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Disable public signup. Provision initial administration through a documented, limited bootstrap process; profile creation must not grant roles. Obtain current account status and permissions server-side, deduplicating within the request. Sensitive operations must reject disabled accounts and removed privileges even when an older JWT still exists. Test session expiry, logout, revocation behavior, and role changes. Require MFA for privileged administration before production unless the Chief Engineer explicitly accepts a documented alternative.

### SEC-01: database and endpoint controls

Enable RLS on every exposed application table and grant only necessary privileges. Policies must reflect staff permissions and permitted records, not assume all data is private to its creator. Test anonymous, permitted, read-only, disabled, and denied actors. Do not derive permissions from user-editable metadata or claim RLS is verified using only a service-role connection. Protect update predicates and new row values. Review view security and function execution grants. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Prefer invoker functions. Where narrowly privileged functions are necessary, use an explicit caller/permission check, fixed safe search path, restricted execution grants, and a reviewed exposure boundary. Do not use `SECURITY DEFINER` as a general permission-error workaround. [Database function security](https://supabase.com/docs/guides/database/functions).

Use the current publishable client key for public configuration; legacy anon naming is compatibility only. Keep secret/service-role credentials strictly server-only and optional unless an administrative operation needs them. Never use those credentials as the default client for ordinary requests. Document placeholders in `.env.example`, ignore real environments, rotate leaked secrets, and never log tokens/passwords.

Keep student photos and financial attachments in private buckets with authorized access and short-lived links. Validate size and content type; restrict file types and paths. Apply rate limits to sign-in and expensive/sensitive operations, enforce request-size limits, parameterize queries, and configure HTTPS, security headers, and appropriate origin protection. Protect CSV exports against formula injection. Redact student/guardian data from diagnostics and test artifacts.

Use [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/) as the security review catalogue, targeting applicable Level 2 controls. Map applicable controls to implementation/tests; record exceptions with owner and remediation. This is a verification target, not a certification claim.

## 8. Financial Integrity and Reliable Writes

FEE-01, PAY-01, and OPS-01 require database-enforced invariants:

1. Store money in `NUMERIC(14,2)`. Preserve exact decimal values across API boundaries, preferably as decimal strings; do not silently coerce them to JavaScript floating point. Test serialization and rounding, including fractions and boundary amounts.
2. Snapshot invoice lines and receipt values, including the relevant identity/document details. Configuration edits must not rewrite historical documents. Keep academic enrollment history.
3. Reject nonpositive payments/expenses/deductions, invalid references, cancelled invoice payments, and overpayment unless credits are explicitly enabled. Use database constraints as well as application validation.
4. Record payment, update/derive the authoritative balance, create one receipt, and append the audit event in one database transaction. Multiple separate Supabase client writes do not form a transaction.
5. Serialize conflicting financial writes using an appropriate row lock or equivalent database strategy; recheck balance under that protection. Concurrent partial payments must not both spend the same outstanding amount.
6. Use an idempotency key with a uniqueness constraint and request fingerprint for retryable financial operations. A retry returns the committed result; reuse with a different payload is rejected. Handle a lost response by checking operation status before resubmitting.
7. Generate unique invoice/payment/receipt numbers server-side. Do not use browser counters or `MAX(number) + 1`. Uniqueness is required; any gapless numbering requirement needs a separate explicit decision.
8. Block direct edits/deletes to posted financial records, including through exposed APIs. Route corrections through authorized reversals/cancellations carrying reason, actor, and time. Exclude voided entries from active totals.
9. Keep authoritative totals and reporting consistent. Any stored aggregate must update transactionally or have a documented reconciliation mechanism; never let cached totals become accounting truth.

Use narrowly scoped PostgreSQL functions called through Supabase RPC for atomic business operations. PDF rendering/export delivery happens after the financial commit and can be retried without creating another payment or receipt. Test rollback, duplicate requests, concurrent writers, reversal permissions, and failed post-commit delivery.

## 9. Fast Tables and Read Performance

PERF-01 is an end-to-end requirement, not a promise that adding indexes makes every query fast.

- Fetch the initial table page on the server with only required columns and relationships. Do not download the full student/payment dataset for browser filtering or issue one query per row.
- Default to 25 rows; allow controlled page sizes up to 100. Validate all limits server-side. Store filters/sort/page state in the URL; debounce text searches around 250–350ms and prevent stale responses replacing newer results.
- Apply search, filtering, sorting, and pagination in the database. Keep a stable unique sort tie-breaker. Use cursor/keyset pagination for growing transaction feeds and deep navigation; use offset pagination only for bounded datasets where numbered pages are useful and measured.
- Reset pagination when filters change. Do not sort one page locally while presenting it as the order of the entire dataset. Avoid exact full-dataset counts on every keystroke; use a justified count strategy or next-page indication.
- Match indexes to actual filters, joins, order, and RLS predicates. Consider composite/partial indexes for measured workloads; do not index every column because indexes also cost writes and storage. Benchmark representative data using query plans. [Supabase query optimization](https://supabase.com/docs/guides/database/query-optimization).
- Use exact/prefix lookup for identifiers where possible. For substring/name search, choose a suitable indexed search approach when measurements justify it. Never interpolate search input into raw SQL or unchecked filter expressions.
- Use TanStack Table as interaction state with server-controlled data, not an excuse to load all records. Add virtualization only if rendering measurements justify it. Preserve keyboard/table accessibility. [shadcn/ui data tables](https://ui.shadcn.com/docs/components/data-table), [TanStack pagination](https://tanstack.com/table/v8/docs/guide/pagination).
- Stream slow sections with loading/Suspense boundaries so one expensive chart does not block usable page content. Parallelize independent reads, deduplicate current-user lookups, and lazy-load heavy export/chart tooling. [Next.js data fetching](https://nextjs.org/docs/app/getting-started/fetching-data).
- Treat cache policy explicitly. Never place personalized results in an unscoped shared cache. Authorize every request and invalidate affected lists, balances, and summaries after writes. Clearly label intentionally delayed reporting; read-after-write financial results must be current.
- Put application compute near the selected database region after considering school latency and data requirements. Keep transactions short; bound batch/import work and use appropriate pooling only if introducing direct database connections. [Supabase performance guidance](https://supabase.com/docs/guides/platform/performance).

`EXPLAIN ANALYZE` executes its statement. Use it only for reviewed safe reads or controlled operations on a disposable test database; never profile writes against production as if the command were read-only.

### Proposed performance acceptance budgets

These are project targets to establish in the first runnable baseline, not observed results or vendor guarantees. Record environment, region, network, dataset size, request count, and cold/warm cache state.

| Measurement | Initial target and measurement boundary |
| --- | --- |
| Core Web Vitals | p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; monitor real usage once sufficient samples exist. |
| Table interaction | p95 ≤800ms from submitted query to displayed rows on the agreed test network, excluding debounce. |
| Application read | p95 ≤400ms server processing for a normal paginated request, excluding browser network time. |
| Financial write | p95 ≤800ms request-to-committed API response on the agreed network, excluding PDF generation. |
| Core SQL | Investigate p95 >100ms for common bounded reads/transactions; measure locks separately and include RLS. |

Core Web Vitals thresholds follow [web.dev](https://web.dev/articles/vitals); the other budgets are engineering proposals. Initially benchmark synthetic sets of roughly 5,000 students and 100,000 financial records with 20 concurrent sessions, then recalibrate against confirmed school scale. Separate cold-start results from steady-state samples. Report p50/p95, errors, payload sizes, and query counts; a skeleton alone does not meet a data-loading target. Never remove authorization, validation, or audit writes to meet latency budgets.

## 10. Supabase Skills and MCP Operating Procedure

Read `supabase` for backend work and `supabase-postgres-best-practices` before schema, SQL, RLS, indexing, or query-performance work. Read the relevant reference files, current docs, and changelog. Project rules take precedence over generic skill suggestions to make untracked schema edits.

For agent-operated migrations, database inspection, and backend debugging, Supabase MCP is required:

1. Establish the correct project and environment from configuration and `get_project_url`. Tool availability alone does not prove a connection belongs to this school. Do not inspect unrelated projects or print keys/student data.
2. Use `search_docs`, `list_tables`, and `list_migrations` to ground the change. Start diagnosis with scoped `query_logs` and relevant advisors; use bounded read-only `execute_sql` for evidence.
3. Prepare and review versioned SQL under `supabase/migrations/`, including indexes, privileges, RLS, and verification/recovery notes. Apply through `apply_migration` to the intended development/test environment before promotion.
4. Keep the applied SQL and repository migration history aligned, including the actual recorded migration identity. Never edit already-applied migrations to conceal drift or use ad hoc DDL to bypass history.
5. Verify affected behavior, RLS under representative actors, and negative cases. Run security/performance advisors and regenerate database types after schema changes. Advisors alone are not a security test.
6. Prefer additive compatible changes. Review locks, transaction limits, and nontransactional operations before deployment; test a forward-recovery or restore plan for risky changes.
7. If MCP is unavailable or its target is uncertain, continue offline work and report the blocker. Do not silently substitute direct SQL/CLI access or claim remote verification.

This requirement governs agent administration, not application runtime: the app uses ordinary Supabase clients. Automated integration tests use a deliberately configured isolated test environment and reviewed fixtures; they are not a fallback for unrestricted agent database access. No agent should inspect or migrate a live database merely to write these documents.

As of this research, Supabase is moving logs queries to ClickHouse and deprecating extension version clauses. Use the discovered tool schema and platform-supported extension defaults; do not copy obsolete commands. [Logs change](https://supabase.com/changelog/48235-migration-of-supabase-management-api-logs-all-analytics-endpoint-to-logs-endpoint), [extension change](https://supabase.com/changelog/extension-version-pinning-ignored).

## 11. Design and Modular UI

Read and apply `gpt-taste` for every design change with the project-specific overrides in [design.md](Project%20Files/design.md). The dashboard reference, accessible operational controls, school red, and financial clarity take precedence over marketing layouts and decorative animation. Use every additional skill relevant to the actual task, including browser verification and `react-doctor` after React changes.

Reuse semantic theme tokens and accessible primitives across pages. Separate field controls, feature forms, table shells, domain columns, and layouts. Do not duplicate a near-identical form/table in each route. Verify loading, error, empty, denied, and mobile states alongside the successful desktop view. Keep synthetic/demo information unmistakable.

## 12. Test Strategy and Required Commands

QA-01 requires several kinds of evidence. A build, a coverage percentage, or a browser screenshot alone is insufficient.

| Layer | Tool/location | Required focus |
| --- | --- | --- |
| Unit/component | Vitest + React Testing Library; colocated `*.test.ts(x)` | Rules, parsing/validation, currency formatting, and meaningful control behavior. |
| Integration | `tests/integration/`; isolated Supabase environment | Authorization, RLS, constraints, RPC transactions, concurrency, and retry behavior. |
| Database | `supabase/tests/`; pgTAP where appropriate | SQL invariants, grant/policy boundaries, snapshots, and receipt uniqueness. |
| End to end | Playwright, `tests/e2e/*.spec.ts` | Actual sign-in, navigation, data entry, filters, payments, receipts, and denied operations. |
| Visual/accessibility | Browser skill, screenshots, keyboard checks; automated accessibility checks where appropriate | Reference fidelity, labels, focus, responsive behavior, and reduced motion. |
| Performance | Recorded browser/network metrics and representative database/load tests | PERF-01 budgets, bounded payloads, query count, lock contention, and error rate. |

Use isolated deterministic fixtures; never real student data or production for destructive tests. Test public/API boundaries as well as UI controls. Keep tests focused on observable behavior instead of implementation details. Do not add trivial tests that merely repeat constants or snapshots to increase coverage.

Use Vitest coverage reporting for visibility. Initial proposed thresholds for handwritten domain/validation/permission logic are 90% line and 85% branch coverage; document exclusions, and adjust only with a reason. Every named financial/security invariant needs an explicit positive and negative test regardless of percentage. [Vitest coverage](https://vitest.dev/guide/coverage.html), [Supabase pgTAP](https://supabase.com/docs/guides/database/extensions/pgtap).

Playwright tests should use roles/labels, web-first assertions, isolated state, and failure traces; avoid arbitrary sleeps. Cover Chromium, Firefox, and WebKit for release acceptance, plus desktop/tablet/mobile layouts. Exercise real authorized writes against test data, failed writes, duplicate submission, expired sessions, back/refresh behavior, and read-only users. Inspect console/network failures and screenshot the implemented UI. [Playwright best practices](https://playwright.dev/docs/best-practices).

Establish these scripts during scaffolding; **they do not exist yet**:

| Command | Required behavior |
| --- | --- |
| `pnpm dev` | Run the development app. |
| `pnpm lint` | Run ESLint; fail on errors and unreviewed warnings. |
| `pnpm format:check` | Check formatting without rewriting files. |
| `pnpm typecheck` | Run `tsc --noEmit`. |
| `pnpm test` | Run Vitest once, not watch mode. |
| `pnpm test:coverage` | Run configured coverage gates. |
| `pnpm test:db` | Run the reviewed database/integration harness against an explicitly isolated test target. |
| `pnpm build` | Run the production Next.js build. |
| `pnpm start` | Serve the production build. |
| `pnpm test:e2e` | Run Playwright; CI should exercise the built app, not only the dev server. |

After meaningful implementation changes, run lint, typecheck, relevant automated tests, and `pnpm build`; run browser tests for UI behavior and database tests for backend changes. Configure CI in that order, building before production-mode E2E tests. Keep credentials out of artifacts. A missing environment, unavailable MCP, skipped test, or failed build is a reported limitation, never a passing check. Documentation-only work requires source/link/consistency checks, not a fabricated application test report.

## 13. Observability, Recovery, and Release Readiness

Record structured request IDs, operation names, durations, and safe error codes. Keep durable business audit events separate from diagnostic logs. Never place full records, authentication material, or unrestricted SQL results in logs. Restrict audit access and retention according to school-approved policy.

Monitor failed sign-ins, rejected writes, payment conflicts, slow queries, error rates, and resource saturation. Instrument first; add a monitoring vendor only after reviewing cost and data exposure. Keep export/report work bounded and recoverable rather than blocking payment recording.

Use separate development, test/staging, and production configuration. Before release, verify backups and a restore rehearsal covering both database records and stored files; agree recovery objectives, retention, and ownership with the Chief Engineer. Supabase database backups do not include Storage API objects, so file recovery needs its own provision. Document migrations, rollback/forward recovery, initial administrator provisioning, operational smoke checks, and staff handover. [Supabase backup coverage](https://supabase.com/docs/guides/platform/backups).

## 14. Review and Definition of Done

Each implementation change must identify requirement IDs, scope, relevant tables/routes/components, risks, and how it will be verified. Record material architecture decisions under `docs/decisions/` when created; do not make every small refactor an approval ceremony.

A feature is done only when applicable requirements pass: behavior and financial invariants, server authorization/RLS, validation, auditing, resilient states, accessibility, responsive design, tests, type checks, lint, production build, and measured performance. Include screenshots/traces for UI changes and migration/advisor evidence for database changes. Record remaining risks, not just successful commands. Avoid unrelated rewrites and retain the original business scope.

Production release additionally requires the Chief Engineer's acceptance of the release evidence and any explicitly documented residual risks. Never mark critical financial/security gaps as cosmetic follow-up work.

## 15. Phase Plan Maintenance

Maintain [Plan.md](Plan.md) as the execution plan derived from this specification and the original guide's development sequence, preserving the separate Phase 0 foundation limit. Phase 0 implementation is in progress. Its task status, evidence log, and handover are the progress record.

Each phase must state its objective, requirement IDs, dependencies, deliverables, affected modules/migrations, test cases, performance/security checks, definition of done, and out-of-scope work. Each task needs a stable ID and status such as not started, in progress, blocked, or verified complete. Completion evidence must name the commit/files, commands/results, browser/database verification, and unresolved issues.

Keep foundation before people/business workflows, invoice/payment correctness before financial reporting, and realistic staging validation before client data/deployment. Define clear entry/exit gates and recovery notes for database changes. Do not mark a task complete because files exist. Schedule estimates must expose assumptions about client data and infrastructure; do not promise dates unsupported by the plan.

## 16. Baseline Observations and Open Decisions

At authoring, the repository has documentation and local skills but no `package.json`, application, migrations, CI, or test runner. Node and pnpm are available. Supabase MCP documentation search was used; no school database was inspected or modified. No application security or performance claims have been verified.

Original specification verification: local document links, Markdown fence balance, and requirement IDs were checked before `Plan.md` was created. Attempts to run `pnpm test`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` each exited with code 1 and `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`. No application/browser test executed. These are missing-scaffold limitations, not successful QA-01 results. The subsequent phase plan adds task tracking and decisions without changing application or database state.

Resolve these before their dependent phase: correct Supabase project/environment, deployment region/provider, school device/browser baseline, expected data/concurrency, actual school configuration and import files, document samples, production permissions, and backup/recovery requirements. Use configurable design and synthetic fixtures while details are pending. These are tracked decisions, not reasons to stop unrelated authorized work.

Sources linked throughout were checked during this research. Recheck installed-version documentation and security advisories during implementation; dated version observations are not permanent recommendations.
