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
import { AutomationService } from './automation.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('automation')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'automation', version: '1' })
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @ApiOperation({ summary: 'List automation jobs' })
  @Permissions('settings:read')
  @Get('jobs')
  listJobs() {
    return this.automationService.listJobs();
  }

  @ApiOperation({ summary: 'Update automation job configuration' })
  @Permissions('settings:update')
  @Put('jobs/:slug')
  updateJob(
    @Param('slug') slug: string,
    @Body() body: { schedule?: string; isEnabled?: boolean; description?: string },
  ) {
    return this.automationService.updateJob(slug, body);
  }

  @ApiOperation({ summary: 'Get run logs for an automation job' })
  @Permissions('settings:read')
  @Get('jobs/:slug/logs')
  getJobLogs(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.automationService.getJobLogs(slug, { page, perPage });
  }

  @ApiOperation({ summary: 'Manually trigger an automation job' })
  @Permissions('settings:update')
  @Post('jobs/:slug/run')
  manualRun(@Param('slug') slug: string, @CurrentUser() user: JwtPayload) {
    return this.automationService.manualRun(slug, user.sub);
  }
}
