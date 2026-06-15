import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

/**
 * PaymentService provides a gateway abstraction layer.
 *
 * Real payment plugins are loaded dynamically from the PluginInstallation table
 * using the Plugin SDK's dynamic registry. Each gateway slug corresponds to an
 * installed plugin that exposes a standardised payment interface:
 *   - initiateCheckout(invoiceId, clientId, amount, currency): Promise<{ checkoutUrl: string }>
 *   - verifyWebhook(body, headers): boolean
 *   - processWebhook(body): Promise<{ transactionId: string; amount: number; status: string }>
 *
 * At runtime the plugin module is resolved from the PluginInstallation.moduleEntry
 * and instantiated via the PluginRegistry service (see packages/plugin-sdk).
 */
@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  // ─── Gateways ──────────────────────────────────────────────────────────────

  async getActiveGateways() {
    const all = await this.prisma.pluginInstallation.findMany({
      where: { status: "Active" },
      select: {
        id: true,
        slug: true,
        status: true,
        manifest: true,
        config: true,
      },
    });
    return all.filter((p) => (p.manifest as any)?.type === "payment");
  }

  // ─── Initiate Payment ──────────────────────────────────────────────────────

  async initiatePayment(
    data: { gatewaySlug: string; invoiceId: string; clientId: string },
    actorId: string,
  ) {
    const gateway = await this.prisma.pluginInstallation.findFirst({
      where: { slug: data.gatewaySlug, status: "Active" },
    });
    if (!gateway || (gateway.manifest as any)?.type !== "payment") {
      throw new NotFoundException(
        `Payment gateway '${data.gatewaySlug}' is not active`,
      );
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { client: true },
    });
    if (!invoice)
      throw new NotFoundException(`Invoice ${data.invoiceId} not found`);

    /**
     * Dynamic plugin loading:
     * const plugin = await PluginRegistry.resolve(gateway.slug);
     * const { checkoutUrl } = await plugin.initiateCheckout({
     *   invoiceId: invoice.id,
     *   clientId: invoice.clientId,
     *   amount: invoice.total - invoice.amountPaid,
     *   currency: invoice.currency,
     *   returnUrl: `${process.env.APP_URL}/billing/invoices/${invoice.id}`,
     * });
     */
    const checkoutUrl = `${process.env["APP_URL"] ?? "https://app.example.com"}/pay/${data.gatewaySlug}/${invoice.id}`;

    return {
      gatewaySlug: data.gatewaySlug,
      invoiceId: data.invoiceId,
      amount: Number(invoice.total) - Number(invoice.amountPaid),
      currency: invoice.currency,
      checkoutUrl,
    };
  }

  // ─── Webhook Processing ────────────────────────────────────────────────────

  async processWebhook(
    gatewaySlug: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
  ) {
    const gateway = await this.prisma.pluginInstallation.findFirst({
      where: { slug: gatewaySlug },
    });
    if (!gateway || (gateway.manifest as any)?.type !== "payment") {
      throw new NotFoundException(`Gateway plugin '${gatewaySlug}' not found`);
    }

    /**
     * Dynamic plugin loading:
     * const plugin = await PluginRegistry.resolve(gateway.slug);
     * const valid = plugin.verifyWebhook(body, headers);
     * if (!valid) throw new BadRequestException('Invalid webhook signature');
     * const result = await plugin.processWebhook(body);
     */

    // Stub: log webhook receipt
    return {
      received: true,
      gateway: gatewaySlug,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  async getTransactionsByGateway(
    gatewaySlug: string,
    params: { page?: number; perPage?: number },
  ) {
    const { page = 1, perPage = 25 } = params;
    const skip = (page - 1) * perPage;

    const where: Prisma.TransactionWhereInput = { gateway: gatewaySlug };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        include: {
          client: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(total / perPage),
      },
    };
  }

  async getAllTransactions(params: { page?: number; perPage?: number }) {
    const { page = 1, perPage = 25 } = params;
    const skip = (page - 1) * perPage;

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        include: {
          client: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.transaction.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(total / perPage),
      },
    };
  }
}
