import { apiClient } from "./client";

export const settingsApi = {
  getAll: () => apiClient.get<Record<string, string>>("/settings"),

  getGroup: (group: string) =>
    apiClient.get<Record<string, string>>(`/settings/group/${group}`),

  update: (data: Record<string, string>) =>
    apiClient.patch<Record<string, string>>("/settings", data),

  // Email templates
  getEmailTemplates: () => apiClient.get<unknown[]>("/notifications/templates"),

  updateEmailTemplate: (
    id: string,
    data: { subject?: string; bodyHtml?: string; bodyText?: string },
  ) => apiClient.patch<unknown>(`/notifications/templates/${id}`, data),

  // Tax rules
  getTaxRules: () => apiClient.get<unknown[]>("/settings/tax-rules"),

  createTaxRule: (data: unknown) =>
    apiClient.post<unknown>("/settings/tax-rules", data),

  updateTaxRule: (id: string, data: unknown) =>
    apiClient.patch<unknown>(`/settings/tax-rules/${id}`, data),

  deleteTaxRule: (id: string) =>
    apiClient.delete<void>(`/settings/tax-rules/${id}`),

  // Roles
  getRoles: () => apiClient.get<unknown[]>("/settings/roles"),

  createRole: (data: {
    name: string;
    description?: string;
    permissions: string[];
  }) => apiClient.post<unknown>("/settings/roles", data),

  updateRole: (id: string, data: unknown) =>
    apiClient.patch<unknown>(`/settings/roles/${id}`, data),

  deleteRole: (id: string) => apiClient.delete<void>(`/settings/roles/${id}`),
};
