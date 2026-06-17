import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async listServices(params: {
    page?: number;
    perPage?: number;
    clientId?: string;
    status?: string;
    search?: string;
  }) {
    const { page: _page, perPage: _perPage, clientId, status, search } = params;
    const page = Math.max(1, parseInt(String(_page ?? 1), 10) || 1);
    const perPage = Math.max(1, parseInt(String(_perPage ?? 25), 10) || 25);
    const skip = (Math.max(1, Number.isFinite(+page) ? +page : 1) - 1) * Math.max(1, Number.isFinite(+perPage) ? +perPage : 25);

    const where: Prisma.ServiceWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search
        ? {
            OR: [
              { domain: { contains: search, mode: "insensitive" as const } },
              { username: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          product: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.service.count({ where }),
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

  async getService(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        client: true,
        product: true,
        addons: { include: { addon: true } },
        provisioningJobs: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!service) throw new NotFoundException(`Service ${id} not found`);
    return service;
  }

  async createService(
    data: {
      clientId: string;
      productId: string;
      billingCycle: string;
      currency: string;
      amount: number;
      setupFee?: number;
      nextDueDate: Date;
      domain?: string;
      username?: string;
      password?: string;
      configOptions?: Record<string, unknown>;
    },
    actorId: string,
  ) {
    const service = await this.prisma.service.create({
      data: { ...data, status: "Active" } as any,
      include: { client: true, product: true },
    });

    await this.auditService.log({
      userId: actorId,
      action: "create",
      resource: "service",
      resourceId: service.id,
    });

    return service;
  }

  async updateService(id: string, data: any, actorId: string) {
    const before = await this.prisma.service.findUnique({ where: { id } });
    const updated = await this.prisma.service.update({ where: { id }, data });

    await this.auditService.log({
      userId: actorId,
      action: "update",
      resource: "service",
      resourceId: id,
      before: before as any,
      after: updated as any,
    });

    return updated;
  }

  async suspend(id: string, actorId: string) {
    const service = await this.prisma.service.update({
      where: { id },
      data: { status: "Suspended", suspendedAt: new Date() },
    });

    await this.auditService.log({
      userId: actorId,
      action: "suspend",
      resource: "service",
      resourceId: id,
    });

    return service;
  }

  async unsuspend(id: string, actorId: string) {
    const service = await this.prisma.service.update({
      where: { id },
      data: { status: "Active", suspendedAt: null },
    });

    await this.auditService.log({
      userId: actorId,
      action: "unsuspend",
      resource: "service",
      resourceId: id,
    });

    return service;
  }

  async terminate(id: string, reason: string, actorId: string) {
    const service = await this.prisma.service.update({
      where: { id },
      data: { status: "Terminated", terminatedAt: new Date() },
    });

    await this.auditService.log({
      userId: actorId,
      action: "terminate",
      resource: "service",
      resourceId: id,
      metadata: { reason },
    });

    return service;
  }

  async requestCancellation(id: string, reason: string, actorId: string) {
    const service = await this.prisma.service.update({
      where: { id },
      data: {
        status: "PendingCancellation",
        cancellationReason: reason,
        cancellationDate: new Date(),
      },
    });

    await this.auditService.log({
      userId: actorId,
      action: "cancel-request",
      resource: "service",
      resourceId: id,
      metadata: { reason },
    });

    return service;
  }

  async upgradeDowngrade(
    id: string,
    data: { productId?: string; billingCycle?: string; amount?: number },
    actorId: string,
  ) {
    const before = await this.prisma.service.findUnique({ where: { id } });
    const updated = await this.prisma.service.update({ where: { id }, data: data as any });

    await this.auditService.log({
      userId: actorId,
      action: "upgrade-downgrade",
      resource: "service",
      resourceId: id,
      before: before as any,
      after: updated as any,
    });

    return updated;
  }

  async getUsage(id: string) {
    return this.prisma.serviceUsage.findFirst({
      where: { serviceId: id },
      orderBy: { retrievedAt: "desc" },
    });
  }
}
