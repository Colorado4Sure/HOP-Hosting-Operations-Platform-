# Database Guide

## Overview

HOP uses **Prisma ORM** as its data layer. The schema is defined in `apps/api/prisma/schema.prisma` and covers all entities across all modules.

**Default database:** PostgreSQL 16  
**Supported:** PostgreSQL, MySQL/MariaDB, SQLite

---

## Switching Database Providers

Set `DATABASE_PROVIDER` in your `.env`:

```dotenv
# PostgreSQL (default)
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:password@host:5432/hop_db

# MySQL / MariaDB
DATABASE_PROVIDER=mysql
DATABASE_URL=mysql://user:password@host:3306/hop_db

# SQLite (development/testing only)
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./hop.db
```

> ⚠️ SQLite is **not recommended for production**. It lacks concurrency support needed for BullMQ job processing.

> ⚠️ After switching providers, you must run a fresh migration — cross-provider migration is not supported.

---

## Running Migrations

### Development

```bash
cd apps/api

# Create and apply a new migration
pnpm db:migrate:dev --name your_migration_name

# Apply pending migrations (CI/staging)
pnpm db:migrate

# Reset and reapply all migrations (destructive!)
npx prisma migrate reset
```

### Production

```bash
# Safe: only applies pending migrations, never resets
pnpm db:migrate
```

The Docker `migrate` service handles this automatically at startup.

---

## Seeding

The seed script (`apps/api/prisma/seed.ts`) creates:

- Default system roles (SuperAdmin, Admin, Staff, Reseller, Client)
- Default departments (General Support, Billing, Technical, Sales)
- System email templates (welcome, invoice, ticket, etc.)
- Automation job schedules
- Platform settings
- Initial SuperAdmin account (credentials from `.env`)

```bash
pnpm db:seed
```

---

## Schema Overview

### Core Entities

```
users ──────────────────────────── refresh_tokens
  │                                       │
  ├──► clients ──────────────────────────┐│
  │       │                             ││
  │       ├──► client_addresses         ││
  │       ├──► client_contacts          ││
  │       ├──► client_notes             ││
  │       ├──► client_activity          ││
  │       ├──► invoices ─────────────── invoice_line_items
  │       │       │                         │
  │       │       └──► transactions         ├──► services
  │       ├──► services ──────────────────────────────────
  │       │       │                         └──► domains
  │       │       ├──► service_addons
  │       │       ├──► provisioning_jobs
  │       │       └──► service_usage
  │       ├──► domains
  │       ├──► tickets ──────────────── ticket_replies ─── ticket_attachments
  │       └──► affiliate ──────────── referrals
  └──► audit_logs
```

### Key Relations

| Table      | Key Relations                                             |
| ---------- | --------------------------------------------------------- |
| `users`    | One-to-one with `clients`                                 |
| `clients`  | Has many: invoices, services, domains, tickets, addresses |
| `services` | Belongs to client + product; has many provisioning jobs   |
| `invoices` | Belongs to client; has many line items + transactions     |
| `tickets`  | Belongs to client + department; has many replies          |
| `plugins`  | Standalone; stores manifest JSON + config JSON            |

---

## Backup & Restore

### Backup

```bash
# Backup to ./backups/ directory
./scripts/backup-db.sh

# Backup to custom directory
./scripts/backup-db.sh /var/backups/hop
```

Backups are gzip-compressed PostgreSQL custom-format dumps. The script automatically prunes backups older than the 30 most recent.

### Restore

```bash
./scripts/restore-db.sh ./backups/hop_db_20260614_120000.sql.gz
```

> ⚠️ Restore replaces ALL data. You will be prompted to confirm.

### Automated Backups

Add to cron (`crontab -e`):

```cron
0 2 * * * cd /opt/hop && ./scripts/backup-db.sh /var/backups/hop >> /var/log/hop-backup.log 2>&1
```

---

## Prisma Database Studio

Visual database browser (dev only):

```bash
cd apps/api
npx prisma studio
```

Opens at http://localhost:5555

---

## WHMCS Migration

HOP provides migration utilities for importing data from WHMCS.

### Supported Imports

| Data             | Status                  |
| ---------------- | ----------------------- |
| Clients          | ✅                      |
| Invoices         | ✅                      |
| Services         | ✅                      |
| Tickets          | ✅                      |
| Domains          | ✅                      |
| Email templates  | Manual (format differs) |
| Products/pricing | Manual (schema differs) |

### Migration Steps

1. Export WHMCS data to CSV from WHMCS Admin → Reports → Export
2. Run the import script:
   ```bash
   cd apps/api
   npx ts-node scripts/import-whmcs.ts --file ./whmcs-export.zip
   ```
3. Verify imported data in HOP admin
4. Reconfigure payment gateways and provisioning modules
5. Test a billing cycle and new ticket before going live

> The WHMCS importer does **not** import passwords (bcrypt/argon2 hashes are incompatible). Clients must use "Forgot Password" on first login.

---

## Performance Tuning

### PostgreSQL

```sql
-- Recommended connection pool size (in .env)
-- DATABASE_URL=...?connection_limit=20&pool_timeout=10

-- Key indexes (already applied via Prisma)
-- users(email), clients(email, status), invoices(client_id, status, due_date)
-- services(client_id, status, next_due_date), domains(client_id, expiry_date)
-- audit_logs(created_at), tickets(client_id, status)
```

### Prisma Connection Pooling

For high-traffic deployments, use [PgBouncer](https://www.pgbouncer.org/) or [Prisma Accelerate](https://www.prisma.io/accelerate) in front of PostgreSQL:

```dotenv
DATABASE_URL=postgresql://user:pass@pgbouncer:6432/hop_db?pgbouncer=true&connection_limit=1
```
