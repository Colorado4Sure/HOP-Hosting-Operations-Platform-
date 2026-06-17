import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditLogEntry) {
    return this.prisma.auditLog.create({ data: entry as any });
  }

  async findAll(params: { page?: number; perPage?: number; userId?: string; resource?: string }) {
    const { page: _page, perPage: _perPage, userId, resource } = params;
    const page = Math.max(1, parseInt(String(_page ?? 1), 10) || 1);
    const perPage = Math.max(1, parseInt(String(_perPage ?? 25), 10) || 25);
    const skip = (Math.max(1, Number.isFinite(+page) ? +page : 1) - 1) * Math.max(1, Number.isFinite(+perPage) ? +perPage : 25);

    const where = {
      ...(userId ? { userId } : {}),
      ...(resource ? { resource } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.auditLog.count({ where }),
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
}
