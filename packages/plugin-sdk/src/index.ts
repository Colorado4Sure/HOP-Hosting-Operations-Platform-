import { z } from 'zod';

// ─── Plugin Manifest Schema ───────────────────────────────────────────────────

export const PluginManifestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver'),
  description: z.string().min(1),
  author: z.string().min(1),
  type: z.enum(['payment', 'provisioning', 'registrar', 'notification', 'widget', 'hook']),
  requiredPermissions: z.array(z.string()),
  configSchema: z.record(z.unknown()).optional(),
  hopMinVersion: z.string().optional(),
  webhookEndpoints: z.array(z.string()).optional(),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// ─── Plugin Config Context ────────────────────────────────────────────────────

export interface PluginContext {
  /** Plugin-specific config values (from manifest configSchema) */
  config: Record<string, unknown>;
  /** Logger instance scoped to this plugin */
  logger: PluginLogger;
  /** HTTP client mediated by HOP core (logged, rate-limited) */
  http: PluginHttpClient;
}

export interface PluginLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface PluginHttpClient {
  get<T = unknown>(url: string, options?: PluginHttpOptions): Promise<T>;
  post<T = unknown>(url: string, body: unknown, options?: PluginHttpOptions): Promise<T>;
  put<T = unknown>(url: string, body: unknown, options?: PluginHttpOptions): Promise<T>;
  patch<T = unknown>(url: string, body: unknown, options?: PluginHttpOptions): Promise<T>;
  delete<T = unknown>(url: string, options?: PluginHttpOptions): Promise<T>;
}

export interface PluginHttpOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

// ─── Payment Gateway Interface ────────────────────────────────────────────────

export interface PaymentInitiateParams {
  invoiceId: string;
  amount: number;
  currency: string;
  clientEmail: string;
  clientName: string;
  returnUrl: string;
  webhookUrl: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitiateResult {
  checkoutUrl?: string;
  paymentReference: string;
  status: 'Pending' | 'Redirect';
  metadata?: Record<string, unknown>;
}

export interface PaymentVerifyParams {
  paymentReference: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentVerifyResult {
  status: 'Completed' | 'Failed' | 'Pending';
  gatewayTransactionId?: string;
  amountPaid?: number;
  currency?: string;
  fee?: number;
  metadata?: Record<string, unknown>;
}

export interface WebhookVerifyParams {
  body: string | Buffer;
  headers: Record<string, string>;
  secret: string;
}

export interface PaymentGatewayProvider {
  readonly manifest: PluginManifest;
  initiatePayment(params: PaymentInitiateParams, ctx: PluginContext): Promise<PaymentInitiateResult>;
  verifyPayment(params: PaymentVerifyParams, ctx: PluginContext): Promise<PaymentVerifyResult>;
  verifyWebhookSignature(params: WebhookVerifyParams, ctx: PluginContext): Promise<boolean>;
  processWebhook?(body: unknown, ctx: PluginContext): Promise<PaymentVerifyResult | null>;
}

// ─── Provisioning Provider Interface ─────────────────────────────────────────

export interface ProvisioningServiceConfig {
  hostname: string;
  username: string;
  password: string;
  port?: number;
  useSSL?: boolean;
  [key: string]: unknown;
}

export interface ProvisioningCreateParams {
  clientEmail: string;
  clientFirstName: string;
  clientLastName: string;
  domain?: string;
  username: string;
  password: string;
  packageName: string;
  serverConfig: ProvisioningServiceConfig;
  options?: Record<string, unknown>;
}

export interface ProvisioningResult {
  success: boolean;
  message?: string;
  username?: string;
  password?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

export interface ProvisioningUsage {
  diskUsage?: number;
  diskLimit?: number;
  bandwidthUsage?: number;
  bandwidthLimit?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  [key: string]: unknown;
}

export interface ProvisioningProvider {
  readonly manifest: PluginManifest;
  create(params: ProvisioningCreateParams, ctx: PluginContext): Promise<ProvisioningResult>;
  suspend(serviceId: string, serverConfig: ProvisioningServiceConfig, ctx: PluginContext): Promise<ProvisioningResult>;
  unsuspend(serviceId: string, serverConfig: ProvisioningServiceConfig, ctx: PluginContext): Promise<ProvisioningResult>;
  terminate(serviceId: string, serverConfig: ProvisioningServiceConfig, ctx: PluginContext): Promise<ProvisioningResult>;
  changePackage(serviceId: string, newPackage: string, serverConfig: ProvisioningServiceConfig, ctx: PluginContext): Promise<ProvisioningResult>;
  renew?(serviceId: string, serverConfig: ProvisioningServiceConfig, ctx: PluginContext): Promise<ProvisioningResult>;
  getUsage?(serviceId: string, serverConfig: ProvisioningServiceConfig, ctx: PluginContext): Promise<ProvisioningUsage>;
  customAction?(action: string, serviceId: string, params: Record<string, unknown>, ctx: PluginContext): Promise<ProvisioningResult>;
}

// ─── Domain Registrar Provider Interface ─────────────────────────────────────

export interface RegistrarConfig {
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  sandbox?: boolean;
  [key: string]: unknown;
}

export interface DomainContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  organization?: string;
}

export interface DomainRegistrationParams {
  domain: string;
  years: number;
  nameservers: string[];
  registrant: DomainContactData;
  admin: DomainContactData;
  tech: DomainContactData;
  idProtection?: boolean;
}

export interface DomainRegistrationResult {
  success: boolean;
  domain?: string;
  expiryDate?: string;
  epp?: string;
  message?: string;
}

export interface DnsRecordData {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA';
  name: string;
  content: string;
  ttl?: number;
  priority?: number;
}

export interface RegistrarProvider {
  readonly manifest: PluginManifest;
  checkAvailability(domain: string, config: RegistrarConfig, ctx: PluginContext): Promise<{ available: boolean; price?: number }>;
  register(params: DomainRegistrationParams, config: RegistrarConfig, ctx: PluginContext): Promise<DomainRegistrationResult>;
  renew(domain: string, years: number, config: RegistrarConfig, ctx: PluginContext): Promise<DomainRegistrationResult>;
  transfer(domain: string, epp: string, config: RegistrarConfig, ctx: PluginContext): Promise<DomainRegistrationResult>;
  getWhois(domain: string, config: RegistrarConfig, ctx: PluginContext): Promise<string>;
  updateNameservers(domain: string, nameservers: string[], config: RegistrarConfig, ctx: PluginContext): Promise<boolean>;
  getDnsRecords(domain: string, config: RegistrarConfig, ctx: PluginContext): Promise<DnsRecordData[]>;
  updateDnsRecords(domain: string, records: DnsRecordData[], config: RegistrarConfig, ctx: PluginContext): Promise<boolean>;
  getEppCode?(domain: string, config: RegistrarConfig, ctx: PluginContext): Promise<string>;
}

// ─── Base Plugin Class (optional inheritance) ─────────────────────────────────

export abstract class BasePlugin {
  abstract readonly manifest: PluginManifest;

  validateConfig(_config: unknown): boolean {
    const schema = this.manifest.configSchema;
    if (!schema) return true;
    // Config validation should be implemented by the core with the declared Zod schema
    return true;
  }
}
