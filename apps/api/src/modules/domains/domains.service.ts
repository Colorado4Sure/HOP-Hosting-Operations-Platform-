import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class DomainsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── Domains ───────────────────────────────────────────────────────────────

  async listDomains(params: {
    page?: number;
    perPage?: number;
    clientId?: string;
    status?: string;
    search?: string;
  }) {
    const { page = 1, perPage = 25, clientId, status, search } = params;
    const skip = (page - 1) * perPage;

    const where: Prisma.DomainWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search
        ? { domain: { contains: search, mode: "insensitive" as const } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.domain.findMany({
        where,
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.domain.count({ where }),
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

  async getDomain(id: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { id },
      include: { client: true, invoiceItems: true },
    });
    if (!domain) throw new NotFoundException(`Domain ${id} not found`);
    return domain;
  }

  async registerDomain(
    data: {
      clientId: string;
      domain: string;
      tld: string;
      registrar: string;
      registrationDate: Date;
      expiryDate: Date;
      nameservers?: string[];
      idProtection?: boolean;
      registrantContact?: Record<string, unknown>;
      adminContact?: Record<string, unknown>;
      techContact?: Record<string, unknown>;
    },
    actorId: string,
  ) {
    const dom = await this.prisma.domain.create({
      data: { ...data, status: "Active" },
    });

    await this.auditService.log({
      userId: actorId,
      action: "register",
      resource: "domain",
      resourceId: dom.id,
      metadata: { domain: data.domain },
    });

    return dom;
  }

  async updateDomain(id: string, data: any, actorId: string) {
    const updated = await this.prisma.domain.update({ where: { id }, data });

    await this.auditService.log({
      userId: actorId,
      action: "update",
      resource: "domain",
      resourceId: id,
    });

    return updated;
  }

  async renewDomain(id: string, years: number, actorId: string) {
    const domain = await this.prisma.domain.findUniqueOrThrow({
      where: { id },
    });
    const currentExpiry = new Date(domain.expiryDate);
    currentExpiry.setFullYear(currentExpiry.getFullYear() + years);

    const updated = await this.prisma.domain.update({
      where: { id },
      data: { expiryDate: currentExpiry },
    });

    await this.auditService.log({
      userId: actorId,
      action: "renew",
      resource: "domain",
      resourceId: id,
      metadata: { years, newExpiry: currentExpiry },
    });

    return updated;
  }

  async transferDomain(id: string, epp: string, actorId: string) {
    const domain = await this.prisma.domain.update({
      where: { id },
      data: { status: "Pending", transferSecret: epp },
    });

    await this.auditService.log({
      userId: actorId,
      action: "transfer",
      resource: "domain",
      resourceId: id,
    });

    return domain;
  }

  async updateNameservers(id: string, nameservers: string[], actorId: string) {
    const domain = await this.prisma.domain.update({
      where: { id },
      data: { nameservers },
    });

    await this.auditService.log({
      userId: actorId,
      action: "update-nameservers",
      resource: "domain",
      resourceId: id,
      metadata: { nameservers },
    });

    return domain;
  }

  async toggleAutoRenew(id: string, actorId: string) {
    const domain = await this.prisma.domain.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.domain.update({
      where: { id },
      data: { autoRenew: !domain.autoRenew },
    });

    await this.auditService.log({
      userId: actorId,
      action: "toggle-autorenew",
      resource: "domain",
      resourceId: id,
      metadata: { autoRenew: updated.autoRenew },
    });

    return updated;
  }

  // ─── TLD Pricing ───────────────────────────────────────────────────────────

  async listTldPricing(params: { search?: string }) {
    const { search } = params;
    return this.prisma.tldPricing.findMany({
      where: search
        ? { tld: { contains: search, mode: "insensitive" } }
        : undefined,
      orderBy: { tld: "asc" },
    });
  }

  async upsertTldPricing(data: {
    tld: string;
    registrar: string;
    registerPrice: number;
    renewPrice: number;
    transferPrice: number;
    currency?: string;
  }) {
    return this.prisma.tldPricing.upsert({
      where: { tld: data.tld },
      create: data,
      update: data,
    });
  }

  // ─── Expiry Checks ─────────────────────────────────────────────────────────

  async getExpiringDomains(daysAhead: number) {
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    return this.prisma.domain.findMany({
      where: {
        autoRenew: true,
        expiryDate: { lte: future },
        status: "Active",
      },
      include: {
        client: { select: { id: true, firstName: true, email: true } },
      },
    });
  }
}
