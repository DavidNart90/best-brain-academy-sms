# Phase 0 implementation decisions — 31 August 2026

These are implementation choices within authorized scope, not release approvals.

- Next.js 16.3.3 / React 19.2.8 / Tailwind and PostCSS 4.3.3 are exact pins resolved
  from the registry. Node 24.20.0 is the current LTS patch. pnpm 10.33.0 is the
  installed, compatible package manager. TypeScript 5.9.3 is pinned for established
  Next/Vitest tooling compatibility; only Tailwind required the latest stable release.
- ESLint 10.9.1 was tried and failed with Next's React plugin (`getFilename` API
  removal). ESLint 9.39.5 is the compatible fallback; its upstream deprecation is a
  recorded tooling risk, not suppressed. Revisit when Next's plugin peers support 10.
- Registry packages carry MIT/ISC/Apache-2.0 licenses except Inter (OFL-1.1) and the
  axe test adapter (MPL-2.0). Lockfile integrity, exact pins, one-day minimum release
  age, provenance no-downgrade policy and restricted install scripts are configured.
  `unrs-resolver` postinstall remains blocked: native optional packages resolved
  successfully and lint/build pass without it. No blanket build-script approval.
- shadcn 4.19.1 generated the owned button/input/label/badge/table/sheet/skeleton
  primitives. They use school tokens and adjusted control sizes/focus behavior.
- The available asset is the dashboard inspiration, not the actual school crest.
  A book icon with the full school wordmark is provisional, never represented as
  the supplied crest. Replace it when the approved crest asset is provided.
- Broad `.manage` permissions gate administrator/settings shells only. There are
  no management mutations in Phase 0. Conservative role definitions are documented
  in backend-setup.md; D-03 remains open for future operational grants.
- Protected route shells are resolved by an explicit catalog in a catch-all page.
  Each page performs server authorization; unknown paths return not-found. Future
  feature implementations can replace specific routes without duplicating the shell.
- Synthetic fixtures live outside backend data. A loopback-only Auth test double
  provides browser boundary tests with no application bypass flags or public demo
  route. No local mock is evidence of real Supabase RLS/session behavior.
- Recharts is dynamically imported inside a small client chart boundary. The rest
  of the dashboard is server rendered; table controls and navigation have separate
  client boundaries. Synthetic numbers never claim a real performance baseline.

References consulted: [Node LTS](https://nodejs.org/en/about/previous-releases),
[Next installation](https://nextjs.org/docs/app/getting-started/installation),
[Tailwind Next setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs),
[shadcn Next setup](https://ui.shadcn.com/docs/installation/next),
[Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Supabase advanced SSR](https://supabase.com/docs/guides/auth/server-side/advanced-guide),
[Supabase changelog](https://supabase.com/changelog).
