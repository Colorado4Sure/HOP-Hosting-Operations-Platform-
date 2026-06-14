# Contributing Guide

Thank you for contributing to HOP! This document covers the development workflow, code standards, and PR process.

---

## Development Setup

Follow the [Getting Started guide](./getting-started.md) to set up your local environment.

---

## Code Style

### TypeScript

- **Strict mode enabled** — `"strict": true` in all tsconfigs
- No `any` unless unavoidable (use `unknown` and narrow)
- No `@ts-ignore` without an explanation comment
- Prefer `interface` over `type` for object shapes; use `type` for unions/aliases
- All exported functions and classes must have JSDoc summaries

### Naming Conventions

| Item                | Convention             | Example              |
| ------------------- | ---------------------- | -------------------- |
| Files               | `kebab-case`           | `billing.service.ts` |
| Classes             | `PascalCase`           | `BillingService`     |
| Functions/variables | `camelCase`            | `createInvoice`      |
| Constants           | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |
| DB columns (Prisma) | `camelCase`            | `createdAt`          |
| API routes          | `kebab-case`           | `/credit-notes`      |
| Enums               | `PascalCase` values    | `InvoiceStatus.Paid` |

### NestJS Module Rules

Every module must have:

- `module.ts` — `@Module()` with imports, providers, controllers, exports
- `service.ts` — business logic only (no direct HTTP concerns)
- `controller.ts` — HTTP layer with Swagger decorators, delegates to service
- `dto/` — class-validator DTOs for every request body
- `*.spec.ts` — unit tests covering service methods

**Do not:**

- Put business logic in controllers
- Access Prisma directly from controllers
- Import one feature module into another (use shared services via exports)

### Frontend Rules

- Every UI primitive must live in `components/ui/` as its own file
- Feature components in `components/features/` compose UI primitives only
- No inline styles — all styling via Tailwind utility classes
- All icons via `lucide-react` only
- Pages must be small — delegate to feature components
- Forms use `react-hook-form` + `zod` validation

---

## Git Workflow

### Branch Names

```
feat/short-description         # New feature
fix/short-description          # Bug fix
docs/short-description         # Documentation
chore/short-description        # Refactoring, dependencies
test/short-description         # Tests
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(billing): add proration logic for upgrades
fix(auth): prevent refresh token reuse after logout
docs(api): add webhook endpoint documentation
chore(deps): update prisma to 5.12.0
test(clients): add unit tests for credit balance
```

Types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `perf`, `ci`

---

## Testing Requirements

### Unit Tests

Each NestJS service must have unit tests covering:

- Happy path for every public method
- Error cases (not found, validation failures, external service errors)
- Permission checks

Use `@nestjs/testing` with mocked dependencies:

```typescript
describe("BillingService", () => {
  let service: BillingService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();
    service = module.get(BillingService);
    prisma = module.get(PrismaService);
  });

  it("should generate invoice number with prefix", async () => {
    prisma.setting.findUnique.mockResolvedValue({ value: "INV-" } as any);
    prisma.invoice.count.mockResolvedValue(42);
    expect(await service.generateInvoiceNumber()).toBe("INV-00043");
  });
});
```

### Integration Tests (E2E)

E2E tests use Supertest against a real test database:

```typescript
describe("POST /api/v1/auth/login", () => {
  it("returns tokens for valid credentials", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "admin@hop.local", password: "HopAdmin123!" })
      .expect(200);
    expect(res.body.data.tokens.accessToken).toBeDefined();
  });
});
```

### Coverage Requirements

- Minimum **70% line coverage** for all service files
- CI blocks merges if coverage drops below threshold

```bash
pnpm --filter @hop/api test:cov
```

---

## Pull Request Process

1. **Open an issue first** for non-trivial changes — discuss approach before implementing
2. **Branch off `develop`** (not `main`)
3. Write code + tests
4. Run locally:
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   ```
5. Open a PR against `develop` with:
   - **Description** of what changed and why
   - **Testing notes** — how to test the change
   - **Breaking changes** if any (bump version accordingly)
   - **Screenshots** for UI changes
6. At least **one approval** required before merge
7. CI must pass (lint, type-check, unit tests, E2E tests, build)
8. **Squash-merge** into `develop` with a conventional commit message
9. `main` is updated via release PRs from `develop`

---

## Adding a New Module

When adding a new NestJS module:

1. Create the folder: `apps/api/src/modules/<name>/`
2. Generate files following the standard structure:
   ```
   <name>.module.ts
   <name>.controller.ts
   <name>.service.ts
   dto/
   <name>.controller.spec.ts
   ```
3. Add the module to `AppModule` imports in `app.module.ts`
4. Add shared types to `packages/shared-types/src/<name>.types.ts`
5. Export from `packages/shared-types/src/index.ts`
6. Add API client file in `apps/dashboard/src/lib/api/<name>.ts`
7. Write documentation in `docs/`

---

## Security

- **Never commit secrets** — use `.env` (gitignored) or GitHub Secrets
- Report security vulnerabilities via email to `security@yourdomain.com` — **do not open public issues**
- All input must be validated via class-validator DTOs before reaching services
- All DB queries go through Prisma (parameterized) — never string-concatenate SQL
- New endpoints must be protected with `@UseGuards(JwtAuthGuard)` + appropriate `@Permissions()`

---

## Releases

HOP uses [semantic versioning](https://semver.org/):

- `MAJOR` — breaking API or schema changes
- `MINOR` — new features, backward-compatible
- `PATCH` — bug fixes

Releases are tagged: `v1.2.3`

The Docker images are tagged with both the version and `latest`:

- `ghcr.io/yourorg/hop-api:1.2.3`
- `ghcr.io/yourorg/hop-api:latest`
