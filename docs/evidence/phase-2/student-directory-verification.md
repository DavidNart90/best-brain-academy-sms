# Phase 2 Student Directory and Onboarding Verification

**Task:** P2-01–P2-02 authorized student slice  
**Date:** 1 September 2026  
**Owner:** Codex  
**Target:** Approved isolated Supabase test project `cefwopisbgfctzdloequ`

## Delivered scope

- Applied tracked migration `20260901133516_student_directory_and_onboarding` through Supabase MCP; the local migration filename matches remote history.
- Added `students`, `guardians`, `student_guardians`, and `student_enrollments` with constraints, foreign-key indexes, RLS, audit triggers, and immutable enrollment rows rather than overwriting class/year/term/location history.
- Added a `security_invoker` `student_directory` view and permission-gated `create_student(jsonb)` / `import_students(jsonb)` RPCs. Direct authenticated writes remain revoked. A student, guardian link, and initial enrollment commit or roll back together.
- Added the `/students` directory with a true-empty three-step state, server-side filters/search, stable 25-row pagination, no-results/loading/denied states, and filtered Excel export.
- Added `/students/new` onboarding and `/admissions/new` routing with a shared Zod contract on the client and server.
- Added a reusable spreadsheet-import dialog and reusable directory empty state. Student import provides a reference-backed template, 250-row limit, preview, row errors, within-file and existing-record duplicate detection, explicit checkbox confirmation, and one transactional save.
- Applied tracked migration `20260901141827_add_student_disability_and_religion`. Manual and Excel onboarding now require a disability Yes/No answer, require details when Yes, and collect religious denomination. Preview and export carry the same fields.
- Updated `Project Files/design.md` with the reusable records/forms/import pattern. Staff and Administrators were not implemented.

## Database and security evidence

- `pnpm test:db`: 8/8 hosted Auth/Data API tests passed. Anonymous, pending, and disabled actors cannot read student data or call write RPCs; the allowed actor can read through RLS but cannot insert directly.
- Real allowed-actor RPC verification created exactly one synthetic student, one guardian link, one enrollment-history row, and one student audit row. A second identical call returned PostgreSQL `23505`. A two-row import containing an invalid class was rejected and created zero batch rows, proving all-or-nothing behavior.
- Exact cleanup removed only admissions `BBA/VERIFY/20260901A` through `C`, their orphaned synthetic guardian/audit records, and synthetic test sessions. Final counts were zero students, zero matching guardians, and zero synthetic sessions; test actors can establish fresh sessions on their next sign-in.
- Supabase security advisor reports the two intentional authenticated `SECURITY DEFINER` RPC warnings plus the existing Free-plan leaked-password warning. The RPCs use fixed search paths, verify the live actor and explicit permission internally, and are covered by negative real-provider tests. Performance advice is INFO-only unused indexes on empty/new tables.
- No financial table, invoice, fee, payment, receipt, expense, deduction, or balance record was created.
- The extension verification transaction stored a valid synthetic row, rejected Yes without disability details, and rolled back without adding records. Both new columns are required, and the directory view remains `security_invoker`. Final review found one unmarked student/guardian/enrollment bundle and one active session created through the workflow; they were preserved rather than treated as disposable verification data.

## Focused checks

| Check                                                                                                                  | Result                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec vitest run src/features/students`                                                                           | 11/11 passed: Zod normalization/rejection and client/server round-trip, conditional disability validation, template/import/export fields, row errors, duplicates, query bounds, and term-name resolution by academic year.                      |
| `pnpm test:db`                                                                                                         | 8/8 passed against real hosted Auth, RLS, grants, and RPC boundaries.                                                                                                                                                                           |
| Real RPC create/duplicate/import rollback + exact MCP inspection                                                       | Passed: 1 created bundle, duplicate `23505`, invalid batch rejected with 0 partial rows, then exact cleanup to 0.                                                                                                                               |
| Isolated-port production build + `pnpm exec playwright test tests/e2e/foundation.spec.ts --grep "student empty state"` | 3/3 passed on desktop, tablet, and mobile. Verified disability selection reveals required details, denomination validation, ordered empty-state/import behavior, axe, and no page overflow. Screenshots were inspected for all three viewports. |
| In-app browser visual inspection                                                                                       | Passed at 1440 × 1000: compact school-red empty state, three ordered actions, consistent shell spacing, no clipping. The form action row was changed from sticky to normal flow after screenshot review so it cannot obscure guardian fields.   |
| `npx -y react-doctor@latest . --verbose --diff`                                                                        | 100/100; no findings.                                                                                                                                                                                                                           |
| `pnpm audit --prod`                                                                                                    | No known vulnerabilities after pinning ExcelJS's transitive `uuid` to 11.1.1; workbook tests passed with the override.                                                                                                                          |
| `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`                                                       | Passed after the extension.                                                                                                                                                                                                                     |
| `npx -y react-doctor@latest . --verbose --scope changed`                                                               | 100/100; no findings.                                                                                                                                                                                                                           |

## Remaining scope and risk

- The in-app browser's URL policy blocked direct localhost control for this extension. The affected production-mode Playwright journey passed at all three viewports, and its generated screenshots were inspected instead.
- Student profile/detail, photo Storage, enrollment-change UI, Staff, and Administrators remain Phase 2 work and were intentionally not implemented.
- The current school volume is about 200 students. Queries are bounded and indexed, but representative workload measurement remains P5-04 as planned.
- The spreadsheet flow accepts `.xlsx` only, limits files to 2 MB and 250 rows per import, and exports at most 5,000 filtered rows. Broader client-data migration/reconciliation remains Phase 6.
