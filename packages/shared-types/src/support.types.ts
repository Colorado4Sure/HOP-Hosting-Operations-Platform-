import type { UUID, ISODateString } from './common.types';

// ─── Support & Ticketing Types ────────────────────────────────────────────────

export type TicketStatus = 'Open' | 'Answered' | 'CustomerReply' | 'OnHold' | 'Closed';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Department {
  id: UUID;
  name: string;
  description?: string;
  email?: string;
  isHidden: boolean;
  autoResponseEnabled: boolean;
  slaHours?: number;
  assignees: UUID[];
  createdAt: ISODateString;
}

export interface TicketAttachment {
  id: UUID;
  replyId: UUID;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: ISODateString;
}

export interface TicketReply {
  id: UUID;
  ticketId: UUID;
  authorId: UUID;
  authorName: string;
  authorType: 'Client' | 'Staff' | 'System';
  message: string;
  isInternal: boolean;
  attachments: TicketAttachment[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Ticket {
  id: UUID;
  ticketNumber: string;
  clientId: UUID;
  departmentId: UUID;
  department?: Department;
  assignedToId?: UUID;
  assignedToName?: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  serviceId?: UUID;
  replies: TicketReply[];
  slaExpiresAt?: ISODateString;
  lastRepliedAt?: ISODateString;
  closedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface KnowledgebaseCategory {
  id: UUID;
  name: string;
  description?: string;
  parentId?: UUID;
  children?: KnowledgebaseCategory[];
  sortOrder: number;
  articleCount: number;
}

export interface KnowledgebaseArticle {
  id: UUID;
  categoryId: UUID;
  category?: KnowledgebaseCategory;
  title: string;
  content: string;
  slug: string;
  status: 'Published' | 'Draft';
  views: number;
  helpful: number;
  notHelpful: number;
  tags: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CannedResponse {
  id: UUID;
  title: string;
  content: string;
  departmentId?: UUID;
  createdAt: ISODateString;
}
