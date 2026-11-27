# Local Development Setup

This guide will help you set up QualityLoom for local development.

## Prerequisites

- Node.js 22+ and pnpm
- Docker (for the MySQL database), or your own MySQL 8 server
- Git

## Quick Start

```bash
pnpm install
docker-compose up -d db      # MySQL only
cp .env.example .env         # defaults already match the compose database
pnpm dev
```

Open http://localhost:3000 and log in with username `admin`, password `admin`. You will be asked to choose a new password before you can use the app.

No migration command is needed: the app applies all database migrations from `drizzle/` when it starts.

## Environment Variables

`.env.example` contains everything you need:

```bash
# Database (MySQL 8). Matches the `db` service in docker-compose.yml
DATABASE_URL=mysql://test_user:test_password@127.0.0.1:3306/test_management_tool

# Signs login sessions. At least 32 characters; the app refuses to start otherwise
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Number of reverse proxies in front of the app. 0 when accessed directly
TRUST_PROXY=0

# Optional: name and logo shown inside the app
VITE_APP_TITLE=QualityLoom
VITE_APP_LOGO=
```

`PORT` is optional (default 3000). `pnpm dev` sets `NODE_ENV=development` for you.

## Database Setup

The `db` service in `docker-compose.yml` runs MySQL 8.0 with user `test_user` / `test_password` and database `test_management_tool` (data is kept in the `db_data` volume).

To use your own MySQL server instead, create a database and point `DATABASE_URL` at it:

```sql
CREATE DATABASE test_management_tool;
```

Tables are created by the migrations the app runs at startup.

If you change `drizzle/schema.ts`, generate and apply a new migration with:

```bash
pnpm db:push
```

This runs `drizzle-kit generate` and then `drizzle-kit migrate`.

## First Login

When the database has no admin user, the app creates one:

- **Username**: `admin`
- **Password**: `admin`

At first login you are sent to `/change-password` and cannot use anything else until you choose a new password. New passwords need at least 8 characters, an uppercase letter, a lowercase letter, a number and a special character.

Local development logs in exactly like production; there is no automatic login.

## Creating Additional Users

1. Log in as an admin
2. Open the admin panel: the **Admin panel** button on the landing page, or the user menu in the sidebar
3. Add the user with name, email, role (Admin or User) and a temporary password (at least 8 characters)
4. Share the temporary password with the user; they must change it at first login

From the admin panel you can also change a user's role, reset a password to a new temporary one, or delete a user. Admins cannot delete or demote themselves, and the last admin cannot be removed.

## Development Mode Features

When running with `pnpm dev` (`NODE_ENV=development`):

- Vite dev server with hot module reloading
- More detailed error messages

## Production Deployment

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for production deployment instructions.

## Troubleshooting

### "JWT_SECRET must be at least 32 characters long"

Make sure your `JWT_SECRET` in the `.env` file is at least 32 characters. You can generate a secure secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### "Missing required environment variables"

Check that all required variables are set in your `.env` file:
- `DATABASE_URL`
- `JWT_SECRET`

### Port 3000 is already in use

The app does not pick another port; it fails to start. Stop the other process (for example another `pnpm dev`) or set a different `PORT` in `.env`.

### Forgot the admin password

Another admin can reset it from the admin panel.

## Docker Setup

To run the whole stack (MySQL and the production app image) with [Docker Compose](docker-compose.yml):

```bash
docker-compose up -d
```

This will start:
- MySQL database (`db`)
- The application server (`app`, built from the `Dockerfile`, on port 3000)

For day-to-day development, run only the database (`docker-compose up -d db`) and use `pnpm dev`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.
