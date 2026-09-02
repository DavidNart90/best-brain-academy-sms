# Phase 1–2 route cleanup evidence

**Date:** 2 September 2026  
**Scope:** Replace the remaining Phase 0 shells on implemented Phase 1–2 routes.

## Implemented

- `/admissions` uses the existing RLS-backed student directory, 25-row pagination, URL filters, explicit empty/no-results states, and the validated admission import/export pipeline.
- `/admissions/[id]` routes authorized users to the corresponding student record.
- `/classes/[id]` shows the live class configuration; class catalogue rows link to it.
- `/settings/roles` shows the live role-permission mappings read through the authenticated Supabase client and existing RLS policies.
- Login has a native POST fallback, and Next development permits the local `127.0.0.1` browser origin so client hydration is not blocked.

No migration or data mutation was required.

## Verification

- Browser at `127.0.0.1:3000`: sign-in succeeded; `/admissions`, `/settings/roles`, `/classes`, and `/classes/1` returned live content with no Phase 0 shell text.
- Browser at 390 × 844: no document overflow; the 920 px permission matrix remained contained in its keyboard-focusable horizontal scroll region.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed and emitted all four explicit dynamic routes.
- React Doctor: scanned 16 changed files and reported no issues.
- Targeted Prettier formatting: passed for all changed implementation files.

P2-06 remains open for the broader Phase 2 authorization and mutation verification gate.
