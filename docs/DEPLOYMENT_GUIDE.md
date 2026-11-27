# QualityLoom - Deployment Guide

Operator guide for hosting QualityLoom: what runs, how to configure it, and how it behaves at startup, under scaling, during upgrades and on shutdown.

---

## Table of Contents

1. [Hosting QualityLoom internally — what DevOps needs](#hosting-qualityloom-internally--what-devops-needs)
2. [Image](#image)
3. [Configuration](#configuration)
4. [Startup and Migrations](#startup-and-migrations)
5. [Scaling](#scaling)
6. [Health Checks](#health-checks)
7. [Shutdown](#shutdown)
8. [Upgrades and Rollback](#upgrades-and-rollback)
9. [Database](#database)
10. [Reverse Proxy and TLS](#reverse-proxy-and-tls)
11. [Logging and Monitoring](#logging-and-monitoring)
12. [Authentication and Users](#authentication-and-users)
13. [Security Notes](#security-notes)
14. [Kubernetes Example](#kubernetes-example)
15. [Other Ways to Run It](#other-ways-to-run-it)
16. [Deployment Checklist](#deployment-checklist)
17. [Troubleshooting](#troubleshooting)

---

## Hosting QualityLoom internally — what DevOps needs

QualityLoom is two pieces:

1. **The app container**, built from the `Dockerfile` in the repository root (see [Image](#image); there is no published image). It is stateless: it stores nothing on disk and sessions are signed cookies, so any instance can be restarted or replaced, and several replicas can run side by side without sticky sessions (see [Scaling](#scaling)).
2. **A MySQL database.** MySQL 8.0 and 8.4 are supported and tested (CI runs the full E2E suite on both). Use a managed service (RDS, Cloud SQL, Azure Database for MySQL, etc.) or a MySQL server you back up. All data lives here.

Nothing else is required: no file storage (S3), no email service, no identity provider, no cache.

**Summary for the platform team:**

| Topic | Behaviour |
|---|---|
| Port | 3000 (keep it; the image `HEALTHCHECK` uses 3000) |
| Required env | `DATABASE_URL`, `JWT_SECRET`; `TRUST_PROXY` behind a proxy; `INITIAL_ADMIN_PASSWORD` recommended ([Configuration](#configuration)) |
| Startup | Migrates the database and creates the `admin` account itself, under a MySQL lock; the port opens only afterwards ([Startup and Migrations](#startup-and-migrations)) |
| Replicas | Supported; login rate limiter is per instance ([Scaling](#scaling)) |
| Probes | Liveness `GET /health`, readiness `GET /health/ready` ([Health Checks](#health-checks)) |
| Shutdown | Graceful on SIGTERM, up to 10 s ([Shutdown](#shutdown)) |
| Upgrades | Forward-only migrations, some destructive; rollback = restore the database backup ([Upgrades and Rollback](#upgrades-and-rollback)) |
| State / backups | MySQL only ([Database](#database)) |
| Proxy | Terminate TLS, forward `X-Forwarded-For`/`X-Forwarded-Proto`, allow 50 MB bodies, add security headers ([Reverse Proxy and TLS](#reverse-proxy-and-tls)) |
| Logs / metrics | Plain text on stdout/stderr; no access log, no metrics endpoint ([Logging and Monitoring](#logging-and-monitoring)) |

**Known limitations to plan around** (details in [Security Notes](#security-notes)):
- `POST /api/playwright/report` requires a per-project API token (`Authorization: Bearer qlt_...`), created by users in the project's Settings > Playwright Reporter; tokens are stored hashed and can be revoked there.
- Sessions are not revoked on logout or password change; only rotating `JWT_SECRET` revokes them (for everyone).
- No per-project permissions; every signed-in user can access every project.
- The login rate limiter is in memory per instance.

**Networking:** CI pipelines that send Playwright results must reach the URL. If QualityLoom is only reachable inside the company network, GitHub-hosted runners cannot reach it; use self-hosted runners inside the network, or expose that endpoint deliberately.

---

## Image

There is no published image; build it from the repository:

```bash
docker build -t qualityloom:$(git rev-parse --short HEAD) .
```

Tag by git SHA; the repository has no release tags yet.

The image is Node 22 Alpine. It contains the build output, production dependencies and the `drizzle/` migrations, sets `NODE_ENV=production` and `WORKDIR /app`, runs `node dist/index.js` as the non-root user `node`, exposes port 3000 and has a Docker `HEALTHCHECK` on `GET /health` at port 3000.

**Branding is build-time only.** `VITE_APP_TITLE` and `VITE_APP_LOGO` are compiled into the client bundle:

```bash
docker build --build-arg VITE_APP_TITLE="Acme QA" --build-arg VITE_APP_LOGO=/logo.png -t qualityloom:<git-sha> .
```

Setting them with `docker run -e` or in a Kubernetes manifest has no effect. `docker-compose.yml` passes them as build args from the environment; `pnpm dev`/`pnpm build` read them from `.env`.

---

## Configuration

Runtime environment variables:

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | yes | `mysql://user:password@host:3306/database`. URL-encode special characters in the password (`@` → `%40`). Options below. |
| `JWT_SECRET` | yes | Random string, at least 32 characters (`openssl rand -hex 32`). Keep it stable across deploys; rotating it signs everyone out. In production the app refuses to start with the `.env.example` placeholder (any value starting with `your-super-secret`). |
| `TRUST_PROXY` | behind a proxy | Number of reverse-proxy hops in front of the app. `1` behind a single ingress, load balancer or nginx; `2` for e.g. CDN + ingress. Default `0`. |
| `INITIAL_ADMIN_PASSWORD` | recommended | Password for the `admin` account created on first start; at least 8 characters (the app refuses to start if shorter). Default `admin`. |
| `PORT` | no | Default `3000`. The app exits if the port is busy. Keep 3000 in the container (the image `HEALTHCHECK` uses it). |
| `NODE_ENV` | no | The image sets `production`. |

No other runtime variables are used. `VITE_APP_TITLE`/`VITE_APP_LOGO` are build args (see [Image](#image)).

**`DATABASE_URL` options.** mysql2 options go in the query string; each value is parsed as JSON:

- TLS: `?ssl={"rejectUnauthorized":true}`. URL-encode the JSON in shells and YAML:
  `mysql://user:pass@host:3306/qualityloom?ssl=%7B%22rejectUnauthorized%22%3Atrue%7D`
- Pool size: `connectionLimit=20`. Default is 10 connections per instance.

Combine with `&`, e.g. `...?ssl=%7B%22rejectUnauthorized%22%3Atrue%7D&connectionLimit=20`.

**`TRUST_PROXY`** matters for two things: the login rate limiter keys on the real client IP (otherwise every user shares the proxy's IP), and the session cookie is marked `Secure` when the proxy reports HTTPS via `X-Forwarded-Proto`.

**`INITIAL_ADMIN_PASSWORD`** should be set for any non-local deployment: without it, whoever reaches the URL first can sign in as `admin` / `admin`. The account must change its password at first login either way. It only takes effect when no admin exists.

---

## Startup and Migrations

On start each instance:

1. Validates the environment (exits on missing/invalid values).
2. Connects to MySQL.
3. Takes the MySQL named lock `qualityloom_startup` (`GET_LOCK`, waits up to 300 s).
4. Applies pending migrations from `./drizzle` (relative to the working directory; `/app` in the image).
5. Creates the `admin` account if no admin exists.
6. Releases the lock.
7. Starts the HTTP server.

The port opens only after this completes, so probes fail until then (see [Health Checks](#health-checks)). Nobody runs migrations by hand.

Verified: two instances started at the same moment on an empty database both became ready; one migrated and seeded, the other waited and then found nothing to do; exactly one admin was created.

If another instance holds the lock for more than 300 s, startup fails with `Timed out after 300s waiting for another instance to finish migrating`.

---

## Scaling

Multiple replicas are supported:

- Sessions are stateless signed cookies; no sticky sessions needed.
- Startup migrations and admin seeding are serialized by the MySQL lock.
- **Rate limiter caveat:** the login rate limiter (10 failed attempts per client IP per 15 minutes) is in memory per instance. With N replicas the effective limit is up to N × 10, and it resets on restart.
- **Connections:** each instance opens up to `connectionLimit` connections (default 10). Plan MySQL `max_connections` ≥ replicas × `connectionLimit` + a few (for the startup lock connection and admin access). During a rolling update old and new pods overlap; count them too.

Resource usage has not been measured. Start with requests of about 256Mi memory / 100m CPU and tune from observed usage.

---

## Health Checks

| Endpoint | Purpose | Behaviour |
|---|---|---|
| `GET /health` | Liveness | Process is up. Does not touch the database. Returns 200 with `{status, timestamp, environment: {nodeEnv, hasDatabase, hasJwtSecret}}`. |
| `GET /health/ready` | Readiness | Runs `SELECT 1` with a 2 s timeout. 200 `{"status":"ready","database":true}` or 503 `{"status":"unavailable","database":false}`. |

Verified: with the database paused, `/health/ready` answered 503 in 2.0 s while `/health` stayed 200.

Use a startup probe generous enough for migrations plus the lock wait (up to 300 s), since the port does not open until startup completes. Do not use `/health/ready` for liveness: a database outage would restart every pod without fixing anything.

---

## Shutdown

On SIGTERM or SIGINT the server stops accepting connections, lets in-flight requests finish for up to 10 s, closes the database pool and exits 0. Verified: `docker stop` takes about 1 s.

In Kubernetes set `terminationGracePeriodSeconds` ≥ 15.

---

## Upgrades and Rollback

Migrations are forward-only and some are destructive (they drop tables or columns). There are no down migrations.

**Upgrade:**
1. Back up the database (see [Backups](#backups)).
2. Build and deploy the new image. It migrates on start.

**Rollback:** restore the pre-upgrade backup, then run the previous image. Running the previous image against the migrated schema is not supported.

**Rollout strategy:**
- Releases that add migrations (new files in `drizzle/`): prefer a recreate-style rollout (stop old instances, then start new ones), because old instances may break on the new schema.
- Releases without new migrations: a normal rolling update is fine.

Check with `git diff --name-only <deployed-sha> <new-sha> -- drizzle/`.

---

## Database

### Versions

MySQL 8.0 and 8.4 are supported and tested.

### Setup

Create an empty database and a dedicated user; the app creates all tables itself.

```sql
CREATE DATABASE qualityloom CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'qualityloom'@'%' IDENTIFIED BY '<strong password>';
GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, DROP, INDEX, REFERENCES
  ON qualityloom.* TO 'qualityloom'@'%';
```

Restrict the host part (`'%'`) to the app's network where possible.

### Permissions

The same `DATABASE_URL` user runs the app and the migrations, so it needs:

- Runtime: `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- Migrations: `CREATE`, `ALTER`, `DROP`, `INDEX`, `REFERENCES`

on the QualityLoom database only. `GET_LOCK` needs no extra privilege. Separate migration credentials are not supported today.

### Backups

The database is the only state; backing it up is the whole backup. With a managed service, enable automated backups and point-in-time recovery. For a self-managed server, use `mysqldump` with credentials from an option file, not on the command line:

```ini
# /etc/qualityloom/backup.cnf  (chmod 600, readable only by the user running the backup)
[client]
host=db-host
user=<backup user>
password=<password>
```

```bash
#!/bin/bash
set -euo pipefail
BACKUP_DIR=/var/backups/qualityloom
mkdir -p "$BACKUP_DIR"
mysqldump --defaults-extra-file=/etc/qualityloom/backup.cnf \
  --single-transaction --routines --triggers \
  qualityloom | gzip > "$BACKUP_DIR/qualityloom_$(date +%Y%m%d_%H%M%S).sql.gz"
find "$BACKUP_DIR" -name 'qualityloom_*.sql.gz' -mtime +30 -delete
```

`--defaults-extra-file` must be the first option. Restore:

```bash
gunzip < qualityloom_20261101_020000.sql.gz | mysql --defaults-extra-file=/etc/qualityloom/backup.cnf qualityloom
```

Test restores regularly, and always take a backup before an upgrade.

---

## Reverse Proxy and TLS

- Terminate HTTPS at the proxy or ingress.
- Forward `X-Forwarded-For` and `X-Forwarded-Proto`, and set `TRUST_PROXY` to the number of hops (see [Configuration](#configuration)).
- Allow request bodies up to 50 MB: Playwright report uploads can be large, and nginx's default of 1 MB causes `413` errors.
- Add security headers at the proxy. The app sets none (no HSTS, CSP or `X-Frame-Options`).

nginx example (TLS certificate configuration omitted):

```nginx
server {
    listen 443 ssl;
    server_name qualityloom.internal.example.com;

    client_max_body_size 50m;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

With this single nginx in front, use `TRUST_PROXY=1`. For ingress-nginx, the equivalent body limit is the annotation `nginx.ingress.kubernetes.io/proxy-body-size: "50m"`.

---

## Logging and Monitoring

- Logs are plain text on stdout/stderr: startup, migrations, admin seeding, shutdown.
- Unexpected server errors from API calls are logged as `[tRPC] <procedure> failed: ...`.
- There is no access log and no metrics endpoint. Use the proxy or ingress for request logs and metrics.
- Alert on `/health/ready` failures and on container restarts.

```bash
docker logs -f qualityloom
docker inspect --format '{{.State.Health.Status}}' qualityloom
```

---

## Authentication and Users

QualityLoom has local accounts only (email or username + password at `/login`). There is no SSO, OAuth or external identity provider, and no email is sent.

- **First login:** on an empty database the app creates `admin` with `INITIAL_ADMIN_PASSWORD` (or `admin` if unset). The account must change its password at first login.
- **Admin panel `/admin`:** admins add users with temporary passwords (changed at first login), change roles, reset passwords and delete users. Admins cannot delete or demote themselves, and the last admin cannot be removed.
- **Roles:** `admin` (everything, including `/admin`) and `user` (everything except `/admin`). Every signed-in user can see and open every project.
- **Sessions:** cookie `app_session_id`, an HS256 JWT signed with `JWT_SECRET`, valid one year; httpOnly, `SameSite=Lax`, `Secure` over HTTPS. Not revoked on logout or password change; only rotating `JWT_SECRET` revokes sessions (for everyone). Deleting a user or changing a role takes effect immediately, because the user is re-read on every request.
- **Offboarding:** there is no SSO, so delete the user in `/admin`.
- New passwords need at least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character.

---

## Security Notes

- Set `INITIAL_ADMIN_PASSWORD` before the first start of any non-local deployment; otherwise whoever reaches the URL first can sign in as `admin` / `admin`.
- Keep `JWT_SECRET` in a secret manager; it signs all sessions.
- `POST /api/playwright/report` accepts only valid project API tokens (401 otherwise; 403 for another project's data). Tokens do not expire: store them in the CI secret store and revoke unused ones in Settings. The endpoint has no rate limit of its own; apply one at the proxy if needed.
- Sessions are not revoked on password change.
- No per-project permissions.
- The login rate limiter is per instance (see [Scaling](#scaling)).
- CSRF protection relies on the `SameSite=Lax` session cookie.
- Security headers must be added at the proxy (see [Reverse Proxy and TLS](#reverse-proxy-and-tls)).
- Use TLS to MySQL where the network is not trusted (`ssl` option in `DATABASE_URL`), and a database user limited to the QualityLoom database.
- Keep dependencies updated: `pnpm audit`.

See also [SECURITY.md](../SECURITY.md).

---

## Kubernetes Example

No Kubernetes manifests or Helm chart are provided in the repository. The following is an **example** to adapt, not a tested deployment. It assumes a Secret `qualityloom` with keys `DATABASE_URL`, `JWT_SECRET` and `INITIAL_ADMIN_PASSWORD`, and an image pushed to your registry.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qualityloom
spec:
  replicas: 2
  # Recreate is the safe choice for releases that add migrations.
  # RollingUpdate is fine for releases without new files in drizzle/.
  strategy:
    type: Recreate
  selector:
    matchLabels: { app: qualityloom }
  template:
    metadata:
      labels: { app: qualityloom }
    spec:
      terminationGracePeriodSeconds: 15
      containers:
        - name: app
          image: registry.example.com/qualityloom:<git-sha>
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef: { name: qualityloom }
          env:
            - name: TRUST_PROXY
              value: "1"
          # Startup: migrations + up to 300 s waiting for the startup lock
          startupProbe:
            httpGet: { path: /health, port: 3000 }
            periodSeconds: 10
            failureThreshold: 30
          livenessProbe:
            httpGet: { path: /health, port: 3000 }
            periodSeconds: 10
          readinessProbe:
            httpGet: { path: /health/ready, port: 3000 }
            periodSeconds: 10
          # Starting point only; not measured. Tune from observed usage.
          resources:
            requests: { memory: 256Mi, cpu: 100m }
---
apiVersion: v1
kind: Service
metadata:
  name: qualityloom
spec:
  selector: { app: qualityloom }
  ports:
    - port: 80
      targetPort: 3000
```

Expose the Service through your ingress with TLS, a 50 MB body limit and security headers (see [Reverse Proxy and TLS](#reverse-proxy-and-tls)). Set `TRUST_PROXY` to match the number of hops in front of the pods.

---

## Other Ways to Run It

### Single container

```bash
docker run -d --name qualityloom -p 3000:3000 \
  -e DATABASE_URL='mysql://qualityloom:<password>@db-host:3306/qualityloom' \
  -e JWT_SECRET='<value from your secret manager>' \
  -e INITIAL_ADMIN_PASSWORD='<at least 8 characters>' \
  -e TRUST_PROXY=1 \
  qualityloom:<git-sha>
```

Generate `JWT_SECRET` once (`openssl rand -hex 32`) and store it; do not generate a new one per deploy. To use another host port, change only the left side of `-p`.

### Docker Compose (local development and evaluation only)

`docker-compose.yml` runs `db` (MySQL 8.0, data in the `db_data` volume, published on 127.0.0.1 only) and `app` (built from the `Dockerfile`). Database passwords default to `test_user` / `test_password` / `root_password`. `JWT_SECRET` is required; compose refuses to start without it. It is not a production deployment.

### Without Docker (Node 22 + PM2)

Requires Node.js 22 and pnpm (via `corepack enable`).

```bash
pnpm install --frozen-lockfile
pnpm build                      # VITE_APP_TITLE / VITE_APP_LOGO are read from .env here
NODE_ENV=production pm2 start dist/index.js --name qualityloom
pm2 save && pm2 startup
```

Run it from the repository root so `./drizzle` resolves, and set the runtime variables from [Configuration](#configuration) in the environment or `.env`. Upgrade: back up the database, `git pull`, `pnpm install --frozen-lockfile`, `pnpm build`, `pm2 restart qualityloom`.

### Platform-as-a-Service

Any platform that builds a `Dockerfile` and provides MySQL works; the same configuration, health check and upgrade rules apply.

---

## Deployment Checklist

**Before the first start**
- [ ] Image built and tagged by git SHA (branding build args set if needed)
- [ ] Empty MySQL 8.0/8.4 database and a user with the grants from [Permissions](#permissions)
- [ ] `max_connections` sized for replicas × `connectionLimit`
- [ ] Secret with `DATABASE_URL`, `JWT_SECRET`, `INITIAL_ADMIN_PASSWORD`
- [ ] `TRUST_PROXY` set to the number of proxy hops
- [ ] Proxy/ingress: TLS, forwarded headers, 50 MB body limit, security headers
- [ ] Network access to `POST /api/playwright/report` restricted to CI networks/VPN
- [ ] Automated database backups configured and a restore tested

**After deployment**
- [ ] `/health` and `/health/ready` return 200 through the proxy
- [ ] Signed in as `admin` and set a new password
- [ ] Users created in `/admin`
- [ ] CI runners can reach `POST /api/playwright/report`
- [ ] Alerts on readiness failures and restarts

---

## Troubleshooting

Startup errors visible in the logs:

| Message | Cause / fix |
|---|---|
| `Missing required environment variables` | Set `DATABASE_URL` and `JWT_SECRET`. |
| `JWT_SECRET must be at least 32 characters long` | Use a longer secret (`openssl rand -hex 32`). |
| `JWT_SECRET is still the example placeholder` | Generate a real secret; the `.env.example` value is public. |
| `INITIAL_ADMIN_PASSWORD must be at least 8 characters long` | Use a longer value, or leave it unset. |
| `Timed out after 300s waiting for another instance to finish migrating` | Another instance held the `qualityloom_startup` lock for 300 s. Check whether that instance is stuck in a migration (its logs, `SHOW PROCESSLIST`); restart once it has finished or died. |
| `Could not listen on port 3000` | Another process uses the port; the app does not fall back to another one. |
| A migration error | Check the database user has the grants from [Permissions](#permissions). |

**Database connection failed:** test with `mysql --defaults-extra-file=<option file> -h <host> <database>` from the app's network. Check that special characters in the password are URL-encoded in `DATABASE_URL` (`@` → `%40`), and that the TLS option is URL-encoded JSON.

**Readiness returns 503:** `/health/ready` could not run `SELECT 1` within 2 s. The database is unreachable, overloaded or out of connections (check `max_connections` against replicas × `connectionLimit`). The process itself is fine; `/health` stays 200.

**413 on Playwright report upload:** the proxy's body limit is too small. Set `client_max_body_size 50m;` (nginx) or the ingress equivalent.

**Login blocked for everyone (rate limit):** behind a proxy without `TRUST_PROXY`, all users share the proxy's IP. Set `TRUST_PROXY` to the number of hops. If the admin password is lost, another admin can reset it in `/admin`.

**Branding does not change:** `VITE_APP_TITLE`/`VITE_APP_LOGO` are build args; rebuild the image with `--build-arg`.

**Playwright results not arriving:** check that the CI runner can reach the app URL (internal-only hosting is not reachable from GitHub-hosted runners) and check the reporter's log line: `401` means `QUALITYLOOM_TOKEN` is missing, wrong or revoked (create a new one in Settings > Playwright Reporter); `403` means the token belongs to another project or the project was deleted.

---

**Last updated:** November 2026
