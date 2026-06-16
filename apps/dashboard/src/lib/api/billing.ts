import { apiClient } from "@/lib/api/client";
import type { Invoice, Transaction } from "@hop/shared-types";

export interface PaginatedMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ListInvoicesParams {
  page?: number;
  perPage?: number;
  status?: string;
  clientId?: string;
  search?: string;
}

export interface PaginatedInvoices {
  data: Invoice[];
  meta: PaginatedMeta;
}

export interface PaginatedTransactions {
  data: Transaction[];
  meta: PaginatedMeta;
}

export const billingApi = {
  listInvoices(params?: ListInvoicesParams): Promise<PaginatedInvoices> {
    return apiClient.get('/billing/invoices', { params });
  },

  getInvoice(id: string): Promise<Invoice> {
    return apiClient.get(`/billing/invoices/${id}`);
  },

  createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    return apiClient.post("/billing/invoices", data);
  },

  sendInvoice(id: string): Promise<{ message: string }> {
    return apiClient.post(`/billing/invoices/${id}/send`);
  },

  recordPayment(
    id: string,
    data: { amount: number; method: string; date?: string; note?: string },
  ): Promise<Transaction> {
    return apiClient.post(`/billing/invoices/${id}/payments`, data);
  },

  cancelInvoice(id: string): Promise<Invoice> {
    return apiClient.post(`/billing/invoices/${id}/cancel`);
  },

  listTransactions(params?: {
    page?: number;
    perPage?: number;
    clientId?: string;
  }): Promise<PaginatedTransactions> {
    return apiClient.get("/billing/transactions", { params });
  },

  createCreditNote(data: {
    invoiceId: string;
    amount: number;
    reason?: string;
  }): Promise<{ id: string }> {
    return apiClient.post("/billing/credit-notes", data);
  },

  getTaxRules(): Promise<{ id: string; name: string; rate: number }[]> {
    return apiClient.get("/billing/tax-rules");
  },

  createTaxRule(data: {
    name: string;
    rate: number;
    countries?: string[];
  }): Promise<{ id: string; name: string; rate: number }> {
    return apiClient.post("/billing/tax-rules", data);
  },
};
