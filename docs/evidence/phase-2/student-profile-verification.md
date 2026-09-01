# P2-03 Student Profile Verification

Verified 1 September 2026 on the designated test-only Supabase project.

## Delivered

- Student detail route with personal, disability, denomination, guardian, current-context, and enrollment-history information.
- Transactional guardian linking and enrollment changes; historical enrollment rows are appended, not overwritten.
- Private `student-photos` bucket with permission-scoped RLS, 5 MB JPG/PNG/WebP limits, server-side signature validation, and authenticated delivery.
- Compact responsive profile design with loading/not-found/validation/pending states and finance sections clearly locked until Phase 3.

## Evidence

- MCP migrations: `20260901143834_student_profiles_enrollment_and_photos`, `20260901144333_require_uploaded_student_photo`; nine local migration filenames match remote history.
- MCP transaction: guardian link and enrollment change passed, exactly one active enrollment remained, prior history was preserved, missing Storage objects were rejected, and the transaction rolled back.
- `pnpm test:db`: 8/8 hosted Auth/Data API/RLS tests passed, including anonymous, unassigned and disabled photo/RPC denial.
- `pnpm exec vitest run src/features/students`: 15/15 validation, workbook, and image-signature tests passed.
- Targeted real-Supabase Playwright profile journey: 1/1 passed; guardian validation, locked finance state, axe, no overflow, and desktop/tablet/mobile screenshots verified.
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, and `pnpm build`: passed. React Doctor: 100/100.

## State and limits

- Verification writes rolled back. One unmarked application enrollment change was preserved; no photo object or financial record was created.
- Three browser-test sessions were revoked by exact ID after verification; the pre-existing session was preserved.
- Security advisors report the five intentional authenticated transactional RPC warnings plus Free-plan leaked-password protection. All RPCs use fixed search paths, current-session permission checks, closed direct writes, and negative tests.
- Unused-index notices are expected on the current one-student dataset and remain for representative Phase 5 measurement.
