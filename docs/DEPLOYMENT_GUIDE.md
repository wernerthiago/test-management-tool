# Test Management Tool - Deployment Guide

This comprehensive guide covers all the infrastructure requirements, hosting options, and step-by-step instructions for deploying the Test Management Tool to make it accessible to your organization's users.

---

## Table of Contents

1. [Hosting QualityLoom internally — what DevOps needs](#hosting-qualityloom-internally--what-devops-needs)
2. [System Architecture Overview](#system-architecture-overview)
3. [Infrastructure Requirements](#infrastructure-requirements)
4. [Hosting Options](#hosting-options)
5. [Database Setup](#database-setup)
6. [Application Deployment](#application-deployment)
7. [Domain and SSL Configuration](#domain-and-ssl-configuration)
8. [Authentication Setup](#authentication-setup)
9. [Environment Variables](#environment-variables)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)
11. [Cost Estimation](#cost-estimation)
12. [Security Considerations](#security-considerations)
13. [Deployment Checklist](#deployment-checklist)
14. [Troubleshooting](#troubleshooting)

---

## Hosting QualityLoom internally — what DevOps needs

QualityLoom is two pieces:

1. **The app container**, built from the `Dockerfile` in the repository root. It is stateless: no files are stored on disk, so it can be replaced or restarted at any time.
2. **A MySQL 8 database.** Use a managed MySQL service (RDS, Cloud SQL, Azure Database for MySQL, etc.) or a MySQL server with backups. All data lives here.

Nothing else is required: no file storage (S3), no email service, no external identity provider.

**Configuration** (environment variables, see [Environment Variables](#environment-variables)):

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | yes | `mysql://user:password@host:3306/database` |
| `JWT_SECRET` | yes | Random string, at least 32 characters. The app refuses to start otherwise. Changing it signs everyone out. |
| `TRUST_PROXY` | behind a proxy | `1` when one reverse proxy / load balancer / ingress sits in front of the app |
| `PORT` | no | Default `3000` |
| `NODE_ENV` | no | Already `production` in the image |
| `VITE_APP_TITLE`, `VITE_APP_LOGO` | no | Branding |

**Networking:**
- Put the app behind the company's HTTPS reverse proxy, ingress or load balancer, with an internal DNS name (e.g. `qualityloom.internal.example.com`).
- Set `TRUST_PROXY=1` so login rate limiting sees real client IPs instead of the proxy's.
- Serve it over HTTPS: the session cookie is marked `Secure` when the request arrives over HTTPS (directly, or as reported by the proxy's `X-Forwarded-Proto` header).
- Health check: `GET /health` (returns 200). The image also has a Docker `HEALTHCHECK` on it.
- CI pipelines that send Playwright results (`POST /api/playwright/report`) must be able to reach the URL over the network. If QualityLoom is only reachable inside the company network, GitHub-hosted runners cannot reach it; use self-hosted runners inside the network or expose that endpoint deliberately.

**Database migrations** run automatically when the app starts. Upgrading means deploying the new image and restarting; nobody runs migrations by hand.

**First login:** on an empty database the app creates the account `admin` / `admin`. Log in with it right after the first deployment and choose a new password (the app forces this). Then create the other users from the admin panel (`/admin`).

**Backups:** back up the MySQL database (see [Database Maintenance](#database-maintenance)). The app container holds no data.

---

## System Architecture Overview

The Test Management Tool is built with a modern full-stack architecture:

**Frontend:**
- React 19 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Responsive design for desktop and mobile

**Backend:**
- Node.js with Express
- tRPC for type-safe API
- Password login; sessions are signed JWTs in an httpOnly cookie
- RESTful endpoints for Playwright Reporter
- Applies database migrations automatically at startup

**Database:**
- MySQL 8.0+ (primary database)
- Drizzle ORM for database operations
- Supports connection pooling
- The only place where data is stored; the app itself is stateless

---

## Infrastructure Requirements

### Minimum Requirements

**Application Server:**
- **CPU**: 2 vCPUs
- **RAM**: 2 GB
- **Storage**: 20 GB SSD
- **OS**: Ubuntu 22.04 LTS or similar Linux distribution
- **Docker**, or **Node.js** v22.x and **pnpm** v10.x when running without containers

**Database Server:**
- **MySQL**: 8.0 or higher
- **CPU**: 2 vCPUs
- **RAM**: 2 GB
- **Storage**: 50 GB SSD (scales with test case data)

**Network:**
- HTTPS support (SSL/TLS certificate) at the reverse proxy
- Firewall configured for ports 80, 443
- Reachable from the CI runners that report Playwright results

### Recommended Requirements (for 50+ users)

**Application Server:**
- **CPU**: 4 vCPUs
- **RAM**: 4 GB
- **Storage**: 40 GB SSD

**Database Server:**
- **CPU**: 4 vCPUs
- **RAM**: 4 GB
- **Storage**: 100 GB SSD with automatic backups

---

## Hosting Options

### Option 1: Cloud Platform as a Service (Recommended)

**Platforms:**
- **Railway** (Full-stack deployment)
- **Render** (Full-stack deployment)
- **Fly.io** (Full-stack deployment)

**Pros:**
- Automatic SSL certificates
- Easy deployment from GitHub
- Built-in monitoring and logging
- Automatic scaling
- Zero-downtime deployments

**Cons:**
- Monthly recurring costs
- Less control over infrastructure

**Recommended Setup:**
- Deploy application on Railway/Render
- Use managed MySQL database (AWS RDS or provider's database)

### Option 2: Virtual Private Server (VPS)

**Providers:**
- **DigitalOcean** (Droplets)
- **Linode** (Compute Instances)
- **Vultr**
- **AWS EC2**
- **Google Cloud Compute Engine**

**Pros:**
- Full control over infrastructure
- Potentially lower costs for high usage
- Can host multiple services

**Cons:**
- Requires server management knowledge
- Manual SSL certificate setup
- Responsible for security updates
- Manual scaling

**Recommended Setup:**
- Single VPS instance with Docker
- MySQL on same server or managed database
- Nginx as reverse proxy
- Let's Encrypt for SSL

### Option 3: On-Premises Deployment

**Requirements:**
- Physical or virtual server in your data center
- Network infrastructure (internal DNS; a public IP only if users or CI runners outside the network need access)
- IT team for maintenance

**Pros:**
- Complete data control
- No recurring cloud costs
- Meets strict compliance requirements

**Cons:**
- Highest initial setup cost
- Requires dedicated IT resources
- Responsible for all maintenance and security

---

## Database Setup

### Option A: Managed Database (Recommended)

**Providers:**
- **AWS RDS for MySQL**
- **Google Cloud SQL for MySQL**
- **Azure Database for MySQL**
- **DigitalOcean Managed Databases**

**Setup Steps:**

1. **Create Database Instance**
   - Choose MySQL 8.0+
   - Select appropriate tier (2 GB RAM minimum)
   - Enable automatic backups
   - Configure in same region as application server

2. **Configure Database**
   ```sql
   CREATE DATABASE test_management_tool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Create Database User**
   ```sql
   CREATE USER 'tmt_user'@'%' IDENTIFIED BY 'strong_password_here';
   GRANT ALL PRIVILEGES ON test_management_tool.* TO 'tmt_user'@'%';
   FLUSH PRIVILEGES;
   ```

4. **Get Connection String**
   ```
   mysql://tmt_user:strong_password_here@host:3306/test_management_tool
   ```

5. **Enable SSL Connection** (if supported)
   - Download SSL certificates from provider
   - Configure connection to use SSL

The app creates all tables itself on first start (migrations run automatically), so an empty database is all it needs. The user must be allowed to create and alter tables in that database.

### Option B: Self-Hosted MySQL

**Installation on Ubuntu:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install MySQL
sudo apt install mysql-server -y

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE test_management_tool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tmt_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON test_management_tool.* TO 'tmt_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Configure MySQL for Production:**

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

Restart MySQL:
```bash
sudo systemctl restart mysql
```

---

## Application Deployment

### Deployment with Docker

The `Dockerfile` builds a production image (Node 22 Alpine, pnpm 10 via Corepack). It contains only the build output, production dependencies and the `drizzle/` migrations, runs `node dist/index.js` with `NODE_ENV=production` as the non-root user `node`, exposes port 3000 and has a `HEALTHCHECK` on `GET /health`.

**Build and run the image:**

```bash
docker build -t qualityloom .

docker run -d --name qualityloom -p 3000:3000 \
  -e DATABASE_URL=mysql://tmt_user:strong_password_here@db-host:3306/test_management_tool \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e TRUST_PROXY=1 \
  qualityloom
```

Generate `JWT_SECRET` once and store it in your secret manager; do not generate a new one on every deploy, or everyone is signed out. Keep the container on port 3000 (the image's health check calls that port) and map it to another host port with `-p` if needed.

On start the container applies pending migrations, creates `admin` / `admin` if the database has no admin, and starts serving. It has been verified to start on an empty database and to restart cleanly.

**Upgrade:** build or pull the new image and replace the container. Migrations for the new version run at startup.

**Or run app and database together with Docker Compose:**

```bash
docker-compose up -d
```

`docker-compose.yml` defines two services: `db` (MySQL 8.0, data in the `db_data` volume) and `app` (built from the `Dockerfile`, port 3000). Compose refuses to start until `JWT_SECRET` is set (in `.env` or the environment), and the production app refuses the placeholder from `.env.example`. Set `JWT_SECRET` (and optionally `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `TRUST_PROXY`, `APP_PORT`) in the environment or a `.env` file before starting; the defaults are for local use only.

### Deployment on Cloud Platform (Railway Example)

1. **Prepare Repository**
   ```bash
   # Ensure code is pushed to GitHub
   git push origin main
   ```

2. **Create Railway Project**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your test-management-tool repository
   - Railway detects the `Dockerfile` and builds the image

3. **Add Database**
   - Click "New" → "Database" → "MySQL"
   - Railway will provision a MySQL instance
   - Connection string will be available as `DATABASE_URL`

4. **Configure Environment Variables**
   - Go to project settings → Variables
   - Add required variables (see [Environment Variables](#environment-variables))

5. **Configure Build Settings** (only if not building from the `Dockerfile`)
   ```json
   {
     "buildCommand": "pnpm install && pnpm build",
     "startCommand": "pnpm start"
   }
   ```

6. **Deploy**
   - Railway will automatically deploy on every push to main
   - Access your app at the provided Railway URL and log in with `admin` / `admin` (see [Authentication Setup](#authentication-setup))

7. **Add Custom Domain** (optional)
   - Go to Settings → Domains
   - Add your custom domain
   - Configure DNS as instructed

### Deployment on VPS (Ubuntu)

**1. Initial Server Setup**

```bash
# Connect to server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Create application user
adduser tmt
usermod -aG sudo tmt
su - tmt

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Enable pnpm (version pinned in package.json)
sudo corepack enable

# Install PM2 for process management
npm install -g pm2
```

**2. Clone and Setup Application**

```bash
# Clone repository
cd /home/tmt
git clone https://github.com/your-org/test-management-tool.git
cd test-management-tool

# Install dependencies
pnpm install

# Create .env file
nano .env
```

Add environment variables (see [Environment Variables](#environment-variables))

**3. Build Application**

```bash
# Build for production
pnpm build
```

No migration step: the app applies database migrations when it starts.

**4. Start Application with PM2**

```bash
# Start application (production mode)
NODE_ENV=production pm2 start dist/index.js --name test-management-tool

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command output instructions
```

**5. Configure Nginx as Reverse Proxy**

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/test-management-tool
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Set `TRUST_PROXY=1` in `.env` when the app runs behind Nginx.

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/test-management-tool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**6. Setup SSL with Let's Encrypt**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

**7. Configure Firewall**

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Domain and SSL Configuration

### Domain Setup

1. **Choose a Domain**
   - For internal hosting: an internal DNS name managed by your IT team
   - For public hosting: a domain from a registrar (Namecheap, GoDaddy, Cloudflare, etc.)

2. **Configure DNS Records**
   
   For cloud platforms (Railway, Render):
   ```
   Type: CNAME
   Name: @ (or subdomain)
   Value: your-app.railway.app (or provider's URL)
   TTL: Auto
   ```

   For VPS:
   ```
   Type: A
   Name: @
   Value: your-server-ip
   TTL: Auto
   ```

3. **Wait for DNS Propagation** (can take up to 48 hours)

### SSL Certificate

**Cloud Platforms:**
- Automatic SSL provided by platform

**VPS with Let's Encrypt:**
- Free SSL certificates
- Automatic renewal
- See VPS deployment steps above

---

## Authentication Setup

QualityLoom has its own user accounts with password login (email or username + password) at `/login`. There is no OAuth, SSO or external identity provider to configure, and no email is sent.

### First Login

When the database has no admin user (first start), the app creates one:

- **Username**: `admin`
- **Password**: `admin`

Log in with it immediately after the first deployment. The app forces it to `/change-password` and allows nothing else until a new password is set. New passwords need at least 8 characters, an uppercase letter, a lowercase letter, a number and a special character.

### Admin Panel and Users

Admins manage users at `/admin`, reachable from the **Admin panel** button on the landing page and from the user menu in the sidebar. There they can:

- Add a user (name, email, role, temporary password of at least 8 characters). The user must change it at first login.
- Change a user's role
- Reset a user's password to a new temporary one (forces a change at next login)
- Delete a user

Admins cannot delete or demote themselves, and the last admin cannot be deleted or demoted, so there is always at least one admin.

There is no sign-up page and no invite links; only admins create accounts. Users change their own password from **Change password** on the landing page.

### Roles

| Role | Access |
|---|---|
| `admin` | Everything, including the admin panel |
| `user` | Everything except the admin panel |

Every signed-in user can see and open every project.

### Sessions

- Session cookie `app_session_id`: httpOnly, `SameSite=Lax`, `Secure` when served over HTTPS
- Signed with `JWT_SECRET`, valid for one year. Rotating `JWT_SECRET` signs everyone out.
- Failed logins are rate limited: 10 per IP per 15 minutes. Behind a proxy, set `TRUST_PROXY` so the limit applies per real client IP.

Generate a strong `JWT_SECRET`:

```bash
openssl rand -base64 32
```

---

## Environment Variables

### Required Variables

```env
# Database (MySQL 8)
DATABASE_URL=mysql://user:password@host:3306/database

# Signs session cookies. At least 32 characters; the app refuses to start otherwise
JWT_SECRET=<output of: openssl rand -hex 32>
```

### Optional Variables

```env
# production for hosting (the Docker image already sets it)
NODE_ENV=production

# Port to listen on (default 3000). The app fails to start if the port is busy
PORT=3000

# Number of reverse proxies in front of the app (default 0). Set 1 behind a load balancer, ingress or Nginx
TRUST_PROXY=1

# Branding
VITE_APP_TITLE=QualityLoom
VITE_APP_LOGO=https://your-domain.com/logo.png
```

No other variables are used. File storage (S3/MinIO), email, OAuth and analytics settings no longer exist.

---

## Monitoring and Maintenance

### Application Monitoring

**PM2 Monitoring (VPS):**
```bash
# View logs
pm2 logs test-management-tool

# Monitor resources
pm2 monit

# View process status
pm2 status
```

**Health Check:**
- `GET /health` returns 200 when the app is up. Use it for load balancer, ingress or uptime checks.

**Docker:**
```bash
docker logs -f qualityloom
docker inspect --format '{{.State.Health.Status}}' qualityloom
```

**Cloud Platform Monitoring:**
- Use built-in dashboards
- Set up alerts for downtime
- Monitor resource usage

### Database Maintenance

All QualityLoom data is in the MySQL database; the app container is stateless. Backing up the database is the whole backup. With a managed MySQL service, enable its automated backups and point-in-time recovery.

**Backup Strategy (self-hosted MySQL):**

1. **Automated Daily Backups**
   ```bash
   # Create backup script
   nano /home/tmt/backup-db.sh
   ```

   ```bash
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="/home/tmt/backups"
   mkdir -p $BACKUP_DIR
   
   mysqldump -u tmt_user -p'password' test_management_tool | gzip > $BACKUP_DIR/backup_$DATE.sql.gz
   
   # Keep only last 30 days
   find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
   ```

   ```bash
   chmod +x /home/tmt/backup-db.sh
   
   # Add to crontab (daily at 2 AM)
   crontab -e
   0 2 * * * /home/tmt/backup-db.sh
   ```

2. **Test Restore Procedure**
   ```bash
   # Restore from backup
   gunzip < backup_20250126_020000.sql.gz | mysql -u tmt_user -p test_management_tool
   ```

### Security Updates

**VPS:**
```bash
# Weekly security updates
sudo apt update && sudo apt upgrade -y

# Update the application
cd /home/tmt/test-management-tool
git pull
pnpm install --frozen-lockfile

# Rebuild and restart (migrations run at startup)
pnpm build
pm2 restart test-management-tool
```

**Docker:** rebuild the image from the updated repository and replace the container; migrations run at startup.

**Cloud Platforms:**
- Automatic platform updates
- Monitor for dependency vulnerabilities
- Enable Dependabot on GitHub

### Log Management

**Configure Log Rotation (VPS):**
```bash
sudo nano /etc/logrotate.d/test-management-tool
```

```
/home/tmt/.pm2/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 tmt tmt
    sharedscripts
}
```

---

## Cost Estimation

### Small Organization (10-20 users)

**Cloud Platform Option:**
- **Railway/Render**: $20-30/month
- **Managed MySQL**: $15-25/month
- **Domain**: $12/year
- **Total**: ~$35-55/month

**VPS Option:**
- **DigitalOcean Droplet** (4GB): $24/month
- **Managed MySQL**: $15/month
- **Domain**: $12/year
- **Total**: ~$40/month

### Medium Organization (50-100 users)

**Cloud Platform Option:**
- **Railway/Render**: $50-80/month
- **Managed MySQL**: $50-100/month
- **Domain**: $12/year
- **Total**: ~$100-180/month

**VPS Option:**
- **DigitalOcean Droplet** (8GB): $48/month
- **Managed MySQL**: $50/month
- **Domain**: $12/year
- **Total**: ~$100/month

### Large Organization (200+ users)

**Cloud Platform Option:**
- **Railway/Render**: $150-250/month
- **AWS RDS MySQL**: $150-300/month
- **Domain**: $12/year
- **CDN** (Cloudflare): $20/month
- **Total**: ~$320-570/month

---

## Security Considerations

### Application Security

1. **Environment Variables**
   - Never commit `.env` files to Git
   - Use strong, unique passwords
   - Rotate secrets regularly

2. **Database Security**
   - Use strong database passwords
   - Enable SSL connections
   - Restrict database access by IP
   - Regular backups with encryption

3. **HTTPS Only**
   - Force HTTPS redirects
   - Use HSTS headers
   - Keep SSL certificates updated

4. **Authentication**
   - Change the default `admin` / `admin` password right after the first deployment (the app forces it at first login)
   - Strong `JWT_SECRET` (at least 32 characters), kept in a secret manager
   - Sessions last one year; rotating `JWT_SECRET` signs everyone out
   - Passwords are stored as bcrypt hashes

5. **API Security**
   - Login rate limiting (10 failed attempts per IP per 15 minutes; set `TRUST_PROXY` behind a proxy)
   - Input validation
   - SQL injection prevention (handled by Drizzle ORM)
   - `POST /api/playwright/report` does not require a login: anyone who can reach the URL can submit results for a project ID. Restrict network access to it accordingly.

### Network Security

**Firewall Rules (VPS):**
```bash
# Only allow necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

**Fail2Ban (VPS):**
```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Configure for SSH and Nginx
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Regular Security Audits

1. **Dependency Scanning**
   ```bash
   pnpm audit
   pnpm audit --fix
   ```

2. **Update Dependencies Regularly**
   ```bash
   pnpm update --latest
   ```

3. **Monitor Security Advisories**
   - Enable GitHub Dependabot
   - Subscribe to security mailing lists

---

## Deployment Checklist

### Pre-Deployment

- [ ] Database created and configured (empty; the app creates the tables)
- [ ] Environment variables documented (`DATABASE_URL`, `JWT_SECRET`, `TRUST_PROXY`)
- [ ] SSL certificate obtained
- [ ] Domain DNS configured
- [ ] Backup strategy implemented
- [ ] Monitoring tools configured

### Deployment

- [ ] Application deployed
- [ ] Environment variables set
- [ ] `GET /health` returns 200 through the proxy
- [ ] HTTPS working correctly
- [ ] Logged in as `admin` / `admin` and set a new password
- [ ] CI runners can reach `POST /api/playwright/report`

### Post-Deployment

- [ ] Create user accounts in the admin panel
- [ ] Test all major features
- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Document access credentials
- [ ] Train initial users
- [ ] Create user documentation

---

## Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Check database is running
sudo systemctl status mysql

# Test connection
mysql -u tmt_user -p -h localhost test_management_tool

# Check DATABASE_URL format
echo $DATABASE_URL
```

**Application Won't Start:**
```bash
# Check Node.js version
node --version  # Should be 22.x+

# Check logs (or docker logs qualityloom)
pm2 logs test-management-tool

# Rebuild application
pnpm build
```

Common causes visible in the logs:
- `Missing required environment variables`: set `DATABASE_URL` and `JWT_SECRET`
- `JWT_SECRET must be at least 32 characters long`: use a longer secret
- `JWT_SECRET is still the example placeholder`: generate a real secret (`openssl rand -hex 32`); the `.env.example` value is public
- `Could not listen on port 3000`: another process uses the port; the app does not fall back to another one
- A migration error: check that the database user can create and alter tables

**Login Blocked for Everyone (rate limit):**
- Behind a proxy without `TRUST_PROXY`, all users share the proxy's IP for rate limiting. Set `TRUST_PROXY=1`.
- If the admin password is lost, another admin can reset it from the admin panel.

**SSL Certificate Issues:**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Check certificate expiration
sudo certbot certificates
```

**Playwright Results Not Arriving:**
- Check that the CI runner can reach the app URL (internal-only hosting is not reachable from GitHub-hosted runners)
- Check the project ID used by the reporter (Settings > Playwright Reporter)

---

## Support and Resources

### Documentation

- **Application Docs**: See `README.md` in repository
- **Local Setup**: See `LOCAL_SETUP.md`

### Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Email Support**: support@your-organization.com
- **Internal Wiki**: Link to internal documentation

### Useful Commands Reference

```bash
# Docker
docker build -t qualityloom .
docker logs -f qualityloom
docker restart qualityloom

# Application Management (PM2)
pm2 start/stop/restart test-management-tool
pm2 logs test-management-tool
pm2 monit

# Database
mysql -u tmt_user -p test_management_tool
mysqldump -u tmt_user -p test_management_tool > backup.sql

# Nginx
sudo systemctl restart nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# SSL
sudo certbot renew
sudo certbot certificates

# System
sudo systemctl status mysql
sudo systemctl status nginx
df -h  # Check disk space
free -h  # Check memory
top  # Check CPU usage
```

---

## Conclusion

This deployment guide provides comprehensive instructions for hosting the Test Management Tool. Choose the deployment option that best fits your organization's needs, budget, and technical expertise.

For additional assistance or custom deployment requirements, please contact your IT team or the application maintainers.

**Last Updated**: January 2025  
**Version**: 1.0.0

