import type { UUID, ISODateString } from './common.types';

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type DomainStatus =
  | 'Active'
  | 'Expired'
  | 'Transferred'
  | 'Cancelled'
  | 'Pending'
  | 'PendingTransfer'
  | 'Locked'
  | 'GracePeriod'
  | 'RedemptionPeriod';

export interface DomainNameserver {
  hostname: string;
  ip?: string;
}

export interface DomainContact {
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

export interface DnsRecord {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA';
  name: string;
  content: string;
  ttl: number;
  priority?: number;
}

export interface Domain {
  id: UUID;
  clientId: UUID;
  domain: string;
  tld: string;
  status: DomainStatus;
  registrar: string;
  registrationDate: ISODateString;
  expiryDate: ISODateString;
  renewalDate?: ISODateString;
  autoRenew: boolean;
  idProtection: boolean;
  nameservers: DomainNameserver[];
  registrantContact?: DomainContact;
  adminContact?: DomainContact;
  techContact?: DomainContact;
  epp?: string;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface TldPricing {
  tld: string;
  registrar: string;
  registerPrice: number;
  renewPrice: number;
  transferPrice: number;
  currency: string;
}
