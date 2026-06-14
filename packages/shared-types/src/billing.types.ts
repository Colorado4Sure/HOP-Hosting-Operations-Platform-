import type { UUID, ISODateString, CurrencyCode, MoneyAmount } from './common.types';

// ─── Billing & Invoice Types ──────────────────────────────────────────────────

export type BillingCycle =
  | 'OneTime'
  | 'Monthly'
  | 'Quarterly'
  | 'SemiAnnually'
  | 'Annually'
  | 'Biennially'
  | 'Triennially';

export type InvoiceStatus =
  | 'Draft'
  | 'Unpaid'
  | 'Paid'
  | 'PartiallyPaid'
  | 'Overdue'
  | 'Cancelled'
  | 'Refunded';

export type TransactionType = 'Payment' | 'Refund' | 'Credit' | 'Debit' | 'Adjustment';

export type TransactionStatus = 'Pending' | 'Completed' | 'Failed' | 'Cancelled' | 'Disputed';

export interface TaxRule {
  id: UUID;
  name: string;
  rate: number;
  country?: string;
  state?: string;
  isCompound: boolean;
  appliesTo: 'Products' | 'Services' | 'All';
  createdAt: ISODateString;
}

export interface InvoiceLineItem {
  id: UUID;
  invoiceId: UUID;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  serviceId?: UUID;
  domainId?: UUID;
}

export interface Invoice {
  id: UUID;
  invoiceNumber: string;
  clientId: UUID;
  status: InvoiceStatus;
  currency: CurrencyCode;
  subtotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  lineItems: InvoiceLineItem[];
  notes?: string;
  dueDate: ISODateString;
  paidAt?: ISODateString;
  sentAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Transaction {
  id: UUID;
  clientId: UUID;
  invoiceId?: UUID;
  type: TransactionType;
  status: TransactionStatus;
  gateway: string;
  gatewayTransactionId?: string;
  amount: MoneyAmount;
  fee?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreditNote {
  id: UUID;
  clientId: UUID;
  invoiceId?: UUID;
  creditNoteNumber: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
  appliedAmount: number;
  remainingAmount: number;
  createdAt: ISODateString;
}

export interface RecurringProfile {
  id: UUID;
  clientId: UUID;
  serviceId?: UUID;
  description: string;
  amount: number;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  nextDueDate: ISODateString;
  lastGeneratedAt?: ISODateString;
  isActive: boolean;
  createdAt: ISODateString;
}
