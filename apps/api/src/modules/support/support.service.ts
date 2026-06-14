import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { Prisma } from "@prisma/client";

type AuthorType = "Client" | "Staff" | "System";

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Tickets ───────────────────────────────────────────────────────────────

  async listTickets(params: {
    page?: number;
    perPage?: number;
    clientId?: string;
    departmentId?: string;
    status?: string;
    priority?: string;
    assignedToId?: string;
    search?: string;
  }) {
    const {
      page = 1,
      perPage = 25,
      clientId,
      departmentId,
      status,
      priority,
      assignedToId,
      search,
    } = params;
    const skip = (page - 1) * perPage;

    const where: Prisma.TicketWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(priority ? { priority: priority as any } : {}),
      ...(assignedToId ? { assignedToId } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: "insensitive" as const } },
              {
                ticketNumber: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          department: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { lastRepliedAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(total / perPage),
      },
    };
  }

  async getTicket(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        client: true,
        department: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        replies: {
          include: { attachments: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  async createTicket(
    data: {
      clientId: string;
      departmentId: string;
      subject: string;
      priority?: string;
      serviceId?: string;
      message: string;
    },
    authorId: string,
    authorName: string,
  ) {
    // Generate ticket number
    const count = await this.prisma.ticket.count();
    const ticketNumber = `TKT-${String(count + 1).padStart(6, "0")}`;

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        clientId: data.clientId,
        departmentId: data.departmentId,
        subject: data.subject,
        priority: (data.priority as any) ?? "Medium",
        serviceId: data.serviceId,
        status: "Open",
        lastRepliedAt: new Date(),
        replies: {
          create: {
            message: data.message,
            authorId,
            authorName,
            authorType: "Client",
          },
        },
      },
      include: { replies: true },
    });

    await this.auditService.log({
      userId: authorId,
      action: "create",
      resource: "ticket",
      resourceId: ticket.id,
    });

    return ticket;
  }

  async addReply(
    ticketId: string,
    data: { message: string; isInternal?: boolean },
    authorId: string,
    authorName: string,
    authorType: AuthorType,
  ) {
    const reply = await this.prisma.ticketReply.create({
      data: {
        ticketId,
        message: data.message,
        isInternal: data.isInternal ?? false,
        authorId,
        authorName,
        authorType,
      },
    });

    // Update ticket
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: authorType === "Staff" ? "Answered" : "CustomerReply",
        lastRepliedAt: new Date(),
      },
    });

    return reply;
  }

  async updateTicketStatus(id: string, status: string, actorId: string) {
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: { status: status as any },
    });

    await this.auditService.log({
      userId: actorId,
      action: "update-status",
      resource: "ticket",
      resourceId: id,
      metadata: { status },
    });

    return ticket;
  }

  async assignTicket(id: string, assignedToId: string, actorId: string) {
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: { assignedToId },
    });

    await this.auditService.log({
      userId: actorId,
      action: "assign",
      resource: "ticket",
      resourceId: id,
      metadata: { assignedToId },
    });

    return ticket;
  }

  async closeTicket(id: string, actorId: string) {
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: { status: "Closed", closedAt: new Date() },
    });

    await this.auditService.log({
      userId: actorId,
      action: "close",
      resource: "ticket",
      resourceId: id,
    });

    return ticket;
  }

  // ─── Departments ───────────────────────────────────────────────────────────

  async listDepartments() {
    return this.prisma.ticketDepartment.findMany({ orderBy: { name: "asc" } });
  }

  async createDepartment(data: {
    name: string;
    description?: string;
    email?: string;
    isHidden?: boolean;
    slaHours?: number;
  }) {
    return this.prisma.ticketDepartment.create({ data });
  }

  async updateDepartment(id: string, data: any) {
    return this.prisma.ticketDepartment.update({ where: { id }, data });
  }

  // ─── Knowledge Base ────────────────────────────────────────────────────────

  async listKbCategories() {
    return this.prisma.kbCategory.findMany({
      where: { parentId: null },
      include: { children: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createKbCategory(data: {
    name: string;
    description?: string;
    parentId?: string;
    sortOrder?: number;
  }) {
    return this.prisma.kbCategory.create({ data });
  }

  async listKbArticles(params: {
    categoryId?: string;
    search?: string;
    status?: string;
  }) {
    const { categoryId, search, status } = params;

    const where: Prisma.KbArticleWhereInput = {
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search
        ? { title: { contains: search, mode: "insensitive" as const } }
        : {}),
    };

    return this.prisma.kbArticle.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async createKbArticle(data: {
    categoryId: string;
    title: string;
    content: string;
    status?: string;
    tags?: string[];
  }) {
    return this.prisma.kbArticle.create({ data: data as any });
  }

  async updateKbArticle(id: string, data: any) {
    return this.prisma.kbArticle.update({ where: { id }, data });
  }

  // ─── Canned Responses ──────────────────────────────────────────────────────

  async listCannedResponses(departmentId?: string) {
    return this.prisma.cannedResponse.findMany({
      where: departmentId ? { departmentId } : {},
      orderBy: { title: "asc" },
    });
  }

  async createCannedResponse(data: {
    title: string;
    content: string;
    departmentId?: string;
  }) {
    return this.prisma.cannedResponse.create({ data });
  }
}
