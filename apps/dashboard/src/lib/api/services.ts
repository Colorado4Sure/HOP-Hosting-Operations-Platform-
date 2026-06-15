import type { Service, ServiceUsage } from "@hop/shared-types";
import { apiClient } from "./client";

export interface CreateServiceData {
  clientId: string;
  productId: string;
  billingCycle?: string;
  registrationDate?: string;
  nextDueDate?: string;
  notes?: string;
}

export const servicesApi = {
  list: (params?: {
    page?: number;
    perPage?: number;
    clientId?: string;
    status?: string;
  }) =>
    apiClient.get<{ data: Service[]; meta: unknown }>("/services", { params }),

  get: (id: string) => apiClient.get<Service>(`/services/${id}`),

  create: (data: CreateServiceData) =>
    apiClient.post<Service>("/services", data),

  getUsage: (id: string) =>
    apiClient.get<ServiceUsage>(`/services/${id}/usage`),

  suspend: (id: string, reason?: string) =>
    apiClient.post<Service>(`/services/${id}/suspend`, { reason }),

  unsuspend: (id: string) =>
    apiClient.post<Service>(`/services/${id}/unsuspend`, {}),

  terminate: (id: string, reason?: string) =>
    apiClient.post<Service>(`/services/${id}/terminate`, { reason }),

  requestCancellation: (
    id: string,
    data: { reason: string; cancellationDate?: string },
  ) => apiClient.post<Service>(`/services/${id}/cancel`, data),

  changePackage: (
    id: string,
    data: { productId: string; billingCycle?: string },
  ) => apiClient.post<Service>(`/services/${id}/change-package`, data),

  update: (id: string, data: Partial<Service>) =>
    apiClient.patch<Service>(`/services/${id}`, data),

  getProvisioningJobs: (id: string) =>
    apiClient.get<unknown[]>(`/services/${id}/jobs`),

  retryJob: (serviceId: string, jobId: string) =>
    apiClient.post<unknown>(`/services/${serviceId}/jobs/${jobId}/retry`, {}),
};
