Playwright E2E tests

How to run locally

1. Start MySQL using docker-compose from project root (no other services are needed):

```bash
docker-compose up -d db
```

2. Install dependencies:

```bash
pnpm install
```

3. Install Playwright browsers:

```bash
npx playwright install --with-deps chromium
```

4. Run the tests:

```bash
pnpm test:e2e
```

Notes
- Global setup (`tests/e2e/global-setup.ts`) creates a fresh database for the run (connecting to MySQL as `root` with `DB_ROOT_PASSWORD`, default `root_password`), starts the app, which applies the migrations itself, and waits for `/health`. `global-teardown.ts` stops the app and drops the database.
- The test app listens on port 3000 + `PW_WORKER_INDEX` (default 0, so 3000). If that port is busy, for example because `pnpm dev` is running, setup fails with a clear error instead of testing the wrong server. Stop `pnpm dev`, or run `PW_WORKER_INDEX=10 pnpm test:e2e` to use port 3010.
- There is no auth bypass. Tests sign in with real session cookies via `utils.signInAs(page, userId)` from `tests/e2e/testUtils.ts`.
- Login and password change flows are covered in `tests/e2e/auth.spec.ts`; the admin panel in `tests/e2e/admin.spec.ts`.
- Add `data-testid` attributes to UI components as you write POM tests.
