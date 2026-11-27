# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (Node 22+, pinned via `packageManager`). MySQL 8 is the only external dependency.

```bash
pnpm install
docker-compose up -d db          # local MySQL (docker-compose up -d also builds/runs the app image)
pnpm dev                          # tsx watch server/_core/index.ts — Express + Vite middleware on :3000 (exits if the port is busy)
pnpm check                        # tsc --noEmit (the only static check; there is no linter)
pnpm format                       # prettier --write .
pnpm build                        # vite build -> dist/public, esbuild server -> dist/index.js
pnpm start                        # run production build
pnpm db:push                      # after editing drizzle/schema.ts: drizzle-kit generate && migrate (needs DATABASE_URL)
```

Tests:

```bash
pnpm test                                        # vitest — only picks up server/**/*.test.ts|*.spec.ts (none exist yet)
npx playwright install --with-deps chromium      # once
pnpm test:e2e                                    # Playwright E2E (headless chromium)
pnpm test:e2e tests/e2e/testcases.spec.ts        # single spec file
pnpm test:e2e -g "test title substring"          # single test by name
pnpm test:e2e:headed
```

E2E needs MySQL reachable as **root** (`DB_ROOT_PASSWORD`, default `root_password`; `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD` also read). `tests/e2e/global-setup.ts` creates a fresh uniquely-named database, spawns the app itself (`tsx server/_core/index.ts`, `NODE_ENV=development`; the app migrates the DB on start) on port `3000 + PW_WORKER_INDEX` and waits on `/health`. It refuses to start if that port is busy, so stop `pnpm dev` first or run `PW_WORKER_INDEX=10 pnpm test:e2e`. There is no auth bypass: tests create users with `utils.createTestUser(...)` and sign in with `utils.signInAs(page, userId)` (session cookie). Root `playwright.config.ts` just re-exports `tests/playwright.config.ts`.

## Architecture

Single-process full-stack TypeScript app: one Express server (`server/_core/index.ts`) serves the API and the React SPA (Vite middleware in dev, static `dist/public` in prod).

- **`client/`** — React 19 + Wouter routing (`client/src/App.tsx`) + Tailwind 4 + shadcn/ui (`client/src/components/ui/` is generated shadcn code). Pages live in `client/src/pages/`. Data access is via tRPC React Query hooks (`client/src/lib/trpc.ts`), which imports the `AppRouter` **type** directly from `server/routers.ts` — so server procedure changes are type-checked against the client by `pnpm check`. The currently selected project is kept client-side in `localStorage["selectedProjectId"]` and passed as `projectId` input to procedures.
- **`server/routers.ts`** — the tRPC `appRouter` (namespaces: `auth`, `admin`, `apiTokens`, `projects`, `folders`, `customFields`, `testCases`, `testRuns`, `analytics`). Procedures use `publicProcedure` / `authedProcedure` / `protectedProcedure` / `adminProcedure` from `server/_core/trpc.ts` (superjson transformer). Inputs are validated with zod.
- **`server/db.ts`** — all Drizzle queries as plain exported functions; routers call `db.*`, not Drizzle directly. Per-project sequential identifiers (`testCaseNumber` → `TC-#`, `runNumber` → `TR-#`) are computed here on insert.
- **Plain Express routers** (not tRPC) mounted in `server/_core/index.ts`:
  - `/api/playwright/report` (`server/playwrightReporter.ts`) — ingests Playwright results. Requires `Authorization: Bearer <token>`: per-project API tokens (`apiTokens` table, SHA-256 hash only, `server/utils/apiToken.ts`) managed through the `apiTokens` tRPC router and Settings > Playwright Reporter. The token determines the project. Matches tests to existing cases by a `TC-<n>` in the title, else exact title, else auto-creates the case (Type custom field = automated).
  - `/api/auth/login` (`server/authRouter.ts`) — password login (rate limited), sets the session cookie. Also holds `ensureDefaultAdmin()`.
  - `/health`.
- **`drizzle/schema.ts`** — the MySQL schema (source of truth); migrations generated into `drizzle/` with `drizzle/meta/_journal.json`. IDs are `nanoid` strings, not auto-increment.
- **`shared/`** — constants/types/errors imported by both sides via the `@shared/*` alias (`@/*` → `client/src/*`).
- **`server/_core/`** — server plumbing: `index.ts` (startup: env validation → MySQL `GET_LOCK('qualityloom_startup')` → `migrate()` from `./drizzle` → `ensureDefaultAdmin()` → release lock → Express; SIGTERM/SIGINT graceful shutdown; `/health` liveness, `/health/ready` DB readiness), `auth.ts` (session JWT sign/verify, `toPublicUser`), `trpc.ts`, `context.ts`, `cookies.ts`, `vite.ts` (Vite is imported lazily, dev only — the production bundle must not import dev dependencies).

### Auth

Local accounts only (no OAuth, no dev bypass). Session = `app_session_id` cookie holding an HS256 JWT `{ userId }` signed with `JWT_SECRET`; `server/_core/context.ts` resolves it to a `users` row. Users log in with `users.email` as the identifier — the seeded account's identifier is literally `admin`.

- On startup, if no admin exists, `ensureDefaultAdmin()` creates `admin` with `INITIAL_ADMIN_PASSWORD` (or `admin`) and `mustChangePassword = true`. The admin panel refuses to delete/demote the last admin, so this only runs on an empty install.
- `authedProcedure` = logged in (used only by `auth.changePassword`); `protectedProcedure` additionally rejects users with `mustChangePassword` (message `PASSWORD_CHANGE_REQUIRED_MSG`, which the client turns into a redirect to `/change-password`); `adminProcedure` additionally requires `role === "admin"`. Use `protectedProcedure` for every app feature.
- Roles: `admin` (everything + `/admin` panel) and `user` (everything else). Every user sees every project; the `projectMembers` table is no longer used.
- Admins create users with a temporary password (`mustChangePassword = true`); never return `passwordHash` to the client — use `toPublicUser`.

## E2E test conventions (from `.github/instructions/test.instructions.md`)

Applies to `tests/e2e/**`:
- One spec file per feature; don't split a feature across multiple spec files.
- Page Object Model: all locators and page helper methods belong in the page object under `tests/e2e/pages/`. Use the `test`/`expect` exported from `tests/e2e/fixtures.ts`.
- Tests must be independent and atomic, one behavior per test, DRY.
- Tests that need data must create it and delete it in teardown (helpers in `tests/e2e/testUtils.ts`, which talk to the DB directly via `DATABASE_URL`).
- Adding `data-testid` attributes to application components for better locators is encouraged.
- Keep `tests/e2e/TEST_COVERAGE.md` updated for every new/changed test; update `tests/README.md` if the test execution process changes. Don't create new documentation files without asking.

`.github/chatmodes/` holds Playwright planner/generator/healer agent prompts.

## Gotchas

- `pnpm db:push` runs `drizzle-kit generate` first, so schema edits produce new migration SQL files in `drizzle/` — commit them alongside `schema.ts`. The journal contains two `0006_*` migrations (no `0005`); check ordering in `_journal.json` before adding more.
- Migrations run automatically at app startup under a MySQL named lock, so several replicas can start at once (`drizzle-orm` migrator, folder `./drizzle` relative to the working directory). They are forward-only; don't write a migration that breaks the previous release's queries without noting it. `drizzle-kit` is a dev dependency and is not in the production image.
- `VITE_*` variables (branding) are compiled into the client at build time; the Dockerfile takes them as `--build-arg`.
- The `Dockerfile` builds the production image (`node dist/index.js`, `NODE_ENV=production`, non-root). `server/` and `client/` sources are not in it, only `dist/`, prod deps and `drizzle/`.
- CI (`.github/workflows/playwright-e2e.yml`) runs only the E2E suite on PRs/pushes to `main`, with a MySQL service container, on both MySQL 8.0 and 8.4 (matrix).
