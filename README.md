# Best Brain Academy School Management

Phase 0 foundation: protected staff sign-in, permission-aware navigation, school-red
design tokens and clearly labeled synthetic dashboard previews. **No business CRUD
or financial transactions are implemented. Phase 0 passed its integrated gate on
1 September 2026; Phase 1 has not started.** See
[Plan.md](Plan.md) for task status and [backend setup](docs/backend-setup.md) for the
applied migrations, approved test-only target and remaining verification requirements.

## Local setup

1. Install/activate Node **24.20.0** (`.node-version` / `.nvmrc`) and pnpm **10.33.0**.
   Confirm `node --version` and `pnpm exec node --version` both show the intended
   runtime. Do not assume a downloaded runtime has become the active executable.
2. Run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to ignored `.env.local`; fill only the approved test
   project URL and publishable key. Never use a secret or service-role key in a
   `NEXT_PUBLIC_` variable. Placeholder configuration disables sign-in.
4. Apply/verify the backend using the MCP workflow in
   [docs/backend-setup.md](docs/backend-setup.md). No account is automatically promoted.
5. Run `pnpm dev`, then open [staff sign-in](http://localhost:3000/login).

No real credentials are bundled. If Supabase is not configured, the login page
explains the setup requirement and protected pages remain inaccessible. Node
preflight checks prevent running development/production commands on the wrong patch.

## Commands

| Command              | Purpose                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`           | Development server                                                     |
| `pnpm lint`          | ESLint, zero warning budget                                            |
| `pnpm format:check`  | Prettier check; authoritative planning docs are not reformatted        |
| `pnpm typecheck`     | Generate Next route types and run strict TypeScript                    |
| `pnpm test`          | Unit/component checks once                                             |
| `pnpm test:coverage` | 90% line / 85% branch minimum for specified handwritten logic          |
| `pnpm test:db`       | Real isolated Auth/RLS integration checks; fails without configuration |
| `pnpm build`         | Production build                                                       |
| `pnpm start`         | Serve the production build                                             |
| `pnpm test:e2e`      | Chromium desktop/tablet/mobile tests using a loopback Auth double      |
| `pnpm test:e2e:auth` | Actual Supabase allowed/pending/disabled browser journeys              |

## Repeatable local browser tests

Install the browser with `pnpm exec playwright install chromium`. Next.js embeds
public configuration at build time, so build against the loopback fixture first.
PowerShell:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54329'
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic_test_only'
pnpm build
pnpm test:e2e
Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL
Remove-Item Env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Playwright starts the fixture and the production app, then stops both. Ports 3000
and 54329 must be free. The fixture accepts only synthetic `@example.invalid`
accounts; its password is test data, not a real credential. The app contains no test
auth switch. **Never deploy a build configured with the fixture URL.** Rebuild with
the intended public environment before ordinary use. For actual Supabase tests,
use isolated variables in `.env.test.local` with `TEST_TARGET_ACK=isolated-test-only`.

CI runs lint, format, types, unit/coverage, build and production-mode mock E2E. Real
integration and live browser tests run only on an explicit workflow dispatch from
the default branch, using the `isolated-supabase-test` environment. Test passwords
are exposed only to their test steps, never dependency installation or PR jobs.
Missing configuration fails that dispatched job. A green PR job alone does not
satisfy the Phase 0 database gate. The workflow is authored but has not been run on
GitHub in this session. No real credentials or live-provider traces are uploaded.

## Structure and scope

- `src/app`: thin routes, layouts, safe page states and a read-only access endpoint.
- `src/features/auth`: validated email/password forms and server actions.
- `src/features/dashboard`: synthetic chart, metrics and filterable display records.
- `src/components`: owned shadcn primitives, shell and reusable data presentation.
- `src/lib`: request-scoped Supabase clients, verified identity and permission contracts.
- `supabase`: four applied/tracked migrations, verified SQL access contracts, no-business-data seed and separate unrun pgTAP checks.
- `tests`: isolated synthetic fixtures and separate real-provider integration checks.

Follow [AGENTS.md](AGENTS.md), [Project.md](Project.md), and the
[design guide](Project%20Files/design.md). Do not begin Phase 1 until P0-09 is verified.
