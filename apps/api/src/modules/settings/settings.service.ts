import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── Settings ──────────────────────────────────────────────────────────────

  async getAll(group?: string) {
    return this.prisma.setting.findMany({
      where: {
        isSecret: false,
        ...(group ? { group } : {}),
      },
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
  }

  async get(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async set(key: string, value: string, actorId: string) {
    const setting = await this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    await this.auditService.log({
      userId: actorId,
      action: 'set',
      resource: 'setting',
      resourceId: key,
    });

    return setting;
  }

  async setMany(settings: { key: string; value: string; group?: string }[], actorId: string) {
    const results = await Promise.all(
      settings.map((s) =>
        this.prisma.setting.upsert({
          where: { key: s.key },
          create: { key: s.key, value: s.value, group: s.group },
          update: { value: s.value, ...(s.group ? { group: s.group } : {}) },
        }),
      ),
    );

    await this.auditService.log({
      userId: actorId,
      action: 'set-many',
      resource: 'setting',
      metadata: { keys: settings.map((s) => s.key) },
    });

    return results;
  }

  // ─── Roles ─────────────────────────────────────────────────────────────────

  async getRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async createRole(data: { name: string; description?: string; permissions: string[] }) {
    return this.prisma.role.create({ data });
  }

  async updateRole(
    id: string,
    data: Partial<{ name: string; description: string; permissions: string[] }>,
  ) {
    return this.prisma.role.update({ where: { id }, data });
  }

  async deleteRole(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }

  // ─── Audit Logs ────────────────────────────────────────────────────────────

  async getAuditLogs(params: { page?: number; perPage?: number; userId?: string; resource?: string }) {
    return this.auditService.findAll(params);
  }
}
