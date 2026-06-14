import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProvisioningService } from './provisioning.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('provisioning')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'provisioning', version: '1' })
export class ProvisioningController {
  constructor(private readonly provisioningService: ProvisioningService) {}

  // ─── Servers ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List servers' })
  @Permissions('servers:read')
  @Get('servers')
  listServers(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('type') type?: string,
  ) {
    return this.provisioningService.listServers({ page, perPage, type });
  }

  @ApiOperation({ summary: 'Add a server' })
  @Permissions('servers:provision')
  @Post('servers')
  createServer(
    @Body()
    body: {
      name: string;
      hostname: string;
      ipAddress: string;
      type: string;
      moduleType: string;
      moduleSettings?: Record<string, unknown>;
      maxAccounts?: number;
    },
  ) {
    return this.provisioningService.createServer(body);
  }

  @ApiOperation({ summary: 'Get server by ID' })
  @Permissions('servers:read')
  @Get('servers/:id')
  getServer(@Param('id') id: string) {
    return this.provisioningService.getServer(id);
  }

  @ApiOperation({ summary: 'Update a server' })
  @Permissions('servers:provision')
  @Put('servers/:id')
  updateServer(@Param('id') id: string, @Body() body: any) {
    return this.provisioningService.updateServer(id, body);
  }

  // ─── Jobs ──────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List provisioning jobs' })
  @Permissions('servers:read')
  @Get('jobs')
  listJobs(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('serviceId') serviceId?: string,
    @Query('status') status?: string,
  ) {
    return this.provisioningService.listJobs({ page, perPage, serviceId, status });
  }

  @ApiOperation({ summary: 'Queue a provisioning job' })
  @Permissions('servers:provision')
  @Post('jobs')
  queueJob(
    @Body() body: { serviceId: string; serverId?: string; action: string; payload?: Record<string, unknown> },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.provisioningService.queueJob(body, user.sub);
  }

  @ApiOperation({ summary: 'Get provisioning job by ID' })
  @Permissions('servers:read')
  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.provisioningService.getJob(id);
  }

  @ApiOperation({ summary: 'Retry a failed provisioning job' })
  @Permissions('servers:provision')
  @Patch('jobs/:id/retry')
  retryJob(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.provisioningService.retryJob(id, user.sub);
  }

  @ApiOperation({ summary: 'Cancel a provisioning job' })
  @Permissions('servers:provision')
  @Patch('jobs/:id/cancel')
  cancelJob(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.provisioningService.cancelJob(id, user.sub);
  }
}
