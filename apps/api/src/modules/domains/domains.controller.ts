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
import { DomainsService } from './domains.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('domains')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'domains', version: '1' })
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @ApiOperation({ summary: 'List domains' })
  @Permissions('domains:read')
  @Get()
  listDomains(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.domainsService.listDomains({ page, perPage, clientId, status, search });
  }

  @ApiOperation({ summary: 'Register a domain' })
  @Permissions('domains:register')
  @Post()
  registerDomain(@Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.domainsService.registerDomain(body, user.sub);
  }

  @ApiOperation({ summary: 'List TLD pricing' })
  @Permissions('domains:read')
  @Get('tld-pricing')
  listTldPricing(@Query('search') search?: string) {
    return this.domainsService.listTldPricing({ search });
  }

  @ApiOperation({ summary: 'Upsert TLD pricing' })
  @Permissions('settings:update')
  @Post('tld-pricing')
  upsertTldPricing(
    @Body()
    body: {
      tld: string;
      registrar: string;
      registerPrice: number;
      renewPrice: number;
      transferPrice: number;
      currency?: string;
    },
  ) {
    return this.domainsService.upsertTldPricing(body);
  }

  @ApiOperation({ summary: 'Get domain by ID' })
  @Permissions('domains:read')
  @Get(':id')
  getDomain(@Param('id') id: string) {
    return this.domainsService.getDomain(id);
  }

  @ApiOperation({ summary: 'Update a domain' })
  @Permissions('domains:register')
  @Put(':id')
  updateDomain(@Param('id') id: string, @Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.domainsService.updateDomain(id, body, user.sub);
  }

  @ApiOperation({ summary: 'Renew a domain' })
  @Permissions('domains:renew')
  @Post(':id/renew')
  renewDomain(
    @Param('id') id: string,
    @Body() body: { years: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.domainsService.renewDomain(id, body.years, user.sub);
  }

  @ApiOperation({ summary: 'Transfer a domain' })
  @Permissions('domains:transfer')
  @Post(':id/transfer')
  transferDomain(
    @Param('id') id: string,
    @Body() body: { epp: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.domainsService.transferDomain(id, body.epp, user.sub);
  }

  @ApiOperation({ summary: 'Update nameservers' })
  @Permissions('domains:register')
  @Patch(':id/nameservers')
  updateNameservers(
    @Param('id') id: string,
    @Body() body: { nameservers: string[] },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.domainsService.updateNameservers(id, body.nameservers, user.sub);
  }

  @ApiOperation({ summary: 'Toggle auto-renew on a domain' })
  @Permissions('domains:renew')
  @Patch(':id/auto-renew')
  toggleAutoRenew(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.domainsService.toggleAutoRenew(id, user.sub);
  }
}
