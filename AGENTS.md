# Repository Guidelines

## Required Session Startup

At every session startup, read this file, `Project.md`, and `Project Files/design.md` completely, then read `Plan.md`'s overview, current phase, dependencies, decisions, and handover. Resolve paths from the repository root, even when working in a subdirectory; do not rely on another session's memory. Report missing required references rather than inventing guidance. Keep these files in version control for fresh clones/worktrees.

## Document Reading Order

| When | Required source |
| --- | --- |
| Starting any task | [Project.md](Project.md): architecture, security, performance, quality gates, and Chief Engineer ownership. |
| Planning or implementing phases | [Plan.md](Plan.md): phase/task IDs, dependencies, acceptance gates, decisions, and handover. Update status and evidence after meaningful progress; do not claim approval or completion without evidence. |
| Business rules or architecture | `Project Files/PROJECT_GUIDE_BEST_BRAIN_ACADEMY.md`: read fully before architectural work; revisit feature-specific rules. |
| Any design change | `Project Files/design.md`, `Project Files/design_system.md`, `Project Files/design_inspiration.jpg`, and `gpt-taste`. |
| Backend or verification work | Relevant sections of `Project.md`, current phase criteria, applicable skills, and installed-version documentation. |

The user is Chief Engineer. Follow authorized scope autonomously; escalate consequential scope, architecture, or risk decisions with evidence. Business rules, engineering requirements, design rules, and execution order have separate authorities as defined in `Project.md`.

## Project Structure & Module Organization

The repository contains the Phase 0 application foundation and planning documents. `Project.md` defines module boundaries; `Plan.md` records verified progress and backend blockers.

Foundation directories (future modules remain unimplemented):

- `src/app/`: routes, layouts, Server Actions, and Route Handlers.
- `src/components/`: shared UI; `src/features/`: domain-specific modules.
- `src/lib/`: clients, authorization, validation; `src/hooks/`, `src/types/`, `src/utils/`: shared support.
- `public/`: assets; `supabase/migrations/`: SQL migrations; `supabase/seed.sql`: development seeds.
- `tests/e2e/`, `tests/integration/`, and `supabase/tests/`: browser, integration, and prepared database tests. Real-provider checks still require an authorized isolated target.

## Design References

Use **school red `#BD3B36`**, hover `#9F302C`; older blue guidance is superseded. Follow the inspiration image's sidebar, search bar, chart, four KPIs, and table composition. No AI slop: reject generic templates, decorative gradients, oversized headings, arbitrary cards/colors, filler copy, and gratuitous motion. Use accessible controls and semantic tokens.

## Required Skills

Read and apply `gpt-taste` for every design change, following the dashboard-specific overrides and acceptance checklist in `Project Files/design.md`. Use every other relevant skill: `supabase` for backend work, `supabase-postgres-best-practices` before SQL/schema/RLS changes, browser skills for UI verification, and `react-doctor` after React changes. Read each required `SKILL.md`; report unavailable skills rather than pretending compliance. Local skills live in `.agents/skills/`.

## Architecture & Scope

Use supported Node.js LTS, pnpm, Next.js App Router, strict TypeScript, latest stable Tailwind CSS, shadcn/ui, Lucide, Recharts, React Hook Form, Zod, and Supabase. Pin compatible versions and the lockfile. No competing backend or Prisma. Keep routes thin, features modular, privileged data access server-only, and table queries bounded. Phase 0 covers authentication, permissions, navigation, tokens, and labeled demo dashboards; defer business CRUD and finance workflows.

## Build, Test, and Development Commands

The scaffold defines these commands; see `README.md` for runtime and test-environment setup:

- `pnpm install`: install dependencies; commit `pnpm-lock.yaml`.
- `pnpm dev`: start local development.
- `pnpm lint`: run ESLint.
- `pnpm format:check`: check formatting.
- `pnpm typecheck`: run `tsc --noEmit`.
- `pnpm test`: run unit/component tests once.
- `pnpm test:db`: verify database/integration behavior on an isolated target.
- `pnpm build`: verify the production build.
- `pnpm test:e2e`: run Playwright against the application, using the production build in CI.

See `Project.md` for coverage, script setup, CI ordering, and performance acceptance criteria. Never report unavailable scripts as passing.

## Coding Style & Naming Conventions

Use two-space indentation, PascalCase components, camelCase functions, kebab-case filenames, and `@/*` imports. Preserve `page.tsx`/`layout.tsx`. Avoid `any` and suppressed type errors. ESLint and Prettier are configured; run both checks after changes.

## Testing Guidelines

Vitest, React Testing Library, and Playwright are configured. Follow `Project.md` for database tests and proposed coverage thresholds. Colocate `*.test.ts(x)`; use `tests/e2e/*.spec.ts` for browser journeys. Phase 0 synthetic browser checks do not verify hosted Auth or RLS. Later finance phases must verify snapshots, partial payments, concurrent writes, retries, reversals, and receipt uniqueness. Use synthetic fixtures and inspect desktop/tablet/mobile behavior. Report actual commands/results and limitations.

## Commit & Pull Request Guidelines

History contains only `Initial commit`. Use imperative subjects, e.g., `Add protected dashboard layout`. PRs should explain scope, link issues, list checks, include UI screenshots, and identify migrations/configuration changes.

## Supabase MCP Workflow

Use **Supabase MCP for migrations, database reads, and backend debugging**. Verify the target project/environment first. Inspect `list_tables` and `list_migrations`; use `execute_sql` for scoped read-only inspection, `query_logs` for diagnostics, and `get_advisors` for security/performance checks. Apply reviewed schema changes with `apply_migration`, preserving matching SQL in `supabase/migrations/`. Verify migration history, affected behavior, and permissions; regenerate database types when needed. Do not bypass migration tracking with ad hoc DDL. If MCP is unavailable, continue offline preparation and report the blocker; never silently substitute CLI/direct database access or claim remote verification.

## Security & Financial Integrity

Keep credentials untracked; document placeholders in `.env.example`. Secret/service-role keys stay server-only. Enforce server authorization, Zod validation, and RLS; prohibit public signup and automatic privileged roles. Use migrations, `NUMERIC(14,2)`, and transactional financial writes with concurrency/retry safeguards. Display `GHS 1,250.00`; preserve snapshots and audited reversals. Security and financial correctness must not be weakened to meet performance targets.
