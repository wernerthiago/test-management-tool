# Security Policy

## Supported Versions

Security fixes are made on the `main` branch. Run the latest version.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Report them privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. This creates a private advisory that only the maintainers can see.

Please include:

- **Description**: what the vulnerability is and where it is (file, endpoint or page).
- **Impact**: what an attacker could do with it.
- **Steps to Reproduce**: including any setup required.
- **Proof of Concept**: code, requests or screenshots, if you have them.
- **Environment**: QualityLoom version or commit, deployment method (Docker, Node), browser.

### Our Process

1. **Acknowledgment**: we acknowledge reports within 48 hours.
2. **Assessment**: we investigate the scope and impact.
3. **Updates**: we keep you informed through the advisory.
4. **Resolution**: we fix the vulnerability and release the fix on `main`.
5. **Disclosure**: once fixed, we publish the advisory and credit you if you wish.

We aim to resolve critical vulnerabilities within 30 days of the report.

## Known Limitations

These are known and documented; please do not report them as new vulnerabilities:

- **Reporter API tokens have no expiry and full write access to their project's runs.** A token can only report to the project it was created in, and it can be revoked at any time in Settings > Playwright Reporter. Treat tokens as secrets (CI secret store), use one per pipeline, and revoke tokens you no longer use.
- **Sessions are not revoked when a password changes.** A session cookie stays valid for one year or until `JWT_SECRET` is rotated (which signs everyone out).
- **No per-project permissions.** Every signed-in user can see and change every project; only the admin panel is restricted to admins.
- **The login rate limiter is per instance and in memory.** It allows 10 failed attempts per client IP per 15 minutes on each instance, so with N replicas the effective limit is up to N × 10, and it resets when an instance restarts.

## Securing a Deployment

- Set `INITIAL_ADMIN_PASSWORD` (at least 8 characters) before the first start of any non-local deployment. Without it the `admin` account is created with password `admin`, and whoever reaches the URL first can sign in with it. Either way the account must change its password at first login.
- Set `JWT_SECRET` to a long random value (`openssl rand -hex 32`) and keep it in a secret manager. The production app refuses the placeholder from `.env.example`.
- Serve QualityLoom over HTTPS behind a reverse proxy and set `TRUST_PROXY` to the number of proxy hops (usually `1`), so login rate limiting sees real client IPs.
- Add security headers (HSTS, `Content-Security-Policy`, `X-Frame-Options`) at the reverse proxy; the app sets none itself.
- Use a dedicated MySQL user with access to the QualityLoom database only, and back the database up.
- Keep dependencies updated: `pnpm audit` lists known vulnerabilities.

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for the full hosting guide.

## Responsible Disclosure

Please do not disclose a vulnerability publicly until we have had a chance to fix it.

Thank you for helping to keep QualityLoom secure!
