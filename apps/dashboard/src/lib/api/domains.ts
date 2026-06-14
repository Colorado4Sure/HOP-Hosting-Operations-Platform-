import type { Domain, DnsRecord } from '@hop/shared-types';
import { apiClient } from './client';

export const domainsApi = {
  list: (params?: { page?: number; perPage?: number; search?: string; clientId?: string }) =>
    apiClient.get<{ data: Domain[]; meta: unknown }>('/domains', { params }),

  get: (id: string) =>
    apiClient.get<Domain>(`/domains/${id}`),

  checkAvailability: (domain: string) =>
    apiClient.get<{ available: boolean; domain: string; suggestions?: string[] }>(`/domains/check/${domain}`),

  register: (data: {
    clientId: string;
    domain: string;
    years: number;
    registrar: string;
    nameservers?: string[];
    idProtection?: boolean;
  }) => apiClient.post<Domain>('/domains/register', data),

  transfer: (data: {
    clientId: string;
    domain: string;
    epp: string;
    registrar: string;
    years?: number;
  }) => apiClient.post<Domain>('/domains/transfer', data),

  renew: (id: string, data: { years: number }) =>
    apiClient.post<Domain>(`/domains/${id}/renew`, data),

  updateNameservers: (id: string, data: { nameservers: string[] }) =>
    apiClient.patch<Domain>(`/domains/${id}/nameservers`, data),

  getDnsRecords: (id: string) =>
    apiClient.get<DnsRecord[]>(`/domains/${id}/dns`),

  updateDnsRecords: (id: string, records: Partial<DnsRecord>[]) =>
    apiClient.put<DnsRecord[]>(`/domains/${id}/dns`, { records }),

  toggleAutoRenew: (id: string, autoRenew: boolean) =>
    apiClient.patch<Domain>(`/domains/${id}/auto-renew`, { autoRenew }),

  toggleIdProtection: (id: string, enabled: boolean) =>
    apiClient.patch<Domain>(`/domains/${id}/id-protection`, { enabled }),

  getEppCode: (id: string) =>
    apiClient.get<{ epp: string }>(`/domains/${id}/epp`),
};
