# PWA, navigation, and live-search verification

**Task:** E6-11 / P6-01 application shell extension  
**Date:** 15 September 2026  
**Owner:** Codex, under Chief Engineer authorization

## Delivered behavior

- Added an installable web-app manifest, school-red application icon, standalone display metadata, and a root-scoped service worker.
- Added an in-app update notice. A newly installed waiting worker is activated only when the user chooses **Update now**; the page reloads after the controller changes. The app checks again when it becomes visible, reconnects, and every 30 minutes.
- Kept the service worker online-only. It has no `fetch` handler and creates no cache, so authenticated HTML, API responses, student data, and finance data are not retained for offline access.
- Added permission-aware breadcrumbs to the protected application shell. An ancestor is linked only when the active role can open that route.
- Replaced the decorative top-bar search with permission-aware application search. It searches permitted routes immediately and uses the authenticated, RLS-protected `/api/search` endpoint for bounded student, staff, class, finance, and administrator matches.
- Converted list/report filters to live URL-backed updates. Text fields use a short debounce; selections and dates update immediately, reset pagination, preserve unrelated URL state, and retain shareable/printable filter URLs.

## Security and scope

- The global-search endpoint is guarded by the existing verified session boundary and returns `private, no-store` responses.
- Record queries are bounded and run through the request-scoped Supabase client, preserving database RLS and the current role permissions.
- The worker script is served with `no-cache, no-store`, an explicit root scope, JavaScript content type, and a restrictive worker CSP. Its build marker changes with an explicit deployment/build ID or the Git commit fallback.
- This slice did not add Web Push, request notification permission, add a VAPID secret, change database schema, mutate school records, or expand any role permission.

## Verification

- `pnpm format:check` — passed.
- `pnpm lint` — passed with the zero-warning policy.
- `pnpm typecheck` — passed.
- `pnpm test:security-routes` — passed for 39 page routes and 18 API route files.
- `pnpm test:client-boundary` — passed across 47 client chunks with no forbidden server/key markers.
- Focused Vitest run — 19/19 permission, dashboard-role, outstanding-fee, and payment-query assertions passed.
- `pnpm build` — passed; Next generated `/manifest.webmanifest`, `/sw.js`, and `/api/search` successfully.
- Manifest/worker inspection — HTTP 200; standalone start URL `/dashboard`; correct theme color and two icon purposes; worker contains the build marker and update message handler and contains no fetch handler.
- Authenticated localhost browser — verified Dashboard and Financials breadcrumbs, page and administrator record search from the top bar, automatic Administrator and Invoice filtering without submission, desktop and 390 × 844 mobile composition, and zero browser warnings/errors.
- React Doctor — the shared live-filter implementation removed eight changed-page findings. The remaining 24 findings are the pre-existing admissions/complexity/accessibility/performance backlog and do not name the new PWA, breadcrumb, global-search, or live-filter component files.

## Remaining release work

P6-01 remains in progress. D-05 still requires the Chief Engineer's production hosting/domain/region, retention, recovery-objective, backup coverage/cost, monitoring ownership, and restore-rehearsal decisions. This local PWA proof is not production release approval.
