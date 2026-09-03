# Staff onboarding requirements

**Source:** Chief Engineer's staff image and follow-up instructions, 2 September 2026.
**Status:** Compatibility applied and 18 known-details staff verified; class assignments and overlapping concurrency verification pending.

## Confirmed scope

Before P3-01, onboard the current roster of 18 staff: 14 teaching and four non-teaching. Staff are employment records, not Auth accounts. This follow-up does not start finance, salary deductions, payroll, or additional Phase 3 sections.

Real names and the image transcription belong in a private, Git-ignored review file, not application fixtures, seed SQL, migrations, or public assets. The local preview is `.tools/staff-onboarding/roster-review.md`, with a corresponding review-only JSON file. A fresh checkout needs the original roster or an approved private copy; these local files are not distributed by Git.

## Staff identifiers

- Use exactly `BBS-Staff-001`, `BBS-Staff-002`, and so on, preserving the requested casing.
- Use one sequence across teaching and non-teaching staff. No annual reset has been requested.
- The proposed initial ordering follows the image: teaching rows 1–14, then non-teaching rows 1–4. These are proposed IDs, not reservations or proof that they are available.
- Allocate uniquely on the server, check existing staff before the initial import, and do not overwrite or renumber an existing person to obtain a desired number.
- Use at least three digits without truncating numbers above 999. Retry/duplicate-import protection must not create a second person.

## Class naming

| Roster label                  | Existing application class | Authority                                         |
| ----------------------------- | -------------------------- | ------------------------------------------------- |
| Class 1–6 / One–Six           | Basic 1–6                  | Chief Engineer confirmed                          |
| Class 7 / Seven               | JHS 1                      | Chief Engineer confirmed                          |
| Class 8 / Eight               | JHS 2                      | Chief Engineer confirmed                          |
| KG 1 / KG 2                   | KG 1 / KG 2                | Matching names                                    |
| Lower Nursery / Upper Nursery | Nursery 1 / Nursery 2      | Proposed aliases; do not create duplicate classes |

The roster does not supply a teacher for JHS 3. Do not invent one or assign a specialist there by assumption.

## Teaching versus class leadership

- A teacher can teach more than one subject and more than one class.
- Preserve the class–subject pairing on each teaching assignment. Independent lists of classes and subjects must not imply that every listed subject is taught in every listed class.
- A head/class-teacher appointment is separate from subject teaching. Do not infer it from a class label, an “All subjects” entry, or the absence of other teachers.
- Preserve academic year/term and assignment history; ending an assignment must not erase prior records.
- Preserve “All subjects” as the stated scope rather than expanding it to guessed subjects.
- A teacher may have known subjects while their classes are still unconfirmed; keep that information without inventing class links.
- Non-teaching staff retain their stated role with no classroom assignment.

## Incomplete source details

The Chief Engineer explicitly requested onboarding with the known details first. Unknown contact information and employment dates must remain absent, never fake numbers, invented dates, or “N/A” values masquerading as real data. Make optional-phone handling consistent across the database, input contracts, forms, import/export, types, and display before importing this roster.

Keep the source name order in the preview and apply the Chief Engineer's spelling corrections. On 2 September 2026, the Chief Engineer confirmed the corrected names for proposed IDs 004 and 006; both private review flags are cleared. No head-class-teacher designations were supplied; two teachers have subjects but no stated classes. The interpretation of the sheet's class column and any additional subject/class pairs remain unconfirmed. Resolve the academic context and assignment effective dates explicitly without treating them as employment dates.

## Implemented compatibility and verified onboarding

Migration 20260902185750_staff_known_details_and_teaching_assignments was applied through Supabase MCP on the authorized test-only project, with matching local SQL and regenerated types. Forms, input schemas, directory/profile queries, workbook import/export and RPCs now accept unknown contacts, name components and employment dates. Source full names are preserved without guessing name parts.

The server allocates one case-preserved number sequence under a row lock. Create/import requests have payload-bound idempotency keys; staff, assignments, numbering, request result and audit succeed or roll back together. Existing assignment history remains intact. Explicit teaching pairs and independent head-class-teacher appointments are supported. Direct writes remain closed; all tables have RLS, including private deny-all request/counter tables.

MCP is connected and test project cefwopisbgfctzdloequ is verified. All 18 staff were saved using the existing Super Administrator's authenticated Add Staff forms, not an impersonated SQL identity. Private reconciliation passed for IDs 001-018, corrected source names, types, positions, known subjects and absent unknown details. Counts: 14 teaching, four non-teaching, 18 requests, 18 staff audit entries, zero assignments, next number 019. No staff Auth accounts were created.

The generated private workbook could not be read by ExcelJS (namespace-prefixed workbook XML); it failed before writes. Onboarding used forms instead. Do not re-import it. Tests using the app's own template pass; a live spreadsheet import roundtrip remains unverified. Unreadable formats now receive an explicit no-records-saved message.

Focused MCP tests passed for optional details, number casing, replay/changed payload, duplicate pairs, independent headship, history, invalid-batch rollback including audit, direct-write denial and disabled/anonymous access. All synthetic actors and staff rolled back. Two dispatched concurrency probes did not demonstrate simultaneous execution; overlapping allocation/retry verification is not complete.

## Remaining decisions and entry gate

- Confirm Lower/Upper Nursery as Nursery 1/2.
- Confirm 2026/2027 Term 1 and 8 September 2026 as assignment context/start, or supply the correct dates.
- Identify head/class teachers and additional teaching pairs when known; the two specialists without classes remain unassigned.

Unspecified leadership/specialist classes must not be guessed. Supplied class links still need effective context before saving. Reconcile the resulting assignments and finish focused concurrency verification before closing STAFF-01. P3-01 remains the only authorized finance section; Phases 4/5 remain untouched.

See [verification evidence](../evidence/phase-2/staff-known-details-verification.md) for commands, advisors, UI checks and limitations.
