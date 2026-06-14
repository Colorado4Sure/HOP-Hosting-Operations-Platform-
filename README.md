# HOP — Hosting Operations Platform

> A modern, open-architecture, production-ready replacement for WHMCS — built on Node.js, NestJS, Next.js, PostgreSQL, and Redis.

---

## ✨ Features

| Category          | Capabilities                                                                            |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Billing**       | Recurring invoicing, multi-currency, taxes, VAT, credit notes, proration, dunning       |
| **Clients**       | Full CRM, groups, wallet/credit balance, contacts, GDPR export/delete                   |
| **Products**      | Product groups, configurable options, addons, bundles, per-cycle pricing                |
| **Provisioning**  | Plugin-based, async BullMQ jobs, cPanel/WHM, Plesk, generic REST adapters               |
| **Domains**       | Plugin-based registrar system, DNS management, auto-renew, WHOIS                        |
| **Support**       | Ticketing, departments, SLA, canned responses, knowledgebase, email piping              |
| **Payments**      | Plugin-based gateways (Paystack built-in), webhook verification, refunds                |
| **Automation**    | Centralized cron jobs, invoice generation, reminders, suspension, domain renewal        |
| **Notifications** | Editable email templates, variable substitution, multi-channel (email, webhook)         |
| **Reports**       | Revenue, MRR/ARR, churn, overdue invoices, product performance                          |
| **Affiliates**    | Referral tracking, commission rules, discount codes, payouts                            |
| **Plugins**       | Typed SDK, manifest-based, sandboxed execution, admin UI management                     |
| **RBAC**          | SuperAdmin, Admin, Staff, Reseller, Client + custom roles with fine-grained permissions |
| **Security**      | JWT + refresh tokens, 2FA (TOTP), audit log, rate limiting, Helmet, argon2              |

---

## 🏗️ Tech Stack

**Backend:** Node.js 20 · TypeScript · NestJS · Prisma ORM · PostgreSQL · BullMQ · Redis · Passport.js · Swagger

**Frontend:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · lucide-react · Zustand · TanStack Query · React Hook Form + Zod

**Infrastructure:** Docker · Docker Compose · GitHub Actions · Turborepo · pnpm workspaces

---

## 🚀 Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/yourorg/hop.git && cd hop
cp .env.example .env
# Edit .env — set JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
docker compose up -d
```

| Service      | URL                            |
| ------------ | ------------------------------ |
| Dashboard    | http://localhost:3000          |
| API          | http://localhost:3001/api/v1   |
| Swagger Docs | http://localhost:3001/api/docs |

Default admin: `admin@hop.local` / `HopAdmin123!` — **change immediately**.

### Local Development

```bash
pnpm install
pnpm --filter @hop/shared-types build
pnpm --filter @hop/plugin-sdk build
# Configure apps/api/.env, then:
pnpm --filter @hop/api db:migrate:dev
pnpm --filter @hop/api db:seed
pnpm dev
```

---

## 📁 Monorepo Structure

```
hop/
├── apps/
│   ├── api/          # NestJS backend  →  :3001
│   └── dashboard/    # Next.js frontend →  :3000
├── packages/
│   ├── shared-types/ # TypeScript interfaces (no logic)
│   ├── plugin-sdk/   # Plugin development interfaces
│   └── ui/           # Tailwind config + design tokens
├── docs/             # Full documentation
├── scripts/          # DB backup/restore, setup
├── .github/          # CI/CD workflows
└── docker-compose.yml
```

---

## 📚 Documentation

| Guide              | Link                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| Getting Started    | [docs/getting-started.md](./docs/getting-started.md)                   |
| Architecture       | [docs/architecture.md](./docs/architecture.md)                         |
| API Reference      | [docs/api-reference.md](./docs/api-reference.md)                       |
| Plugin Development | [docs/plugin-development-guide.md](./docs/plugin-development-guide.md) |
| Admin Guide        | [docs/admin-guide.md](./docs/admin-guide.md)                           |
| Database Guide     | [docs/database-guide.md](./docs/database-guide.md)                     |
| Deployment         | [docs/deployment-guide.md](./docs/deployment-guide.md)                 |
| Contributing       | [docs/contributing.md](./docs/contributing.md)                         |

---

## 🔧 Environment Variables

See [`.env.example`](./.env.example) for all variables. Required values:

| Variable             | Description                            |
| -------------------- | -------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string           |
| `JWT_SECRET`         | Token signing secret (≥32 chars)       |
| `JWT_REFRESH_SECRET` | Refresh token secret (≥32 chars)       |
| `ENCRYPTION_KEY`     | AES key for sensitive data (≥32 chars) |

---

## 🐳 Docker Services

| Service        | Image                      | Port          |
| -------------- | -------------------------- | ------------- |
| `api`          | custom (NestJS)            | 3001          |
| `dashboard`    | custom (Next.js)           | 3000          |
| `postgres`     | postgres:16-alpine         | 5432          |
| `redis`        | redis:7-alpine             | 6379          |
| `migrate`      | same as api                | — (runs once) |
| `pgadmin`      | pgAdmin (dev profile)      | 5050          |
| `redisinsight` | RedisInsight (dev profile) | 8081          |

```bash
# Start dev tools
docker compose --profile dev up -d
```

---

## 🔒 Security

- argon2 password hashing
- JWT access (15m) + refresh (7d) tokens with revocation
- TOTP 2FA support
- Full audit log for all privileged actions
- Rate limiting on all endpoints
- Helmet security headers
- CORS locked to configured frontend origin
- Plugin sandboxing with capability-based access
- Webhook signature verification per gateway
- All inputs validated via class-validator DTOs
- Prisma parameterized queries (no raw SQL in core)

---

## 📄 License

[MIT](./LICENSE)

---

## 🤝 Contributing

See [docs/contributing.md](./docs/contributing.md). Open an issue first for non-trivial changes.

Security issues: email `security@yourdomain.com` privately — do not open public GitHub issues.
