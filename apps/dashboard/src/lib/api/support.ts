import { apiClient } from '@/lib/api/client';

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  clientId: string;
  departmentId: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
  replies?: TicketReply[];
}

export interface TicketReply {
  id: string;
  ticketId: string;
  authorId: string;
  message: string;
  internal: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface KbArticle {
  id: string;
  title: string;
  content: string;
  categoryId?: string;
}

export interface CannedResponse {
  id: string;
  name: string;
  content: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ListTicketsParams {
  page?: number;
  perPage?: number;
  status?: string;
  priority?: string;
  departmentId?: string;
  search?: string;
  clientId?: string;
  [key: string]: string | number | boolean | undefined;
}

export const supportApi = {
  listTickets(params?: ListTicketsParams): Promise<{ data: Ticket[]; meta: PaginatedMeta }> {
    return apiClient.get('/support/tickets', { params });
  },

  getTicket(id: string): Promise<Ticket> {
    return apiClient.get(`/support/tickets/${id}`);
  },

  createTicket(data: {
    subject: string;
    departmentId: string;
    priority?: string;
    message: string;
    serviceId?: string;
  }): Promise<Ticket> {
    return apiClient.post('/support/tickets', data);
  },

  addReply(id: string, data: { message: string; internal?: boolean }): Promise<TicketReply> {
    return apiClient.post(`/support/tickets/${id}/replies`, data);
  },

  updateTicketStatus(id: string, status: string): Promise<Ticket> {
    return apiClient.patch(`/support/tickets/${id}/status`, { status });
  },

  assignTicket(id: string, assignedToId: string): Promise<Ticket> {
    return apiClient.patch(`/support/tickets/${id}/assign`, { assignedToId });
  },

  closeTicket(id: string): Promise<Ticket> {
    return apiClient.post(`/support/tickets/${id}/close`);
  },

  listDepartments(): Promise<Department[]> {
    return apiClient.get('/support/departments');
  },

  listKbArticles(params?: { categoryId?: string; search?: string }): Promise<KbArticle[]> {
    return apiClient.get('/support/kb', { params });
  },

  listCannedResponses(): Promise<CannedResponse[]> {
    return apiClient.get('/support/canned-responses');
  },
};
