# Phase 1 Academic Configuration Evidence

**Date:** 1 September 2026  
**Owner:** Codex  
**Scope:** P1-01 through P1-05.

## Authorized school configuration

The Chief Engineer supplied the class, term, academic-year, location and fee-reference requirements. The markdown fee schedule and supplied handwritten image agree. The normalized source and its authority boundary are recorded in [school-configuration-2026-2027.md](../../requirements/school-configuration-2026-2027.md).

Applied configuration:

- Academic year `2026/2027` (`26/27`), 1 September 2026–31 August 2027.
- Term 1 starts on the confirmed 8 September 2026 date and currently uses 7 December 2026 as a disclosed three-month planning date.
- Term 2 and Term 3 remain unscheduled so administrators can enter the official dates.
- 13 classes: Nursery 1–2, KG 1–2, Basic 1–6 and JHS 1–3.
- Five locations: Osenase & Akwadum, Asuofori, Kobriso & Abaase, Anomaa Kojo and Bamenase.
- Best Brain Academy details and the configurable `Location / Transport` label.

Fee amounts are requirements only. No fee component, invoice, payment, receipt or finance configuration was created in Phase 1.

## Database and security

MCP applied `20260901111519_academic_configuration`; the matching local file is `supabase/migrations/20260901111519_academic_configuration.sql`. The migration adds academic years, terms, classes, school locations/settings and protected immutable audit logs, plus a permission-checked current-context RPC. All six tables have RLS and explicit grants.

Verified remote counts after testing: one academic year, three terms, 13 classes, five locations, one school-settings row, 23 seed audit records and zero Auth sessions. A rollback-only SQL verification rejected overlapping and out-of-year term schedules and confirmed exactly one current year and current term.

`pnpm test:db` passed all eight provider/RLS tests. The active SUPER_ADMIN actor can read academic configuration and reaches ordinary database constraints on an authorized write; pending and disabled actors read no configuration and cannot write. Anonymous access is denied. The real-provider browser suite passed allowed, pending and disabled journeys. Metadata cannot grant roles or status.

The security advisor reports only Free-plan leaked-password protection. New indexes may remain unused until the people and finance workflows create representative traffic; they will be reviewed in Phase 5.

## Application and table behavior

The explicit `/classes`, `/settings/academics` and `/settings/school` routes replace their Phase 0 unavailable shells. They provide:

- a 12-month academic calendar and current-context selector;
- editable, validated and audited academic-year, term, class, school-details and location forms;
- archive states instead of destructive configuration deletion;
- a classes table with exact-count, 25-row server pagination, stable database-wide ordering, Zod-normalized URL filters, 350 ms debounced search, retained URLs and consistent empty/error states;
- bounded configuration reads: six parallel requests with limits of 25 or 100, and a single bounded request for each classes page—no per-row request loop.

The synthetic production browser suite passed 24/24 tests across desktop, tablet and mobile, including the new routes, debounced URL search, all approved values, denied management settings access and axe checks. A separate live in-app browser review confirmed the academic and school settings layouts, no console warnings, and no horizontal overflow at a 390 px viewport. React Doctor scored 100/100 with no findings.

## Quality checks

| Check                         | Result                                  |
| ----------------------------- | --------------------------------------- |
| `pnpm lint`                   | Exit 0                                  |
| `pnpm format:check`           | Exit 0                                  |
| `pnpm typecheck`              | Exit 0                                  |
| `pnpm test:coverage`          | 30/30; 96.66% lines, 93.10% branches    |
| `pnpm test:client-boundary`   | Exit 0; no forbidden server/key markers |
| Synthetic-config `pnpm build` | Exit 0                                  |
| `pnpm test:e2e`               | 24/24 across desktop/tablet/mobile      |
| `pnpm test:db`                | 8/8 real provider/RLS checks            |
| Real-config `pnpm build`      | Exit 0                                  |
| `pnpm test:e2e:auth`          | 3/3 real-provider browser journeys      |
| React Doctor changed scope    | 100/100; no findings                    |

## Operating profile and handover

The Chief Engineer confirmed 10 devices, approximately 200 students, 5–10 concurrent users, Chrome and Edge, desktop-first use with responsive tablet/mobile support, and approximately 5,000–10,000 finance records per academic term. The exact school connection speed is not measured; Phase 5 will test ordinary and constrained profiles and Phase 6 will validate the real site connection. This does not block Phase 2.

Phase 1 is complete. No Phase 2 or finance implementation was included in this evidence.
