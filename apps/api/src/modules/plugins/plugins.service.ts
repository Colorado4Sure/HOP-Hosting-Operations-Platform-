import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';

// Import PluginManifestSchema for manifest validation.
// The schema is provided by the @hop/plugin-sdk package.
// import { PluginManifestSchema } from '@hop/plugin-sdk';
// For now we reference the source directly as configured in tsconfig paths:
let PluginManifestSchema: { parse: (data: unknown) => any } | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sdk = require('../../../packages/plugin-sdk/src');
  PluginManifestSchema = sdk.PluginManifestSchema;
} catch {
  // plugin-sdk not resolvable at runtime — validation will be skipped
}

@Injectable()
export class PluginsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async listPlugins(params?: { type?: string; status?: string }) {
    const where: Prisma.PluginInstallationWhereInput = {
      ...(params?.status ? { status: params.status as any } : {}),
    };

    const all = await this.prisma.pluginInstallation.findMany({
      where,
      orderBy: { installedAt: 'desc' },
    });

    if (params?.type) {
      return all.filter((p) => (p.manifest as any)?.type === params.type);
    }
    return all;
  }

  async getPlugin(slug: string) {
    const plugin = await this.prisma.pluginInstallation.findUnique({ where: { slug } });
    if (!plugin) throw new NotFoundException(`Plugin '${slug}' not found`);
    return plugin;
  }

  async installPlugin(manifest: object, trustLevel: string, actorId: string) {
    // Validate manifest schema if sdk is available
    if (PluginManifestSchema) {
      try {
        PluginManifestSchema.parse(manifest);
      } catch (err: any) {
        throw new BadRequestException(`Invalid plugin manifest: ${err?.message ?? 'Validation failed'}`);
      }
    }

    const m = manifest as Record<string, any>;

    const existing = await this.prisma.pluginInstallation.findUnique({ where: { slug: m['slug'] } });
    if (existing) {
      throw new BadRequestException(`Plugin '${m['slug']}' is already installed`);
    }

    const plugin = await this.prisma.pluginInstallation.create({
      data: {
        slug: m['slug'],
        status: 'Inactive',
        trustLevel: trustLevel as any,
        manifest: manifest as any,
      },
    });

    await this.auditService.log({
      userId: actorId,
      action: 'install',
      resource: 'plugin',
      resourceId: plugin.slug,
      metadata: { slug: plugin.slug },
    });

    return plugin;
  }

  async updatePluginConfig(slug: string, config: Record<string, unknown>, actorId: string) {
    await this.getPlugin(slug);

    const updated = await this.prisma.pluginInstallation.update({
      where: { slug },
      data: { config: config as any },
    });

    await this.auditService.log({
      userId: actorId,
      action: 'update-config',
      resource: 'plugin',
      resourceId: slug,
    });

    return updated;
  }

  async enablePlugin(slug: string, actorId: string) {
    const plugin = await this.prisma.pluginInstallation.update({
      where: { slug },
      data: { status: 'Active' },
    });

    await this.auditService.log({
      userId: actorId,
      action: 'enable',
      resource: 'plugin',
      resourceId: slug,
    });

    return plugin;
  }

  async disablePlugin(slug: string, actorId: string) {
    const plugin = await this.prisma.pluginInstallation.update({
      where: { slug },
      data: { status: 'Inactive' },
    });

    await this.auditService.log({
      userId: actorId,
      action: 'disable',
      resource: 'plugin',
      resourceId: slug,
    });

    return plugin;
  }

  async uninstallPlugin(slug: string, actorId: string) {
    await this.getPlugin(slug);

    await this.prisma.pluginInstallation.delete({ where: { slug } });

    await this.auditService.log({
      userId: actorId,
      action: 'uninstall',
      resource: 'plugin',
      resourceId: slug,
    });

    return { message: `Plugin '${slug}' uninstalled` };
  }
}
