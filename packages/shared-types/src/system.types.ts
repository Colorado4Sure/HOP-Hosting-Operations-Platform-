import type { UUID, ISODateString } from './common.types';

// ─── Plugin System Types ──────────────────────────────────────────────────────

export type PluginType =
  | 'payment'
  | 'provisioning'
  | 'registrar'
  | 'notification'
  | 'widget'
  | 'hook';

export type PluginTrustLevel = 'trusted' | 'sandboxed';

export type PluginStatus = 'Active' | 'Inactive' | 'Error' | 'UpdateAvailable';

export interface PluginManifest {
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  type: PluginType;
  requiredPermissions: string[];
  configSchema?: Record<string, unknown>; // Zod schema shape
  hopMinVersion?: string;
  webhookEndpoints?: string[];
}

export interface PluginInstallation {
  id: UUID;
  slug: string;
  manifest: PluginManifest;
  status: PluginStatus;
  trustLevel: PluginTrustLevel;
  config?: Record<string, unknown>;
  errorMessage?: string;
  installedAt: ISODateString;
  updatedAt: ISODateString;
}

// ─── Audit Log Types ──────────────────────────────────────────────────────────

export interface AuditLog {
  id: UUID;
  userId?: UUID;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: ISODateString;
}

// ─── Automation / Cron Types ──────────────────────────────────────────────────

export type JobStatus = 'Idle' | 'Running' | 'Success' | 'Failed' | 'Skipped';

export interface AutomationJob {
  id: UUID;
  name: string;
  slug: string;
  description?: string;
  schedule: string; // cron expression
  isEnabled: boolean;
  lastRunAt?: ISODateString;
  lastRunStatus?: JobStatus;
  lastRunDurationMs?: number;
  nextRunAt?: ISODateString;
  errorMessage?: string;
}

export interface JobRunLog {
  id: UUID;
  jobSlug: string;
  status: JobStatus;
  startedAt: ISODateString;
  completedAt?: ISODateString;
  durationMs?: number;
  output?: string;
  errorMessage?: string;
}
