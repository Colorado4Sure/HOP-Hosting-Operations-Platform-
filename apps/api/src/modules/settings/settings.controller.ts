import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('settings')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({ summary: 'Get all settings' })
  @Permissions('settings:read')
  @Get()
  getAll(@Query('group') group?: string) {
    return this.settingsService.getAll(group);
  }

  @ApiOperation({ summary: 'Update multiple settings' })
  @Permissions('settings:update')
  @Put()
  setMany(
    @Body() body: { settings: { key: string; value: string; group?: string }[] },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.setMany(body.settings, user.sub);
  }

  @ApiOperation({ summary: 'List roles' })
  @Permissions('settings:read')
  @Get('roles')
  getRoles() {
    return this.settingsService.getRoles();
  }

  @ApiOperation({ summary: 'Create a role' })
  @Permissions('settings:update')
  @Post('roles')
  createRole(@Body() body: { name: string; description?: string; permissions: string[] }) {
    return this.settingsService.createRole(body);
  }

  @ApiOperation({ summary: 'Update a role' })
  @Permissions('settings:update')
  @Put('roles/:id')
  updateRole(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; description: string; permissions: string[] }>,
  ) {
    return this.settingsService.updateRole(id, body);
  }

  @ApiOperation({ summary: 'Get audit logs' })
  @Permissions('settings:read')
  @Get('audit-logs')
  getAuditLogs(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('userId') userId?: string,
    @Query('resource') resource?: string,
  ) {
    return this.settingsService.getAuditLogs({ page, perPage, userId, resource });
  }
}
