# API Reference

The HOP API is a versioned REST API built with NestJS and documented with OpenAPI (Swagger).

## Interactive Docs

When running in development mode, full interactive API documentation is available at:

```
http://localhost:3001/api/docs
```

The Swagger UI allows you to:

- Browse all endpoints grouped by module
- View request/response schemas
- Execute requests directly from the browser (using the Authorize button with a JWT token)

## Base URL

```
http://localhost:3001/api/v1        # Local
https://api.yourdomain.com/api/v1   # Production
```

## Authentication

All protected endpoints require a JWT Bearer token:

```http
Authorization: Bearer <accessToken>
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@hop.local",
  "password": "HopAdmin123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "SuperAdmin" },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 900
    }
  }
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJ..." }
```

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "refreshToken": "eyJ..." }
```

---

## Response Envelope

All successful responses are wrapped:

```json
{
  "success": true,
  "data": { ... },
  "requestId": "uuid"
}
```

All list endpoints return paginated responses:

```json
{
  "success": true,
  "data": {
    "data": [ ... ],
    "meta": {
      "total": 100,
      "page": 1,
      "perPage": 20,
      "totalPages": 5,
      "hasPreviousPage": false,
      "hasNextPage": true
    }
  }
}
```

## Error Responses

```json
{
  "success": false,
  "statusCode": 422,
  "message": ["email must be an email"],
  "error": "Unprocessable Entity",
  "timestamp": "2026-06-14T12:00:00.000Z",
  "path": "/api/v1/clients",
  "requestId": "uuid"
}
```

---

## Module Endpoints Summary

| Module         | Base Path          | Key Endpoints                                               |
| -------------- | ------------------ | ----------------------------------------------------------- |
| Auth           | `/auth`            | login, logout, refresh, register, password-reset, 2fa       |
| Clients        | `/clients`         | CRUD, notes, activity, contacts, addresses, credit          |
| Billing        | `/invoices`        | CRUD, pay, send, credit-notes                               |
| Transactions   | `/transactions`    | list, get                                                   |
| Products       | `/products`        | CRUD, pricing, configurable-options                         |
| Services       | `/services`        | CRUD, suspend, unsuspend, terminate, cancel, change-package |
| Payment        | `/payment`         | initiate, verify, webhook                                   |
| Provisioning   | `/provisioning`    | servers CRUD, jobs list/retry                               |
| Domains        | `/domains`         | register, transfer, renew, DNS, nameservers                 |
| Support        | `/support/tickets` | CRUD, reply, close, assign                                  |
| Knowledgebase  | `/support/kb`      | categories, articles                                        |
| Notifications  | `/notifications`   | logs, templates                                             |
| Reports        | `/reports`         | summary, mrr, revenue, overdue                              |
| Affiliates     | `/affiliates`      | CRUD, referrals, payout                                     |
| Discount Codes | `/discount-codes`  | CRUD, validate                                              |
| Plugins        | `/plugins`         | list, install, enable, disable, configure                   |
| Automation     | `/automation/jobs` | list, run, toggle, logs                                     |
| Settings       | `/settings`        | get, update, tax-rules, roles                               |
| Health         | `/health`          | overall, db, queue                                          |

---

## Query Parameters (Lists)

All list endpoints accept:

| Parameter   | Type        | Description                            |
| ----------- | ----------- | -------------------------------------- |
| `page`      | `number`    | Page number (default: 1)               |
| `perPage`   | `number`    | Items per page (default: 20, max: 100) |
| `search`    | `string`    | Full-text search                       |
| `sortBy`    | `string`    | Field to sort by                       |
| `sortOrder` | `asc\|desc` | Sort direction                         |

---

## Rate Limiting

| Limit        | Window     |
| ------------ | ---------- |
| 100 requests | 60 seconds |

Auth endpoints have stricter limits:
| Limit | Window |
|-------|--------|
| 10 requests | 60 seconds |

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1718362800
```

Exceeded: HTTP `429 Too Many Requests`

---

## Webhook Verification

All payment webhook endpoints verify the signature before processing. Each gateway plugin implements its own signature verification method using `ctx.http` (mediated) and the configured secret.

Example Paystack webhook:

```http
POST /api/v1/payment/webhook/paystack
X-Paystack-Signature: sha512_hash_of_body

{ "event": "charge.success", "data": { ... } }
```
