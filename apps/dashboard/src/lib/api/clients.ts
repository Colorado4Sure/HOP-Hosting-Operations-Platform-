import { apiClient } from '@/lib/api/client';
import type { Client } from '@hop/shared-types';

export interface ListClientsParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
}

export interface PaginatedClientsMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedClients {
  data: Client[];
  meta: PaginatedClientsMeta;
}

export const clientsApi = {
  listClients(params?: ListClientsParams): Promise<PaginatedClients> {
    return apiClient.get('/clients', { params });
  },

  getClient(id: string): Promise<Client> {
    return apiClient.get(`/clients/${id}`);
  },

  createClient(data: Partial<Client>): Promise<Client> {
    return apiClient.post('/clients', data);
  },

  updateClient(id: string, data: Partial<Client>): Promise<Client> {
    return apiClient.patch(`/clients/${id}`, data);
  },

  suspendClient(id: string): Promise<Client> {
    return apiClient.post(`/clients/${id}/suspend`);
  },

  activateClient(id: string): Promise<Client> {
    return apiClient.post(`/clients/${id}/activate`);
  },

  adjustCredit(id: string, amount: number): Promise<{ balance: number }> {
    return apiClient.post(`/clients/${id}/credit`, { amount });
  },

  addNote(id: string, data: { content: string; sticky?: boolean }): Promise<{ id: string; content: string }> {
    return apiClient.post(`/clients/${id}/notes`, data);
  },

  getActivity(id: string): Promise<{ items: unknown[] }> {
    return apiClient.get(`/clients/${id}/activity`);
  },

  getGroups(): Promise<{ id: string; name: string }[]> {
    return apiClient.get('/clients/groups');
  },

  createGroup(data: { name: string; discount?: number }): Promise<{ id: string; name: string }> {
    return apiClient.post('/clients/groups', data);
  },
};
