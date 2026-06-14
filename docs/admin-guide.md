# Admin Guide

## Overview

This guide covers day-to-day administration of the HOP platform.

---

## Initial Setup Checklist

After installation, complete these steps before going live:

- [ ] Change the default admin password
- [ ] Set company name and contact email (Settings → General)
- [ ] Configure SMTP for outgoing email (Settings → Email)
- [ ] Install and configure a payment gateway plugin
- [ ] Create at least one product group and product
- [ ] Review and configure tax rules (Settings → Tax Rules)
- [ ] Set invoice prefix, due days, and grace period (Settings → Billing)
- [ ] Configure support departments and SLA hours
- [ ] Review automation job schedules
- [ ] Create additional staff roles/accounts as needed

---

## Client Management

### Creating a Client

1. Go to **Clients** → **New Client**
2. Fill in personal/company details, email, and primary address
3. Select a currency and language (defaults from Settings)
4. Optionally assign a **Client Group** (for tiered pricing/discounts)
5. Click **Create Client**

### Client Groups

Client Groups allow you to apply pricing discounts to entire groups:

- **Settings → Client Groups → New Group**
- Set a `discountPercent` — this automatically discounts all products for group members
- Clients can be reassigned between groups freely

### Credit Balance

Clients can hold a credit balance (wallet):

- **Clients → [Client] → Credit Balance → Add Credit** — add a manual credit
- Credits are automatically applied when generating invoices (if configured)
- Credit notes from refunds are tracked separately

### GDPR Data Export/Delete

- **Clients → [Client] → Actions → Export Data** — generates a JSON export of all client data
- **Clients → [Client] → Actions → Delete Account** — soft-deletes the client and anonymizes personal data

---

## Billing & Invoicing

### Invoice Generation

**Automatic:** The `generate-invoices` automation job runs daily and creates invoices for services due within the configured period.

**Manual:** Clients → [Client] → Invoices → **Create Invoice**

### Billing Lifecycle

```
Service Created → Invoice Generated → Invoice Sent → Payment Due
                                                          │
                        ┌─────────────────────────────────┤
                        │                                 │
                   [Paid] ✅                    [Overdue after due date]
                                                          │
                                           [Reminder email sent]
                                                          │
                                           [Grace period expires]
                                                          │
                                           [Service suspended]
                                                          │
                                           [Termination period expires]
                                                          │
                                           [Service terminated]
```

### Key Billing Settings

| Setting             | Default | Description                                   |
| ------------------- | ------- | --------------------------------------------- |
| `invoice_due_days`  | `14`    | Days after creation before invoice is overdue |
| `grace_period_days` | `3`     | Days after due date before suspension         |
| `suspension_days`   | `7`     | Days after suspension before termination      |
| `invoice_prefix`    | `INV-`  | Invoice number prefix                         |

Configure at **Settings → Billing**.

### Multi-Currency

- Each client has a default currency set on their profile
- Product pricing can be set per currency and billing cycle
- Exchange rates are updated daily by the `update-exchange-rates` automation job (requires an exchange rate API key)

### Refunds & Credit Notes

- **Transactions → [Transaction] → Issue Refund** — creates a refund transaction and optional credit note
- Credit notes can be applied to future invoices automatically or manually

---

## Products & Pricing

### Product Groups

Organize products into groups for the client-facing order form:

- **Products → Groups → New Group**
- Set `isVisible: false` to hide a group from the order form (admin-only)

### Product Types

| Type        | Use Case                           |
| ----------- | ---------------------------------- |
| `Shared`    | Shared hosting plans               |
| `Reseller`  | Reseller hosting                   |
| `VPS`       | Virtual private servers            |
| `Dedicated` | Dedicated servers                  |
| `Other`     | Software licenses, custom services |

### Billing Cycles & Pricing

Each product can have multiple pricing rows:

- One per billing cycle (Monthly, Quarterly, Annually, etc.)
- One per currency
- Each row has a `price` and a `setupFee`

### Configurable Options

Add options clients can choose when ordering (e.g., RAM, storage, location):

- Types: `Dropdown`, `Radio`, `Checkbox`, `Quantity`, `Text`
- Each option value has a `priceModifier` (added to base price)

### Stock Control

Enable `stockEnabled` on a product to limit the number of orders. When `stockLevel` reaches 0, new orders are blocked.

---

## Support

### Departments

Create departments for routing tickets:

- **Settings → Departments → New Department**
- Set `slaHours` to define response time targets
- Set `email` to receive tickets via email piping (configure MX records to pipe to `/api/v1/support/inbound`)

### Ticket Workflow

| Status          | Meaning                               |
| --------------- | ------------------------------------- |
| `Open`          | New ticket, waiting for staff         |
| `Answered`      | Staff replied                         |
| `CustomerReply` | Client replied, needs staff attention |
| `OnHold`        | Waiting on third party                |
| `Closed`        | Resolved                              |

### Canned Responses

Pre-written responses for common questions:

- **Support → Canned Responses → New Response**
- Optionally scope to a specific department
- Available in the reply editor via the canned response picker

### Knowledgebase

- **Support → Knowledgebase → New Article**
- Organize articles into categories and sub-categories
- Published articles are visible to clients in the portal
- Tracks `helpful` / `not helpful` votes

---

## Automation Jobs

All jobs run on the configured cron schedule. Job history is logged in **Automation**.

| Job                       | Default Schedule | Description                              |
| ------------------------- | ---------------- | ---------------------------------------- |
| `generate-invoices`       | Daily 9am        | Create invoices for services due soon    |
| `payment-reminders`       | Daily 10am       | Send reminder emails for unpaid invoices |
| `suspend-overdue`         | Daily 2am        | Suspend services past grace period       |
| `domain-expiry`           | Daily 8am        | Send domain expiry reminders             |
| `exchange-rates`          | Daily midnight   | Update currency exchange rates           |
| `prune-notification-logs` | 1st of month     | Delete old notification logs             |

**To run a job immediately:** Automation → [Job] → **Run Now**

**To disable a job:** Automation → [Job] → **Disable**

---

## Settings Reference

### General

- Company name, address, email, phone
- Default language and timezone

### Billing

- Invoice prefix, due days, grace period, suspension/termination timings
- Default currency
- Late fee configuration

### Email

- SMTP server credentials
- Email templates (editable per template, with variable substitution)
- Test email sender

### Tax Rules

- Create tax rules by country/state
- Compound tax support
- EU VAT configuration

### Roles & Permissions

- Create custom staff roles
- Assign any combination of resource:action permissions
- System roles (SuperAdmin, Admin, etc.) cannot be deleted

### Plugin Manager

- Install, configure, enable, and disable plugins
- Set trust level per plugin (trusted/sandboxed)
- View plugin errors and logs

---

## Security Best Practices

- Enforce 2FA for all admin accounts (Settings → Security → Require 2FA for Admins)
- Use strong, unique passwords — minimum 12 characters
- Rotate `JWT_SECRET` periodically (requires all users to re-login)
- Review the **Audit Log** (Settings → Audit Log) regularly for suspicious activity
- Restrict API access to known IPs using Nginx/firewall rules if possible
- Keep HOP updated — pull latest releases and run migrations

---

## Audit Log

Every privileged action is recorded in the audit log with:

- **Who** performed the action (user + IP + user agent)
- **What** was done (action name + resource)
- **Before/after** state snapshots for updates

Access: **Settings → Audit Log**

Audit logs are retained indefinitely by default. Configure the `prune-audit-logs` automation job to archive old entries.
