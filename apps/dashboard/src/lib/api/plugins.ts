import type { PluginInstallation } from '@hop/shared-types';
import { apiClient } from './client';

export const pluginsApi = {
  list: () =>
    apiClient.get<PluginInstallation[]>('/plugins'),

  get: (slug: string) =>
    apiClient.get<PluginInstallation>(`/plugins/${slug}`),

  install: (data: { slug: string; trustLevel?: 'trusted' | 'sandboxed' }) =>
    apiClient.post<PluginInstallation>('/plugins/install', data),

  uninstall: (slug: string) =>
    apiClient.delete<void>(`/plugins/${slug}`),

  enable: (slug: string) =>
    apiClient.post<PluginInstallation>(`/plugins/${slug}/enable`, {}),

  disable: (slug: string) =>
    apiClient.post<PluginInstallation>(`/plugins/${slug}/disable`, {}),

  updateConfig: (slug: string, config: Record<string, unknown>) =>
    apiClient.patch<PluginInstallation>(`/plugins/${slug}/config`, { config }),
};
