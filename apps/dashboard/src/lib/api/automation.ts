import { apiClient } from "./client";

export const automationApi = {
  getJobs: () => apiClient.get<unknown[]>("/automation/jobs"),

  runJob: (slug: string) =>
    apiClient.post<unknown>(`/automation/jobs/${slug}/run`, {}),

  toggleJob: (slug: string, enabled: boolean) =>
    apiClient.patch<unknown>(`/automation/jobs/${slug}`, {
      isEnabled: enabled,
    }),

  getJobLogs: (slug: string, params?: { page?: number; perPage?: number }) =>
    apiClient.get<{ data: unknown[]; meta: unknown }>(
      `/automation/jobs/${slug}/logs`,
      { params },
    ),
};
