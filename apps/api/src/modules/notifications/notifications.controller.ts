import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'List all email templates' })
  @Permissions('settings:read')
  @Get('templates')
  getTemplates() {
    return this.notificationsService.getTemplates();
  }

  @ApiOperation({ summary: 'Create an email template' })
  @Permissions('settings:update')
  @Post('templates')
  createTemplate(
    @Body() body: { name: string; slug: string; subject: string; bodyHtml: string; bodyText?: string; variables?: string[] },
  ) {
    return this.notificationsService.createTemplate(body);
  }

  @ApiOperation({ summary: 'Update an email template' })
  @Permissions('settings:update')
  @Put('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @Body() body: { subject?: string; bodyHtml?: string; bodyText?: string },
  ) {
    return this.notificationsService.updateTemplate(id, body);
  }

  @ApiOperation({ summary: 'Delete an email template' })
  @Permissions('settings:update')
  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.deleteTemplate(id);
  }

  @ApiOperation({ summary: 'List notification logs' })
  @Permissions('settings:read')
  @Get('logs')
  getLogs(@Query('page') page?: number, @Query('perPage') perPage?: number, @Query('status') status?: string) {
    return this.notificationsService.getLogs({ page, perPage, status });
  }
}
