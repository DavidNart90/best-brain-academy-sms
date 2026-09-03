# STAFF-01 known-details onboarding verification

Date: 2 September 2026. Owner: Codex, under the Chief Engineer's staff-first authorization. Phase 2's previous closure is preserved; this is a scoped prerequisite extension, not finance implementation.

## Applied change

- Supabase MCP connection restored; get_project_url confirmed test-only project `cefwopisbgfctzdloequ`. Tables and migration history inspected before changes; the staff tables were empty.
- Applied migration `20260902185750_staff_known_details_and_teaching_assignments` through MCP, verified as migration 17. Matching SQL is in `supabase/migrations/`; applied migrations were not edited. Database types regenerated through MCP.
- Source full names can be stored without inventing name components. Unknown phone, email and employment dates remain null. Known subjects are independent of class assignments.
- Staff IDs are allocated as `BBS-Staff-001` onwards using a locked transactional counter. Payload-bound create/import request keys return the original result on replay and reject changed requests. Numbering, staff, assignments, request result and audit are atomic.
- Assignments preserve explicit class-subject pairs and separate headship. Old class-only assignments retain general/unconfirmed semantics. Ending and reappointment preserve history; active assignments prevent archiving. Direct public writes stay denied and every new table has RLS.
- Forms, directory/profile queries and display, import/template/export contracts, Zod schemas, generated types and tests were updated together. GPT Taste was applied with the project's restrained dashboard overrides, preserving existing red tokens, form panels and responsive grids.

## Roster reconciliation

The real roster remains in ignored local review files, never tracked fixtures, migrations, evidence screenshots or seeds. The user signed into the application themselves; no existing identity was impersonated through SQL.

The prepared private workbook used namespace-prefixed SpreadsheetML that ExcelJS 4.4.0 could not read. The same read failure was reproduced locally before database calls. Staff count remained zero after the failed attempts. Instead, all 18 records were saved through the authenticated Add Staff form. The workbook must not be re-imported now; it is an intermediate, not a supported delivered import file. Unreadable workbooks now receive an explicit format-error/no-records-saved message rather than misleading duplicate guidance.

MCP reads were compared privately with all source rows: names (including both user corrections), IDs, types, positions and known subjects match; unknown first/middle/last components, contacts and employment dates remain null. Final counts:

| Record                                | Verified value                                |
| ------------------------------------- | --------------------------------------------- |
| Active staff                          | 18                                            |
| Teaching / non-teaching               | 14 / 4                                        |
| Display IDs                           | BBS-Staff-001 through BBS-Staff-018           |
| Create requests / staff audit entries | 18 / 18                                       |
| Next display number                   | 019                                           |
| Class assignments                     | 0; effective context is awaiting confirmation |
| New staff login accounts              | 0                                             |

Known subjects include the two specialists whose classes were absent. No leadership, extra classes, employment dates or contact details were inferred.

## Business-rule checks

`supabase/tests/staff-known-details.sql` ran through MCP and passed. It creates a new synthetic actor/session within a rollback-only transaction, never borrows an existing user's identity, and exercises:

- optional details and exact ID casing;
- two explicit class-subject pairs plus separate headship;
- atomic staff/assignment audit;
- identical request replay without duplicate staff/audit, and changed-payload rejection;
- duplicate active pair rejection, assignment ending and reappointment history;
- archiving blocked while assignments are active;
- invalid import row rolling back the entire batch and audit;
- invalid phone and client-side ID override rejection;
- denied direct staff/assignment writes, disabled user reads/writes and anonymous RPC access.

All synthetic actors, sessions, requests, staff, assignment and audit data rolled back. Database identity sequences may advance on rollback; the user-facing transactional counter did not lose the first number.

`supabase/tests/staff-concurrency.sql` is a prepared two-session probe. Two MCP calls were dispatched in parallel with an eight-second hold in session A, but observed RPC times (0.015 and 0.008 seconds) did not demonstrate overlapping execution or lock waiting. Do not count this as a concurrency pass. Unique indexes and row locks are implemented, but genuinely simultaneous allocation/retry verification remains open.

## Application checks

| Check                                           | Result                                                 |
| ----------------------------------------------- | ------------------------------------------------------ |
| `pnpm lint`                                     | Exit 0                                                 |
| `pnpm typecheck`                                | Exit 0                                                 |
| `pnpm test`                                     | Exit 0; 68/68 tests across 12 files                    |
| `pnpm build`                                    | Exit 0                                                 |
| Focused Prettier checks                         | Passed for changed application and documentation files |
| `npx -y react-doctor@latest . --verbose --diff` | Exit 0; score 77/100, six warnings; triage below       |

Workbook tests cover the application's own template, incomplete details, explicit pairs, stable exact-file request keys, duplicate rows/IDs, missing assignment dates, dangling staff-row references, formula rejection and unreadable-file messaging. Initial tests caught an optional-date validation bug, which was fixed before onboarding.

Focused browser checks used the real signed-in administrator, not a broad E2E suite: desktop staff form/profile and all 18 save results; required-name/subject/date feedback; mobile 390x844 and tablet 768x1024 layouts. No horizontal page overflow was observed. Temporary viewport overrides were reset. Unknown contacts/dates show Not recorded; finance/salary panels remain unavailable. No permanent synthetic UI fixtures were saved.

React Doctor findings were reviewed in code: admissions/staff page complexity and staff form length are maintainability suggestions; two filter/map chains operate on bounded reference/assignment arrays with no demonstrated bottleneck. The admissions useSearchParams/Suspense warning concerns an unchanged, request-rendered route; production build passed, and no related behavior change was made. These remain non-blocking findings, not suppressed or represented as a clean score.

## Advisors and limitations

Security: no ERROR notices; fourteen WARN notices for intentional permission-checking authenticated SECURITY DEFINER RPCs, the existing Free-plan leaked-password-protection WARN, and two INFO no-policy notices for private request/counter tables. Those private tables intentionally have no authenticated/anonymous grants or policies; adding an allow policy just to silence the advisor would weaken the boundary. See [RPC advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [deny-all RLS notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), and [password-protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Performance: sixteen INFO unused-index notices, no WARN/ERROR. Foreign-key indexes are retained rather than removed from an initially empty/low-volume dataset. No representative load benchmark is claimed.

The generic live-provider test harness and broad E2E suite were not run. Focused MCP SQL and actual authenticated form saves provide the evidence above; hosted spreadsheet import remains unverified. No production deployment or finance schema/data changes occurred.

## Remaining entry checkpoint

Confirm Lower/Upper Nursery as Nursery 1/2 and whether supplied teaching assignments belong to 2026/2027 Term 1 starting 8 September 2026. Save confirmed pairs through the authenticated app and reconcile them. Leave unspecified headship and specialist classes unset. Complete genuinely overlapping concurrency verification before closing STAFF-01; then P3-01 only is authorized. P3-02 onward and Phases 4/5 remain unstarted.
