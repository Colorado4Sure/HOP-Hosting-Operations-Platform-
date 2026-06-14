import type { UUID, ISODateString } from './common.types';

// ─── Affiliate & Promotions Types ────────────────────────────────────────────

export type AffiliateStatus = 'Pending' | 'Active' | 'Suspended' | 'Closed';

export interface Affiliate {
  id: UUID;
  clientId: UUID;
  code: string;
  status: AffiliateStatus;
  commissionType: 'Flat' | 'Percentage';
  commissionValue: number;
  balance: number;
  totalEarned: number;
  totalPaid: number;
  referralCount: number;
  payoutThreshold: number;
  payoutMethod?: string;
  payoutDetails?: Record<string, unknown>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Referral {
  id: UUID;
  affiliateId: UUID;
  clientId: UUID;
  commissionAmount: number;
  status: 'Pending' | 'Approved' | 'Paid' | 'Cancelled';
  invoiceId?: UUID;
  paidAt?: ISODateString;
  createdAt: ISODateString;
}

export interface DiscountCode {
  id: UUID;
  code: string;
  description?: string;
  type: 'Percentage' | 'Fixed';
  value: number;
  currency?: string;
  usageLimit?: number;
  usedCount: number;
  startsAt?: ISODateString;
  expiresAt?: ISODateString;
  appliesTo: 'All' | 'Products' | 'Domains';
  productIds?: UUID[];
  isActive: boolean;
  createdAt: ISODateString;
}
