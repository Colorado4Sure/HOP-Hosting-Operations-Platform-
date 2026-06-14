import type { UUID, ISODateString } from './common.types';

// ─── Provisioning / Server Module Types ──────────────────────────────────────

export type ProvisioningJobStatus =
  | 'Pending'
  | 'Processing'
  | 'Completed'
  | 'Failed'
  | 'Retrying'
  | 'Cancelled';

export type ProvisioningAction =
  | 'Create'
  | 'Suspend'
  | 'Unsuspend'
  | 'Terminate'
  | 'ChangePackage'
  | 'Renew'
  | 'GetUsage'
  | 'CustomAction';

export interface Server {
  id: UUID;
  name: string;
  hostname: string;
  ipAddress: string;
  type: string;
  moduleType: string;
  moduleSettings?: Record<string, unknown>;
  maxAccounts: number;
  currentAccounts: number;
  isActive: boolean;
  diskUsagePercent?: number;
  loadAverage?: number;
  lastCheckedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ProvisioningJob {
  id: UUID;
  serviceId: UUID;
  serverId?: UUID;
  action: ProvisioningAction;
  status: ProvisioningJobStatus;
  attempts: number;
  maxAttempts: number;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
  scheduledAt?: ISODateString;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
  createdAt: ISODateString;
}

export interface ServiceUsage {
  serviceId: UUID;
  diskUsage?: number;
  diskLimit?: number;
  bandwidthUsage?: number;
  bandwidthLimit?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  inodeUsage?: number;
  inodeLimit?: number;
  retrievedAt: ISODateString;
}
