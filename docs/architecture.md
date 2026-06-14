# Architecture Overview

## High-Level Design

HOP is built as **two fully decoupled applications** with a shared type layer:

```
┌──────────────────────────────────────────────────────────────────┐
│                        HOP Monorepo                              │
│                                                                  │
│   ┌────────────────────┐        ┌──────────────────────────┐    │
│   │   HOP Dashboard    │  HTTP  │         HOP API          │    │
│   │  (Next.js App      │◄──────►│   (NestJS + TypeScript)  │    │
│   │   Router + TW)     │        │                          │    │
│   └────────────────────┘        │  ┌─────────────────────┐ │    │
│                                 │  │  Domain Modules      │ │    │
│   ┌──────────────┐              │  │  Auth, Clients,      │ │    │
│   │ @hop/shared- │              │  │  Billing, Products,  │ │    │
│   │    types     │──────────────┤  │  Provisioning, Etc.  │ │    │
│   └──────────────┘              │  └─────────────────────┘ │    │
│                                 │                          │    │
│   ┌──────────────┐              │  ┌──────────┐ ┌───────┐  │    │
│   │  @hop/plugin │              │  │  Prisma  │ │BullMQ │  │    │
│   │     -sdk     │──────────────┤  │    ORM   │ │ Queue │  │    │
│   └──────────────┘              │  └─────┬────┘ └───┬───┘  │    │
│                                 └────────┼──────────┼───────┘   │
│                                          │          │            │
│                                   ┌──────▼──┐ ┌────▼────┐       │
│                                   │PostgreSQL│ │  Redis  │       │
│                                   └─────────┘ └─────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
hop/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/        # Domain modules (one per feature)
│   │   │   │   ├── auth/
│   │   │   │   ├── clients/
│   │   │   │   ├── billing/
│   │   │   │   ├── products/
│   │   │   │   ├── services/
│   │   │   │   ├── payment/
│   │   │   │   ├── provisioning/
│   │   │   │   ├── domains/
│   │   │   │   ├── support/
│   │   │   │   ├── notifications/
│   │   │   │   ├── reports/
│   │   │   │   ├── affiliates/
│   │   │   │   ├── plugins/
│   │   │   │   ├── automation/
│   │   │   │   ├── settings/
│   │   │   │   ├── audit/
│   │   │   │   └── health/
│   │   │   ├── common/         # Guards, filters, interceptors, decorators
│   │   │   ├── prisma/         # PrismaService + PrismaModule
│   │   │   ├── redis/          # Redis client module
│   │   │   ├── config/         # Env validation
│   │   │   └── main.ts
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   └── dashboard/              # Next.js App Router
│       └── src/
│           ├── app/
│           │   ├── (admin)/    # Admin routes
│           │   ├── (portal)/   # Client portal routes
│           │   └── (auth)/     # Login / register
│           ├── components/
│           │   ├── ui/         # Primitive components
│           │   ├── features/   # Feature-specific components
│           │   └── providers/  # React context providers
│           ├── lib/
│           │   └── api/        # Typed API clients
│           └── store/          # Zustand state stores
├── packages/
│   ├── shared-types/           # TypeScript types/interfaces only
│   ├── plugin-sdk/             # Interfaces for building plugins
│   └── ui/                     # Tailwind config + design tokens
├── docs/                       # This documentation
├── scripts/                    # DB backup/restore scripts
└── .github/workflows/          # CI/CD pipelines
```

---

## NestJS Module Structure

Each domain module follows this pattern:

```
modules/billing/
├── billing.module.ts       # @Module() declaration
├── billing.controller.ts   # HTTP endpoints + Swagger decorators
├── billing.service.ts      # Business logic
├── dto/
│   ├── create-invoice.dto.ts   # class-validator validated DTOs
│   └── update-invoice.dto.ts
└── billing.controller.spec.ts  # Unit tests
```

---

## Request Lifecycle

```
HTTP Request
    │
    ▼
[Helmet] → [CORS] → [ThrottlerGuard]
    │
    ▼
[Router] → Controller
    │
    ├── [JwtAuthGuard]         Validates JWT access token
    ├── [PermissionsGuard]     Checks resource:action permissions
    └── [ValidationPipe]       Validates & transforms DTO
    │
    ▼
Service (business logic)
    │
    ├── PrismaService          Database queries
    ├── BullMQ queues          Async jobs
    ├── NotificationsService   Email dispatch
    └── AuditService           Audit log entry
    │
    ▼
[ResponseInterceptor]         Wraps in { success, data } envelope
    │
    ▼
HTTP Response
```

---

## Authentication Flow

```
1. POST /api/v1/auth/login
   → Returns { accessToken (15m), refreshToken (7d) }

2. Every request:
   Authorization: Bearer <accessToken>
   → JwtStrategy validates → injects JwtPayload into request.user

3. Token refresh:
   POST /api/v1/auth/refresh
   Body: { refreshToken }
   → Returns new token pair

4. Logout:
   POST /api/v1/auth/logout
   → Revokes refresh token in DB
```

---

## RBAC (Permission System)

Permissions are resource:action strings:

```
clients:read    clients:create    clients:update    clients:delete
invoices:read   invoices:create   invoices:pay
servers:read    servers:provision servers:suspend   servers:terminate
domains:read    domains:register  domains:transfer  domains:renew
support:read    support:reply     support:close     support:assign
reports:read    settings:read     settings:update
plugins:manage  affiliates:read   affiliates:manage
```

**Built-in roles:**

| Role         | Access Level                              |
| ------------ | ----------------------------------------- |
| `SuperAdmin` | All permissions (bypass)                  |
| `Admin`      | Most permissions except `settings:update` |
| `Staff`      | Support + client read                     |
| `Reseller`   | Own clients + limited billing             |
| `Client`     | Own data only                             |

Custom roles can be created with any permission combination.

---

## Plugin Model

See [Plugin Development Guide](./plugin-development-guide.md) for full details.

Plugins are npm packages that implement interfaces from `@hop/plugin-sdk`:

- `PaymentGatewayProvider` — payment processing
- `ProvisioningProvider` — server/hosting provisioning
- `RegistrarProvider` — domain registration

All plugin HTTP calls are mediated (logged, rate-limited). Plugins run at a configurable trust level: `trusted` (in-process) or `sandboxed` (isolated).

---

## Background Jobs (BullMQ)

Long-running and retryable operations run as BullMQ jobs:

| Queue           | Operations                                           |
| --------------- | ---------------------------------------------------- |
| `provisioning`  | create, suspend, unsuspend, terminate, changePackage |
| `notifications` | email send, webhook dispatch                         |
| `billing`       | invoice generation, payment processing               |
| `domains`       | domain registration, renewal, DNS updates            |

Each job has configurable retry attempts, backoff strategy, and timeout.

---

## Database

- **ORM**: Prisma
- **Default**: PostgreSQL 16
- **Supported**: PostgreSQL, MySQL/MariaDB, SQLite
- **Migrations**: `prisma migrate` — versioned and tracked in `apps/api/prisma/migrations/`
- **Schema**: Single `schema.prisma` covering all entities across all modules
