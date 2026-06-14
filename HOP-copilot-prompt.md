# HOP — Hosting Operations Platform

### Full Build Specification & Prompt for GitHub Copilot

---

## 0. Project Summary

Build **HOP (Hosting Operations Platform)** — a modern, production-ready, open-architecture replacement for WHMCS. HOP must replicate and modernize every core capability of WHMCS (billing, invoicing, provisioning, domains, support, client management, plugins, automation) while fixing WHMCS's biggest weaknesses: outdated templating, PHP/ionCube lock-in, slow rendering, poor API design, weak plugin standards, and clunky UI.

HOP is built as **two fully decoupled applications**:

1. **HOP-API** — a Node.js/TypeScript backend exposing a versioned, documented REST (and optionally GraphQL) API.
2. **HOP-Dashboard** — a Next.js + Tailwind CSS frontend (Admin Dashboard + Client Portal) that consumes the API exclusively over HTTP. No shared server-side code, no direct DB access from the frontend.

---

## 1. Tech Stack

**Backend**

- Node.js (LTS) + TypeScript
- **NestJS** as the framework — chosen specifically for its class-based architecture (modules, controllers, services, providers, decorators), dependency injection, and built-in scalability patterns
- **Prisma ORM** as the primary data layer
  - Default database: **PostgreSQL**
  - Must also support MySQL/MariaDB and SQLite via Prisma's multi-provider config, selectable at install time via `.env`
- **BullMQ + Redis** for background jobs, cron automation, queues (invoice generation, provisioning retries, email sending, domain renewals)
- **Passport.js + JWT** for authentication, with refresh tokens and session revocation
- **CASL** or a custom RBAC engine for role/permission management
- **class-validator** + **class-transformer** for DTO validation
- **Swagger / OpenAPI** auto-generated from decorators for full API documentation
- **Winston** or **Pino** for structured logging
- **Jest** for unit/integration testing

**Frontend**

- **Next.js (App Router)** + TypeScript
- **Tailwind CSS** for styling
- **lucide-react** for all icons
- **shadcn/ui** as the base component primitives (buttons, dialogs, dropdowns, tables) — customized to match HOP's design system
- Theme system supporting **dark mode and light mode** via Tailwind's `class` strategy + a persisted user preference
- **Zustand** or **TanStack Query** for state/data fetching from HOP-API
- **React Hook Form + Zod** for form handling and validation

**Infrastructure**

- Docker + Docker Compose for local dev and production deployment
- GitHub Actions for CI/CD (lint, test, build, deploy)
- Environment-based config via `.env` + a config validation module (no hardcoded secrets)

---

## 2. Monorepo Structure

Use a monorepo (e.g., Turborepo or pnpm workspaces) with this structure:

```
hop/
├── apps/
│   ├── api/                  # NestJS backend (HOP-API)
│   └── dashboard/             # Next.js frontend (HOP-Dashboard)
├── packages/
│   ├── shared-types/          # Shared TypeScript interfaces/DTOs (types only, no logic)
│   ├── plugin-sdk/             # SDK for building HOP plugins
│   └── ui/                     # Shared design tokens, base Tailwind config
├── docs/                       # Full documentation (see Section 8)
├── docker-compose.yml
├── turbo.json
└── README.md
```

---

## 3. Backend (HOP-API) — Module Breakdown

Build each domain as its own **NestJS module** with the standard structure: `module`, `controller`, `service`, `dto/`, `entities/` (Prisma models), `interfaces/`, and `tests/`. Every module must be independently testable and loosely coupled via dependency injection.

### 3.1 Auth & RBAC Module

- Registration, login, password reset, email verification, 2FA (TOTP)
- JWT access + refresh token flow
- Role-based access control with configurable roles: `SuperAdmin`, `Admin`, `Staff` (with granular permission groups), `Reseller`, `Client`
- Permission system should be **resource + action based** (e.g., `invoices:read`, `servers:provision`) so new roles can be composed without code changes
- Audit log entry for every privileged action

### 3.2 Client Management Module

- Client CRUD (profile, contacts, addresses, tax info)
- Client groups (for pricing tiers, discounts)
- Credit balance / wallet system
- Notes, activity timeline per client
- GDPR-compliant data export/delete

### 3.3 Billing & Invoicing Module

- Recurring billing engine (monthly/quarterly/annual/biennial/triennial cycles)
- Invoice generation (automatic via cron + on-demand)
- Multi-currency support with exchange rate provider integration
- Taxes: configurable tax rules, VAT support, EU VAT MOSS-style handling
- Credit notes and debit notes
- Late fees, payment reminders, dunning sequences
- Proration logic for upgrades/downgrades
- Refunds and partial payments

### 3.4 Payment Gateway Module (Plugin-Based)

- Abstract `PaymentGatewayProvider` interface — each gateway (Paystack, Flutterwave, Stripe, PayPal, Cryptomus, etc.) implemented as a plugin conforming to this interface
- Webhook handler framework with signature verification per gateway
- Support for one-time and recurring/tokenized payments

### 3.5 Products & Services Module

- Product groups, products, pricing per billing cycle and currency
- Configurable options (e.g., RAM/CPU/storage sliders) with price modifiers
- Addons (one-time and recurring)
- Bundles/packages

### 3.6 Provisioning Module (Plugin-Based, the WHMCS-module replacement)

- Abstract `ProvisioningProvider` interface with standardized async methods: `create`, `suspend`, `unsuspend`, `terminate`, `changePackage`, `renew`, `getUsage`, `customAction`
- Every provisioning action runs as a **queued job** (BullMQ) with retries, timeouts, and status tracking — fixes WHMCS's synchronous-timeout problem
- Built-in adapters for: cPanel/WHM, Plesk, Virtualizor, generic REST API (for Webdock-style providers)
- Webhook support for provider-initiated status updates

### 3.7 Domain Management Module (Plugin-Based)

- Abstract `RegistrarProvider` interface: `register`, `renew`, `transfer`, `getWhois`, `updateNameservers`, `getDnsRecords`, `updateDnsRecords`
- AI-assisted domain name suggestions (optional integration point, pluggable)
- Domain expiry automation + renewal reminders

### 3.8 Support Module

- Ticketing system: departments, priorities, SLAs, escalation rules
- Email piping (inbound parsing → ticket creation)
- Canned responses, internal notes
- Knowledgebase with categories and search

### 3.9 Automation & Cron Module

- Centralized job scheduler (replaces WHMCS's single cron.php)
- Jobs: invoice generation, payment reminders, service suspension/termination, domain renewal, currency rate updates, plugin-defined custom cron tasks
- Job dashboard in admin UI showing run history, failures, retries

### 3.10 Notifications Module

- Email templates (with variable substitution), stored in DB and editable via admin UI
- Multi-channel support: email now, SMS/webhook/Slack as future plugin targets
- Template versioning

### 3.11 Reports & Analytics Module

- Revenue reports, MRR/ARR, churn, overdue invoices, product performance
- Exportable (CSV/PDF) reports
- Dashboard widgets feeding the admin frontend

### 3.12 Affiliate & Promotions Module

- Affiliate signup, referral tracking, commission rules, payouts
- Discount codes, promotions, configurable rules engine

### 3.13 Plugin System Module

See **Section 5 — Plugin Architecture & Security** below. This module manages plugin registration, lifecycle, sandboxing, and the permission grants each plugin requires.

---

## 4. Frontend (HOP-Dashboard)

### 4.1 Structure

- `apps/dashboard/app/(admin)/...` — Admin Dashboard routes
- `apps/dashboard/app/(portal)/...` — Client Portal routes
- `apps/dashboard/app/(auth)/...` — Login/register/password reset
- `apps/dashboard/components/ui/` — small, reusable primitives (Button, Card, Modal, Table, Badge, Tabs, Dropdown, Input, Toggle, Avatar, etc.) — each in its own file, fully typed props, no business logic
- `apps/dashboard/components/features/` — feature-specific composed components (InvoiceTable, ServerCard, TicketThread, etc.), built by composing `ui/` primitives
- `apps/dashboard/lib/api/` — typed API client (generated from OpenAPI spec where possible) with one file per module (e.g., `billing.ts`, `clients.ts`)
- `apps/dashboard/lib/theme/` — dark/light theme provider and toggle

### 4.2 Design System Requirements

- Tailwind CSS with a custom design token config (`packages/ui`) shared across admin and portal
- **lucide-react** for all icons — no mixed icon libraries
- Theme toggle (light/dark) persisted via cookie or local preference, applied via Tailwind `dark:` classes and CSS variables for colors
- Fully responsive — mobile-first for the client portal especially
- Accessible (WCAG AA): keyboard navigation, proper ARIA labels, focus states

### 4.3 Admin Dashboard Views

- Overview dashboard (revenue, active services, open tickets, recent signups)
- Clients (list, detail, edit, notes, activity)
- Billing (invoices, transactions, credit notes, recurring profiles)
- Products & Pricing
- Servers/Provisioning (status, jobs, logs per service)
- Domains
- Support (ticket queue, kanban or list view)
- Reports
- Settings (payment gateways, tax rules, email templates, automation jobs, roles & permissions, plugin manager)

### 4.4 Client Portal Views

- Dashboard (active services, invoices due, tickets)
- Services (manage/upgrade/downgrade, usage stats)
- Domains
- Billing (invoices, payment methods, credit balance)
- Support (open ticket, view replies)
- Profile & security settings

---

## 5. Plugin Architecture & Security

Plugins are how third parties extend HOP (payment gateways, provisioning providers, registrars, notification channels, custom admin widgets).

**Design rules:**

- Plugins are separate npm packages implementing a typed interface from `packages/plugin-sdk`
- Each plugin declares a **manifest** (`hop-plugin.json`) listing: name, version, type (payment/provisioning/registrar/notification/widget), required permissions, and config schema (validated with Zod)
- Plugins run with the **minimum permission set they declare** — the core enforces this via a capability-based access layer; a provisioning plugin cannot access billing data unless explicitly granted
- All plugin HTTP calls go through a **mediated client** (no raw `fetch`/`axios` access) so outbound requests can be logged, rate-limited, and domain-restricted
- Plugins are versioned and can be enabled/disabled per-install from the admin UI without redeploying
- Untrusted/community plugins should be runnable in an isolated process (e.g., Node `vm2`/worker thread sandbox or separate microservice) — document this as a configurable "trust level" per plugin
- All plugin actions are written to the audit log
- Provide a plugin signing/verification mechanism for an eventual plugin marketplace

---

## 6. Security Requirements (Platform-Wide)

- All inputs validated via DTOs (`class-validator`)
- Parameterized queries only (Prisma handles this by default — no raw SQL without explicit review)
- Rate limiting on auth and API endpoints (e.g., `@nestjs/throttler`)
- CSRF protection on session-based flows; CORS locked to configured frontend origin(s)
- Secrets via environment variables / secrets manager — never committed
- Password hashing with bcrypt/argon2
- 2FA support for admin accounts (enforced for SuperAdmin)
- Full audit logging of privileged actions (who, what, when, before/after state)
- Webhook signature verification for every payment/provisioning provider
- Dependency scanning (Dependabot/Snyk) in CI
- Regular automated security headers (Helmet) and HTTPS-only cookies

---

## 7. Database & Multi-DB Support

- Default schema designed for PostgreSQL, written in Prisma schema language
- Prisma datasource provider configurable via `.env` (`DATABASE_PROVIDER=postgresql|mysql|sqlite`)
- Avoid Postgres-only features (e.g., certain JSON operators) in core schema unless behind a feature flag, so MySQL/SQLite installs remain functional
- Seed scripts for demo data and initial SuperAdmin setup
- Migration strategy documented for both fresh installs and upgrades from WHMCS (data import tooling for clients, invoices, services, tickets)

---

## 8. Documentation Requirements

Produce full docs under `/docs`, including:

- **Getting Started**: installation, environment setup, Docker quickstart
- **Architecture Overview**: module map, request lifecycle, plugin model
- **API Reference**: auto-generated OpenAPI/Swagger docs, hosted at `/api/docs`
- **Plugin Development Guide**: how to build payment/provisioning/registrar plugins, manifest spec, permission model
- **Admin Guide**: configuring products, billing rules, automation, roles
- **Database Guide**: schema overview, switching DB providers, migrations
- **Deployment Guide**: Docker Compose, environment variables, scaling considerations (horizontal API scaling, queue workers)
- **Contributing Guide**: code style, testing requirements, PR process

---

## 9. Production Readiness Checklist

- Dockerfiles for `api` and `dashboard`, plus `docker-compose.yml` wiring Postgres, Redis, API, and Dashboard
- Health check endpoints (`/health`, `/health/db`, `/health/queue`)
- Structured logging with request IDs for tracing
- Environment-based config validation at boot (fail fast on missing required vars)
- Automated test suite (unit + integration) with CI gate
- Database backup/restore scripts
- Horizontal scalability: stateless API instances behind a load balancer, BullMQ workers scalable independently
- Graceful shutdown handling for in-flight jobs

---

## 10. Build Instructions for Copilot

When generating code:

1. Start by scaffolding the monorepo structure (Section 2), then the NestJS app skeleton with the Prisma schema covering all entities referenced across Sections 3.1–3.13.
2. Build modules in this order: Auth/RBAC → Clients → Products & Billing → Payment Gateway (with one reference plugin, e.g., Paystack) → Provisioning (with one reference plugin, e.g., a generic REST provider) → Domains → Support → Automation/Cron → Notifications → Reports → Affiliates → Plugin System.
3. For each module, generate: Prisma models, DTOs with validation, service with business logic, controller with documented endpoints (Swagger decorators), and unit tests.
4. After the API core is functional, scaffold the Next.js dashboard: design system + theme provider first, then auth flow, then admin views module-by-module mirroring the API, then the client portal.
5. Every UI element must be built as a small, single-responsibility component in `components/ui/` before being composed into feature components — do not write large monolithic page components.
6. Generate documentation files alongside each module as it's built, not as an afterthought.
7. Flag any place where a feature requires a third-party API key or external service, and stub it behind an interface so it can be wired up later without changing core logic.

---

**Project name to use throughout codebase, package names, and docs: `HOP` (Hosting Operations Platform).**
