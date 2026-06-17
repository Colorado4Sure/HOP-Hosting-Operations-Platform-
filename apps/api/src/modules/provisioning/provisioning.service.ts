import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { REDIS_CLIENT } from "../../redis/redis.module";
import { Redis } from "ioredis";
import { Queue } from "bullmq";
import { Prisma } from "@prisma/client";

@Injectable()
export class ProvisioningService {
  private readonly provisioningQueue: Queue;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    this.provisioningQueue = new Queue("provisioning", {
      connection: this.redis as any,
    });
  }

  // â”€â”€â”€ Servers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listServers(params?: {
    page?: number;
    perPage?: number;
    type?: string;
  }) {
    const { page: _page, perPage: _perPage, type } = params ?? {};
    const page = Math.max(1, parseInt(String(_page ?? 1), 10) || 1);
    const perPage = Math.max(1, parseInt(String(_perPage ?? 25), 10) || 25);
    const skip = (Math.max(1, Number.isFinite(+page) ? +page : 1) - 1) * Math.max(1, Number.isFinite(+perPage) ? +perPage : 25);
    const where = type ? { type } : {};

    const [data, total] = await Promise.all([
      this.prisma.server.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.server.count({ where }),
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

  async getServer(id: string) {
    const server = await this.prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundException(`Server ${id} not found`);
    return server;
  }

  async createServer(data: {
    name: string;
    hostname: string;
    ipAddress: string;
    type: string;
    moduleType: string;
    moduleSettings?: Record<string, unknown>;
    maxAccounts?: number;
  }) {
    return this.prisma.server.create({ data: data as any });
  }

  async updateServer(
    id: string,
    data: Partial<{
      name: string;
      hostname: string;
      ipAddress: string;
      type: string;
      moduleType: string;
      moduleSettings: Record<string, unknown>;
      maxAccounts: number;
      status: string;
    }>,
  ) {
    return this.prisma.server.update({ where: { id }, data: data as any });
  }

  // â”€â”€â”€ Jobs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listJobs(params: {
    page?: number;
    perPage?: number;
    serviceId?: string;
    status?: string;
  }) {
    const { page: _page, perPage: _perPage, serviceId, status } = params;
    const page = Math.max(1, parseInt(String(_page ?? 1), 10) || 1);
    const perPage = Math.max(1, parseInt(String(_perPage ?? 25), 10) || 25);
    const skip = (Math.max(1, Number.isFinite(+page) ? +page : 1) - 1) * Math.max(1, Number.isFinite(+perPage) ? +perPage : 25);

    const where: Prisma.ProvisioningJobWhereInput = {
      ...(serviceId ? { serviceId } : {}),
      ...(status ? { status: status as any } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.provisioningJob.findMany({
        where,
        include: {
          service: { select: { id: true, domain: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.provisioningJob.count({ where }),
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

  async getJob(id: string) {
    const job = await this.prisma.provisioningJob.findUnique({
      where: { id },
      include: { service: true },
    });
    if (!job) throw new NotFoundException(`Provisioning job ${id} not found`);
    return job;
  }

  async queueJob(
    data: {
      serviceId: string;
      serverId?: string;
      action: string;
      payload?: Record<string, unknown>;
    },
    actorId: string,
  ) {
    // 1. Create the job record in DB
    const job = await this.prisma.provisioningJob.create({
      data: {
        serviceId: data.serviceId,
        serverId: data.serverId,
        action: data.action as any,
        payload: (data.payload ?? {}) as any,
        status: "Pending" as any,
      },
    });

    // 2. Enqueue in BullMQ
    await this.provisioningQueue.add(
      data.action,
      { jobId: job.id, ...data },
      { jobId: job.id, removeOnComplete: false, removeOnFail: false },
    );

    await this.auditService.log({
      userId: actorId,
      action: "queue-job",
      resource: "provisioning-job",
      resourceId: job.id,
      metadata: { action: data.action, serviceId: data.serviceId },
    });

    return job;
  }

  async retryJob(id: string, actorId: string) {
    const job = await this.prisma.provisioningJob.update({
      where: { id },
      data: {
        status: "Pending" as any,
        attempts: { increment: 0 },
        errorMessage: null,
      },
    });

    await this.provisioningQueue.add(
      job.action,
      {
        jobId: id,
        serviceId: job.serviceId,
        serverId: job.serverId,
        payload: job.payload,
        action: job.action,
      },
      {
        jobId: `${id}-retry-${Date.now()}`,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    await this.auditService.log({
      userId: actorId,
      action: "retry-job",
      resource: "provisioning-job",
      resourceId: id,
    });

    return job;
  }

  async cancelJob(id: string, actorId: string) {
    const job = await this.prisma.provisioningJob.update({
      where: { id },
      data: { status: "Cancelled" },
    });

    await this.auditService.log({
      userId: actorId,
      action: "cancel-job",
      resource: "provisioning-job",
      resourceId: id,
    });

    return job;
  }

  async getServiceUsage(serviceId: string) {
    return this.prisma.serviceUsage.findFirst({
      where: { serviceId },
      orderBy: { retrievedAt: "desc" },
    });
  }
}
