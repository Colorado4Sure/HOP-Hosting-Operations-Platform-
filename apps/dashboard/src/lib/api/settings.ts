import { apiClient } from "./client";
import type { Permission, Role } from "@hop/shared-types";

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  customPermissions: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const settingsApi = {
  getAll: () => apiClient.get<Record<string, string>[]>("/settings"),

  update: (entries: { key: string; value: string; group?: string }[]) =>
    apiClient.put<unknown>("/settings", { settings: entries }),

  // Roles
  getRoles: () => apiClient.get<Role[]>("/settings/roles"),
  createRole: (data: { name: string; description?: string; permissions: Permission[] }) =>
    apiClient.post<Role>("/settings/roles", data),
  updateRole: (id: string, data: { name?: string; description?: string; permissions?: Permission[] }) =>
    apiClient.put<Role>(`/settings/roles/${id}`, data),
  deleteRole: (id: string) => apiClient.delete<void>(`/settings/roles/${id}`),

  // Users
  listUsers: (params?: { page?: number; perPage?: number; search?: string; role?: string }) =>
    apiClient.get<{ data: AppUser[]; meta: unknown }>("/auth/users", { params }),
  updateUser: (id: string, data: { role?: string; customPermissions?: string[]; isActive?: boolean }) =>
    apiClient.patch<AppUser>(`/auth/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete<void>(`/auth/users/${id}`),

  // Email Templates (via notifications controller)
  getEmailTemplates: () => apiClient.get<unknown[]>("/notifications/templates"),
  createEmailTemplate: (data: { name: string; slug: string; subject: string; bodyHtml: string; bodyText?: string; variables?: string[] }) =>
    apiClient.post<unknown>("/notifications/templates", data),
  updateEmailTemplate: (id: string, data: { subject?: string; bodyHtml?: string; bodyText?: string }) =>
    apiClient.put<unknown>(`/notifications/templates/${id}`, data),
  deleteEmailTemplate: (id: string) => apiClient.delete<void>(`/notifications/templates/${id}`),

  // Tax rules
  getTaxRules: () => apiClient.get<unknown[]>("/settings/tax-rules"),
  createTaxRule: (data: unknown) => apiClient.post<unknown>("/settings/tax-rules", data),
  updateTaxRule: (id: string, data: unknown) => apiClient.patch<unknown>(`/settings/tax-rules/${id}`, data),
  deleteTaxRule: (id: string) => apiClient.delete<void>(`/settings/tax-rules/${id}`),
};
