# Plugin Development Guide

HOP's plugin system lets third parties extend the platform with custom payment gateways, provisioning modules, domain registrars, notification channels, and more — without modifying HOP core.

---

## Plugin Types

| Type           | Interface                | Description                               |
| -------------- | ------------------------ | ----------------------------------------- |
| `payment`      | `PaymentGatewayProvider` | Process payments and handle webhooks      |
| `provisioning` | `ProvisioningProvider`   | Create/suspend/terminate hosting accounts |
| `registrar`    | `RegistrarProvider`      | Register, renew, transfer domains         |
| `notification` | _(coming soon)_          | Custom notification channels              |
| `widget`       | _(coming soon)_          | Custom admin dashboard widgets            |
| `hook`         | _(coming soon)_          | React to platform lifecycle events        |

---

## Getting Started

### 1. Install the SDK

```bash
pnpm add @hop/plugin-sdk
```

### 2. Create your plugin package

```
my-payment-plugin/
├── src/
│   └── index.ts       # Plugin entry point
├── hop-plugin.json    # Plugin manifest
├── package.json
└── tsconfig.json
```

---

## Plugin Manifest (`hop-plugin.json`)

Every plugin must include a manifest file:

```json
{
  "name": "My Payment Gateway",
  "slug": "my-payment-gateway",
  "version": "1.0.0",
  "description": "Accept payments via My Payment Gateway",
  "author": "Your Name",
  "type": "payment",
  "requiredPermissions": [],
  "hopMinVersion": "1.0.0",
  "webhookEndpoints": ["/api/v1/payment/webhook/my-payment-gateway"],
  "configSchema": {
    "apiKey": { "type": "string", "label": "API Key", "secret": true },
    "secretKey": { "type": "string", "label": "Secret Key", "secret": true },
    "sandbox": {
      "type": "boolean",
      "label": "Use Sandbox Mode",
      "default": false
    }
  }
}
```

### Manifest Fields

| Field                 | Required | Description                                 |
| --------------------- | -------- | ------------------------------------------- |
| `name`                | ✅       | Human-readable plugin name                  |
| `slug`                | ✅       | Unique identifier (lowercase, hyphens only) |
| `version`             | ✅       | Semver version string                       |
| `description`         | ✅       | Short description                           |
| `author`              | ✅       | Author name or organization                 |
| `type`                | ✅       | Plugin type (see table above)               |
| `requiredPermissions` | ✅       | Array of HOP permissions the plugin needs   |
| `hopMinVersion`       | —        | Minimum compatible HOP version              |
| `webhookEndpoints`    | —        | Webhook URL paths the plugin registers      |
| `configSchema`        | —        | Config schema for admin UI form generation  |

---

## Building a Payment Gateway Plugin

```typescript
import {
  PaymentGatewayProvider,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
  WebhookVerifyParams,
  PluginContext,
  PluginManifest,
} from "@hop/plugin-sdk";
import manifest from "../hop-plugin.json";

export class MyPaymentPlugin implements PaymentGatewayProvider {
  readonly manifest: PluginManifest = manifest as PluginManifest;

  async initiatePayment(
    params: PaymentInitiateParams,
    ctx: PluginContext,
  ): Promise<PaymentInitiateResult> {
    const { apiKey } = ctx.config as { apiKey: string };

    ctx.logger.info("Initiating payment", { invoiceId: params.invoiceId });

    // Use the mediated HTTP client — do NOT use fetch/axios directly
    const response = await ctx.http.post<{
      checkout_url: string;
      reference: string;
    }>(
      "https://api.mypaymentgateway.com/transaction/initialize",
      {
        email: params.clientEmail,
        amount: Math.round(params.amount * 100), // Convert to kobo/cents
        currency: params.currency,
        reference: `HOP-${params.invoiceId}-${Date.now()}`,
        callback_url: params.returnUrl,
        metadata: { invoiceId: params.invoiceId },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    return {
      checkoutUrl: response.checkout_url,
      paymentReference: response.reference,
      status: "Redirect",
    };
  }

  async verifyPayment(
    params: PaymentVerifyParams,
    ctx: PluginContext,
  ): Promise<PaymentVerifyResult> {
    const { apiKey } = ctx.config as { apiKey: string };

    const response = await ctx.http.get<{
      status: string;
      data: {
        status: string;
        amount: number;
        currency: string;
        id: string;
        fees: number;
      };
    }>(
      `https://api.mypaymentgateway.com/transaction/verify/${params.paymentReference}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    const tx = response.data;
    return {
      status:
        tx.status === "success"
          ? "Completed"
          : tx.status === "pending"
            ? "Pending"
            : "Failed",
      gatewayTransactionId: String(tx.id),
      amountPaid: tx.amount / 100,
      currency: tx.currency,
      fee: tx.fees / 100,
    };
  }

  async verifyWebhookSignature(
    params: WebhookVerifyParams,
    ctx: PluginContext,
  ): Promise<boolean> {
    const { secretKey } = ctx.config as { secretKey: string };
    const hash = require("crypto")
      .createHmac("sha512", secretKey)
      .update(params.body)
      .digest("hex");
    return hash === params.headers["x-my-gateway-signature"];
  }
}

export default MyPaymentPlugin;
```

---

## Building a Provisioning Plugin

```typescript
import {
  ProvisioningProvider,
  ProvisioningCreateParams,
  ProvisioningResult,
  ProvisioningServiceConfig,
  PluginContext,
  PluginManifest,
} from "@hop/plugin-sdk";

export class MyProvisioningPlugin implements ProvisioningProvider {
  readonly manifest: PluginManifest = {
    /* ... */
  } as PluginManifest;

  async create(
    params: ProvisioningCreateParams,
    ctx: PluginContext,
  ): Promise<ProvisioningResult> {
    try {
      await ctx.http.post(
        `https://${params.serverConfig.hostname}/api/create-account`,
        {
          username: params.username,
          password: params.password,
          domain: params.domain,
          package: params.packageName,
        },
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${params.serverConfig.username}:${params.serverConfig.password}`).toString("base64")}`,
          },
        },
      );
      return { success: true, username: params.username };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  async suspend(
    serviceId: string,
    config: ProvisioningServiceConfig,
    ctx: PluginContext,
  ): Promise<ProvisioningResult> {
    // implementation
    return { success: true };
  }

  async unsuspend(
    serviceId: string,
    config: ProvisioningServiceConfig,
    ctx: PluginContext,
  ): Promise<ProvisioningResult> {
    return { success: true };
  }

  async terminate(
    serviceId: string,
    config: ProvisioningServiceConfig,
    ctx: PluginContext,
  ): Promise<ProvisioningResult> {
    return { success: true };
  }

  async changePackage(
    serviceId: string,
    newPackage: string,
    config: ProvisioningServiceConfig,
    ctx: PluginContext,
  ): Promise<ProvisioningResult> {
    return { success: true };
  }
}
```

---

## Security Rules

| Rule                    | Detail                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| **No raw HTTP**         | All outbound requests must use `ctx.http` — enables logging, rate limiting, and domain allowlisting |
| **Minimum permissions** | Only declare permissions you actually use in `requiredPermissions`                                  |
| **No secrets in code**  | Store secrets in `configSchema` (marked `secret: true`) — they're encrypted at rest                 |
| **Trust levels**        | `trusted` = runs in-process; `sandboxed` = isolated worker (default)                                |
| **Audit trail**         | All plugin actions are automatically written to the audit log                                       |

---

## Installing a Plugin

Via the admin UI: **Settings → Plugin Manager → Install Plugin**

Via the API:

```http
POST /api/v1/plugins/install
Authorization: Bearer <token>
Content-Type: application/json

{
  "slug": "my-payment-gateway",
  "trustLevel": "sandboxed"
}
```

---

## Plugin Lifecycle

```
Install → Configure → Enable → Active
              ↓
          Disable → Inactive
              ↓
          Uninstall → Removed
```

- Config changes take effect immediately
- Disabling a plugin stops it from receiving new requests; in-flight jobs complete
- Uninstalling removes the installation record but does not purge historical transaction/log data

---

## Reference Implementations

See the built-in Paystack plugin at `apps/api/src/modules/payment/plugins/paystack/` for a complete reference implementation.
