import * as crypto from 'crypto';
import type {
  PaymentGatewayProvider,
  PluginManifest,
  PluginContext,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
  WebhookVerifyParams,
} from '@hop/plugin-sdk';

export class PaystackPlugin implements PaymentGatewayProvider {
  readonly manifest: PluginManifest = {
    name: 'Paystack',
    slug: 'paystack',
    version: '1.0.0',
    description: 'Accept payments via Paystack',
    author: 'HOP Team',
    type: 'payment',
    requiredPermissions: ['invoices:pay'],
    configSchema: {
      secretKey: { type: 'string', required: true },
      publicKey: { type: 'string', required: true },
    },
    webhookEndpoints: ['/api/v1/payment/webhook/paystack'],
  };

  async initiatePayment(
    params: PaymentInitiateParams,
    ctx: PluginContext,
  ): Promise<PaymentInitiateResult> {
    const secretKey = ctx.config['secretKey'] as string;

    // Convert amount to kobo/smallest unit (Paystack expects smallest unit)
    const amountInSmallest = Math.round(params.amount * 100);

    const reference = `HOP-${params.invoiceId}-${Date.now()}`;

    const response = await ctx.http.post<{
      status: boolean;
      data: { authorization_url: string; reference: string };
    }>(
      'https://api.paystack.co/transaction/initialize',
      {
        email: params.clientEmail,
        amount: amountInSmallest,
        currency: params.currency,
        reference,
        callback_url: params.returnUrl,
        metadata: {
          invoiceId: params.invoiceId,
          clientName: params.clientName,
          ...params.metadata,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    ctx.logger.info('Paystack payment initiated', { reference, invoiceId: params.invoiceId });

    return {
      checkoutUrl: response.data.authorization_url,
      paymentReference: response.data.reference,
      status: 'Redirect',
    };
  }

  async verifyPayment(
    params: PaymentVerifyParams,
    ctx: PluginContext,
  ): Promise<PaymentVerifyResult> {
    const secretKey = ctx.config['secretKey'] as string;

    const response = await ctx.http.get<{
      status: boolean;
      data: {
        status: string;
        amount: number;
        currency: string;
        fees: number;
        reference: string;
        id: string;
      };
    }>(`https://api.paystack.co/transaction/verify/${params.paymentReference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const data = response.data;
    const status = data.status === 'success' ? 'Completed' : data.status === 'pending' ? 'Pending' : 'Failed';

    return {
      status,
      gatewayTransactionId: String(data.id),
      amountPaid: data.amount / 100,
      currency: data.currency,
      fee: data.fees / 100,
    };
  }

  async verifyWebhookSignature(
    params: WebhookVerifyParams,
    _ctx: PluginContext,
  ): Promise<boolean> {
    const signature = params.headers['x-paystack-signature'];
    if (!signature) return false;

    const hash = crypto
      .createHmac('sha512', params.secret)
      .update(typeof params.body === 'string' ? params.body : params.body.toString())
      .digest('hex');

    return hash === signature;
  }

  async processWebhook(
    body: unknown,
    ctx: PluginContext,
  ): Promise<PaymentVerifyResult | null> {
    const event = body as { event: string; data: { reference: string; status: string; amount: number; currency: string; fees: number; id: string } };

    ctx.logger.info('Paystack webhook received', { event: event.event });

    if (event.event !== 'charge.success') return null;

    return {
      status: 'Completed',
      gatewayTransactionId: String(event.data.id),
      amountPaid: event.data.amount / 100,
      currency: event.data.currency,
      fee: (event.data.fees ?? 0) / 100,
      metadata: { reference: event.data.reference },
    };
  }
}

export default new PaystackPlugin();
