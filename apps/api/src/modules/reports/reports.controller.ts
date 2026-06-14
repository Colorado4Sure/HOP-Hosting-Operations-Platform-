import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('reports')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({ summary: 'Get platform overview stats' })
  @Permissions('reports:read')
  @Get('overview')
  getOverview() {
    return this.reportsService.getOverview();
  }

  @ApiOperation({ summary: 'Get revenue report' })
  @Permissions('reports:read')
  @Get('revenue')
  getRevenue(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'day' | 'month' = 'day',
  ) {
    return this.reportsService.getRevenueReport({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      groupBy,
    });
  }

  @ApiOperation({ summary: 'Get client acquisition report' })
  @Permissions('reports:read')
  @Get('clients')
  getClients(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getClientReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @ApiOperation({ summary: 'Get services report' })
  @Permissions('reports:read')
  @Get('services')
  getServices() {
    return this.reportsService.getServiceReport();
  }

  @ApiOperation({ summary: 'Get overdue invoices report' })
  @Permissions('reports:read')
  @Get('overdue')
  getOverdue() {
    return this.reportsService.getOverdueReport();
  }

  @ApiOperation({ summary: 'Get MRR report' })
  @Permissions('reports:read')
  @Get('mrr')
  getMrr() {
    return this.reportsService.getMrrReport();
  }
}
