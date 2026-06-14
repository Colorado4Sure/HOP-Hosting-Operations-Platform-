import { apiClient } from "@/lib/api/client";

export interface OverviewReport {
  totalClients: number;
  activeServices: number;
  openTickets: number;
  monthlyRevenue: number;
  recentInvoices: unknown[];
  recentTickets: unknown[];
}

export interface RevenueReportParams {
  from?: string;
  to?: string;
  groupBy?: "day" | "week" | "month";
}

export interface RevenueReport {
  labels: string[];
  revenue: number[];
  total: number;
}

export interface MrrReport {
  current: number;
  previous: number;
  change: number;
  history: { month: string; mrr: number }[];
}

export const reportsApi = {
  getOverview(): Promise<OverviewReport> {
    return apiClient.get("/reports/overview");
  },

  getRevenueReport(params: RevenueReportParams): Promise<RevenueReport> {
    return apiClient.get("/reports/revenue", { params });
  },

  getClientReport(): Promise<{
    total: number;
    active: number;
    suspended: number;
    new: number;
  }> {
    return apiClient.get("/reports/clients");
  },

  getServiceReport(): Promise<{
    total: number;
    active: number;
    suspended: number;
    cancelled: number;
  }> {
    return apiClient.get("/reports/services");
  },

  getOverdueReport(): Promise<{ invoices: unknown[]; totalAmount: number }> {
    return apiClient.get("/reports/overdue");
  },

  getMrrReport(): Promise<MrrReport> {
    return apiClient.get("/reports/mrr");
  },
};
