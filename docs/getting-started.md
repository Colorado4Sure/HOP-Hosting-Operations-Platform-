# Getting Started with HOP

**HOP (Hosting Operations Platform)** is a modern, open-architecture alternative to WHMCS — built on Node.js, NestJS, Next.js, and PostgreSQL.

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 20 LTS |
| pnpm | 9.x |
| Docker + Docker Compose | v24+ |
| PostgreSQL | 14+ (or use Docker) |
| Redis | 7+ (or use Docker) |

---

## Quick Start (Docker — Recommended)

The fastest way to run a full HOP stack locally.

### 1. Clone the repository

```bash
git clone https://github.com/yourorg/hop.git
cd hop
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set **required** secrets:

```dotenv
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<another-random-64-char-string>
ENCRYPTION_KEY=<32-char-hex-string>
```

Generate secure values:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start the stack

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **HOP API** on port `3001`
- **HOP Dashboard** on port `3000`
- **migrate** service (runs migrations + seed once)

### 4. Access the platform

| Service | URL | Notes |
|---------|-----|-------|
| Dashboard | http://localhost:3000 | Admin + Client Portal |
| API | http://localhost:3001/api/v1 | REST API |
| Swagger Docs | http://localhost:3001/api/docs | Dev only |

**Default admin credentials** (from `.env`):
- Email: `admin@hop.local`
- Password: `HopAdmin123!`

> ⚠️ Change these immediately after first login.

### 5. Dev tools (optional)

```bash
docker compose --profile dev up -d
```

Adds:
- **pgAdmin** on http://localhost:5050
- **RedisInsight** on http://localhost:8081

---

## Manual Setup (Local Development)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Build shared packages

```bash
pnpm --filter @hop/tsconfig build
pnpm --filter @hop/shared-types build
pnpm --filter @hop/plugin-sdk build
```

### 3. Set up the database

Start PostgreSQL and Redis (via Docker or natively), then:

```bash
cd apps/api
cp ../../.env.example .env
# Edit .env with your DATABASE_URL, REDIS_HOST, JWT secrets, etc.

pnpm db:migrate:dev   # Run migrations
pnpm db:seed          # Seed initial data + admin account
```

### 4. Start the API

```bash
pnpm --filter @hop/api dev
```

API is available at http://localhost:3001/api/v1

### 5. Start the Dashboard

```bash
pnpm --filter @hop/dashboard dev
```

Dashboard is available at http://localhost:3000

### 6. Run both together (from monorepo root)

```bash
pnpm dev
```

---

## Available Routes

### Dashboard Routes (`http://localhost:3000`)

**Auth**
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

**Admin**
- `/dashboard`
- `/clients`
- `/clients/[id]`
- `/products`
- `/domains`
- `/support`
- `/support/[id]`
- `/billing/invoices`
- `/billing/invoices/[id]`
- `/provisioning`
- `/plugins`
- `/automation`
- `/reports`
- `/settings`

**Client Portal**
- `/portal/dashboard`
- `/portal/billing`
- `/portal/services`
- `/portal/support`
- `/portal/support/new`
- `/portal/support/[id]`
- `/portal/profile`

### API Routes (`http://localhost:3001/api/v1`)

OpenAPI/Swagger: `http://localhost:3001/api/docs`

**Auth (`/auth`)**
- `POST /register`
- `POST /login`
- `POST /refresh`
- `POST /logout`
- `GET /me`
- `GET /verify-email/:token`
- `POST /forgot-password`
- `POST /reset-password`
- `PATCH /change-password`
- `POST /2fa/setup`
- `POST /2fa/verify`
- `POST /2fa/disable`

**Health (`/health`)**
- `GET /`
- `GET /db`
- `GET /queue`

**Clients (`/clients`)**
- `GET /`
- `GET /:id`
- `POST /`
- `PUT /:id`
- `PATCH /:id/suspend`
- `PATCH /:id/activate`
- `POST /:id/notes`
- `GET /:id/activity`
- `PATCH /:id/credit`
- `GET /groups/all`
- `POST /groups`

**Billing (`/billing`)**
- `GET /invoices`
- `GET /invoices/:id`
- `POST /invoices`
- `POST /invoices/:id/send`
- `POST /invoices/:id/payment`
- `PATCH /invoices/:id/cancel`
- `GET /transactions`
- `POST /credit-notes`
- `GET /tax-rules`
- `POST /tax-rules`
- `PUT /tax-rules/:id`

**Products (`/products`)**
- `GET /groups`
- `POST /groups`
- `PUT /groups/:id`
- `GET /addons`
- `POST /addons`
- `POST /:id/pricing`
- `PUT /pricing/:id`
- `DELETE /pricing/:id`
- `GET /`
- `POST /`
- `GET /:id`
- `PUT /:id`
- `DELETE /:id`

**Services (`/services`)**
- `GET /`
- `POST /`
- `GET /:id`
- `PUT /:id`
- `PATCH /:id/suspend`
- `PATCH /:id/unsuspend`
- `PATCH /:id/terminate`
- `PATCH /:id/cancel`
- `PATCH /:id/upgrade`
- `GET /:id/usage`

**Domains (`/domains`)**
- `GET /`
- `POST /`
- `GET /tld-pricing`
- `POST /tld-pricing`
- `GET /:id`
- `PUT /:id`
- `POST /:id/renew`
- `POST /:id/transfer`
- `PATCH /:id/nameservers`
- `PATCH /:id/auto-renew`

**Support (`/support`)**
- `GET /tickets`
- `POST /tickets`
- `GET /tickets/:id`
- `POST /tickets/:id/replies`
- `PATCH /tickets/:id/status`
- `PATCH /tickets/:id/assign`
- `PATCH /tickets/:id/close`
- `GET /departments`
- `POST /departments`
- `PUT /departments/:id`
- `GET /kb/categories`
- `POST /kb/categories`
- `GET /kb/articles`
- `POST /kb/articles`
- `PUT /kb/articles/:id`
- `GET /canned-responses`
- `POST /canned-responses`

**Payment (`/payment`)**
- `GET /gateways`
- `POST /initiate`
- `POST /webhook/:gatewaySlug`
- `GET /transactions`

**Provisioning (`/provisioning`)**
- `GET /servers`
- `POST /servers`
- `GET /servers/:id`
- `PUT /servers/:id`
- `GET /jobs`
- `POST /jobs`
- `GET /jobs/:id`
- `PATCH /jobs/:id/retry`
- `PATCH /jobs/:id/cancel`

**Automation (`/automation`)**
- `GET /jobs`
- `PUT /jobs/:slug`
- `GET /jobs/:slug/logs`
- `POST /jobs/:slug/run`

**Notifications (`/notifications`)**
- `GET /templates`
- `PUT /templates/:id`
- `GET /logs`

**Plugins (`/plugins`)**
- `GET /`
- `POST /install`
- `GET /:slug`
- `PUT /:slug/config`
- `PATCH /:slug/enable`
- `PATCH /:slug/disable`
- `DELETE /:slug`

**Reports (`/reports`)**
- `GET /overview`
- `GET /revenue`
- `GET /clients`
- `GET /services`
- `GET /overdue`
- `GET /mrr`

**Settings (`/settings`)**
- `GET /`
- `PUT /`
- `GET /roles`
- `POST /roles`
- `PUT /roles/:id`
- `GET /audit-logs`

**Affiliates (`/affiliates`)**
- `GET /`
- `POST /`
- `GET /discount-codes`
- `POST /discount-codes`
- `PUT /discount-codes/:id`
- `POST /discount-codes/validate`
- `GET /:id`
- `PUT /:id`
- `PATCH /:id/approve`
- `GET /:id/referrals`

---

## Environment Variables Reference

All variables are validated at boot time — the application will fail fast with a clear error if a required variable is missing.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Full database connection string |
| `JWT_SECRET` | Secret for signing access tokens (≥32 chars) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (≥32 chars) |
| `ENCRYPTION_KEY` | AES encryption key for sensitive data (≥32 chars) |

### Optional with Defaults

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PROVIDER` | `postgresql` | `postgresql`, `mysql`, or `sqlite` |
| `NODE_ENV` | `development` | `development`, `production`, `test` |
| `API_PORT` | `3001` | Port the API listens on |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `DEFAULT_CURRENCY` | `USD` | Platform default currency |
| `SMTP_HOST` | — | SMTP server (email disabled if not set) |
| `DEFAULT_PLUGIN_TRUST_LEVEL` | `sandboxed` | Default trust level for plugins |
| `SEED_ADMIN_EMAIL` | `admin@hop.local` | Admin account email |
| `SEED_ADMIN_PASSWORD` | `HopAdmin123!` | Admin account password |

---

## First Steps After Installation

1. **Change admin password** → Settings → Security
2. **Configure company info** → Settings → General
3. **Set up payment gateway** → Settings → Plugins → Install a payment plugin
4. **Create a product group and products** → Products
5. **Configure email / SMTP** → Settings → Email
6. **Review automation jobs** → Automation (all key jobs are pre-configured)
7. **Invite staff members** → Settings → Users & Roles
