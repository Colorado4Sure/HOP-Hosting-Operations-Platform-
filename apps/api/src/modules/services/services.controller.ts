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
import { ServicesService } from './services.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('services')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'services', version: '1' })
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @ApiOperation({ summary: 'List all client services' })
  @Permissions('products:read')
  @Get()
  listServices(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.servicesService.listServices({ page, perPage, clientId, status, search });
  }

  @ApiOperation({ summary: 'Create a new service' })
  @Permissions('products:create')
  @Post()
  createService(@Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.servicesService.createService(body, user.sub);
  }

  @ApiOperation({ summary: 'Get service by ID' })
  @Permissions('products:read')
  @Get(':id')
  getService(@Param('id') id: string) {
    return this.servicesService.getService(id);
  }

  @ApiOperation({ summary: 'Update a service' })
  @Permissions('products:update')
  @Put(':id')
  updateService(@Param('id') id: string, @Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.servicesService.updateService(id, body, user.sub);
  }

  @ApiOperation({ summary: 'Suspend a service' })
  @Permissions('servers:suspend')
  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.servicesService.suspend(id, user.sub);
  }

  @ApiOperation({ summary: 'Unsuspend a service' })
  @Permissions('servers:suspend')
  @Patch(':id/unsuspend')
  unsuspend(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.servicesService.unsuspend(id, user.sub);
  }

  @ApiOperation({ summary: 'Terminate a service' })
  @Permissions('servers:terminate')
  @Patch(':id/terminate')
  terminate(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.servicesService.terminate(id, body.reason, user.sub);
  }

  @ApiOperation({ summary: 'Request cancellation of a service' })
  @Permissions('products:update')
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.servicesService.requestCancellation(id, body.reason, user.sub);
  }

  @ApiOperation({ summary: 'Upgrade or downgrade a service' })
  @Permissions('products:update')
  @Patch(':id/upgrade')
  upgrade(
    @Param('id') id: string,
    @Body() body: { productId?: string; billingCycle?: string; amount?: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.servicesService.upgradeDowngrade(id, body, user.sub);
  }

  @ApiOperation({ summary: 'Get service usage stats' })
  @Permissions('products:read')
  @Get(':id/usage')
  getUsage(@Param('id') id: string) {
    return this.servicesService.getUsage(id);
  }
}
