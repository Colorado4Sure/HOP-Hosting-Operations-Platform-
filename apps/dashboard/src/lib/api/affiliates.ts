import type { Affiliate, DiscountCode, Referral } from '@hop/shared-types';
import { apiClient } from './client';

export const affiliatesApi = {
  list: (params?: { page?: number; perPage?: number; status?: string }) =>
    apiClient.get<{ data: Affiliate[]; meta: unknown }>('/affiliates', { params }),

  get: (id: string) =>
    apiClient.get<Affiliate>(`/affiliates/${id}`),

  getMyAffiliate: () =>
    apiClient.get<Affiliate>('/affiliates/me'),

  apply: () =>
    apiClient.post<Affiliate>('/affiliates/apply', {}),

  getReferrals: (id: string) =>
    apiClient.get<{ data: Referral[]; meta: unknown }>(`/affiliates/${id}/referrals`),

  updateSettings: (id: string, data: { payoutMethod?: string; payoutDetails?: Record<string, unknown> }) =>
    apiClient.patch<Affiliate>(`/affiliates/${id}`, data),

  approve: (id: string) =>
    apiClient.post<Affiliate>(`/affiliates/${id}/approve`, {}),

  requestPayout: (id: string) =>
    apiClient.post<unknown>(`/affiliates/${id}/payout`, {}),

  // Discount codes
  listDiscountCodes: (params?: { page?: number; perPage?: number }) =>
    apiClient.get<{ data: DiscountCode[]; meta: unknown }>('/discount-codes', { params }),

  createDiscountCode: (data: Omit<DiscountCode, 'id' | 'usedCount' | 'createdAt'>) =>
    apiClient.post<DiscountCode>('/discount-codes', data),

  updateDiscountCode: (id: string, data: Partial<DiscountCode>) =>
    apiClient.patch<DiscountCode>(`/discount-codes/${id}`, data),

  deleteDiscountCode: (id: string) =>
    apiClient.delete<void>(`/discount-codes/${id}`),

  validateCode: (code: string) =>
    apiClient.get<{ valid: boolean; discount?: DiscountCode }>(`/discount-codes/validate/${code}`),
};
