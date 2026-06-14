import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PluginsService } from './plugins.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('plugins')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'plugins', version: '1' })
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @ApiOperation({ summary: 'List installed plugins' })
  @Permissions('plugins:manage')
  @Get()
  listPlugins(
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.pluginsService.listPlugins({ type, status });
  }

  @ApiOperation({ summary: 'Install a plugin from a manifest' })
  @Permissions('plugins:manage')
  @Post('install')
  installPlugin(
    @Body() body: { manifest: object; trustLevel?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pluginsService.installPlugin(body.manifest, body.trustLevel ?? 'verified', user.sub);
  }

  @ApiOperation({ summary: 'Get plugin details by slug' })
  @Permissions('plugins:manage')
  @Get(':slug')
  getPlugin(@Param('slug') slug: string) {
    return this.pluginsService.getPlugin(slug);
  }

  @ApiOperation({ summary: 'Update plugin configuration' })
  @Permissions('plugins:manage')
  @Put(':slug/config')
  updateConfig(
    @Param('slug') slug: string,
    @Body() body: { config: Record<string, unknown> },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pluginsService.updatePluginConfig(slug, body.config, user.sub);
  }

  @ApiOperation({ summary: 'Enable a plugin' })
  @Permissions('plugins:manage')
  @Patch(':slug/enable')
  enable(@Param('slug') slug: string, @CurrentUser() user: JwtPayload) {
    return this.pluginsService.enablePlugin(slug, user.sub);
  }

  @ApiOperation({ summary: 'Disable a plugin' })
  @Permissions('plugins:manage')
  @Patch(':slug/disable')
  disable(@Param('slug') slug: string, @CurrentUser() user: JwtPayload) {
    return this.pluginsService.disablePlugin(slug, user.sub);
  }

  @ApiOperation({ summary: 'Uninstall a plugin' })
  @Permissions('plugins:manage')
  @Delete(':slug')
  uninstall(@Param('slug') slug: string, @CurrentUser() user: JwtPayload) {
    return this.pluginsService.uninstallPlugin(slug, user.sub);
  }
}
