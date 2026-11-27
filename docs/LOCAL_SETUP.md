# Test Management Tool - Local Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **Node.js** (v22 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **pnpm** (Package manager)
   - Install: `npm install -g pnpm` (or `corepack enable`)
   - Verify installation: `pnpm --version`

3. **Docker** (to run MySQL), or your own **MySQL** server (v8.0 or higher)
   - Docker: https://docs.docker.com/get-docker/
   - MySQL: https://dev.mysql.com/downloads/mysql/

4. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

---

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone https://github.com/wernerthiago/test-management-tool.git
cd test-management-tool
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start the Database

```bash
docker-compose up -d db
```

This starts MySQL 8.0 with user `test_user` / `test_password` and database `test_management_tool`.

To use your own MySQL server instead, create the database (`CREATE DATABASE test_management_tool;`) and adjust `DATABASE_URL` in the next step.

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Its defaults already match the compose database:

```env
DATABASE_URL=mysql://test_user:test_password@127.0.0.1:3306/test_management_tool
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
TRUST_PROXY=0
VITE_APP_TITLE=QualityLoom
VITE_APP_LOGO=
```

**Important Notes:**
- `JWT_SECRET` must be at least 32 characters; the app refuses to start otherwise
- `PORT` is optional (default 3000)

### 5. Start the Development Server

```bash
pnpm dev
```

The app applies all database migrations at startup; there is no separate migration step.

### 6. Log In

Open http://localhost:3000 and log in with:

- **Username**: `admin`
- **Password**: `admin`

This account is created automatically when the database has no admin. At first login you must choose a new password (at least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character) before you can use anything else.

---

## Login and Users

Local development logs in exactly like production: email or username plus password. There is no automatic login.

- Admins manage users in the **Admin panel** (`/admin`), reachable from the landing page and from the user menu in the sidebar
- New users get a temporary password from an admin and must change it at first login
- Roles: **Admin** (everything, including the admin panel) and **User** (everything except the admin panel)

---

## Troubleshooting

### Database Connection Issues

1. Verify MySQL is running: `docker-compose ps` (or `mysql -u test_user -p`)
2. Check the `DATABASE_URL` in `.env` is correct
3. Special characters in the password (such as `@`) must be URL-encoded (`@` becomes `%40`)

**Example:**
```env
DATABASE_URL=mysql://root:Pass%40123@localhost:3306/test_management_tool
```

### Port 3000 Is Already in Use

The app fails to start instead of picking another port. Stop the other process or set `PORT` in `.env`.

### Cannot Log In as admin/admin

The default account is only created when the database has no admin. If you already changed its password and forgot it, ask another admin to reset it from the admin panel, or start with a fresh database (`docker-compose down -v` deletes the `db_data` volume and all data).

---

## Quick Start Example

```bash
pnpm install
docker-compose up -d db
cp .env.example .env
pnpm dev
```

Then open http://localhost:3000, log in with `admin` / `admin` and choose a new password.

---

## Support

GitHub Issues: https://github.com/wernerthiago/test-management-tool/issues
