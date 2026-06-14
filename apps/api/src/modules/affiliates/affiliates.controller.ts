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
import { AffiliatesService } from './affiliates.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('affiliates')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'affiliates', version: '1' })
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @ApiOperation({ summary: 'List affiliates' })
  @Permissions('affiliates:read')
  @Get()
  listAffiliates(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('status') status?: string,
  ) {
    return this.affiliatesService.listAffiliates({ page, perPage, status });
  }

  @ApiOperation({ summary: 'Create an affiliate record' })
  @Permissions('affiliates:manage')
  @Post()
  createAffiliate(@Body() body: { clientId: string; [key: string]: any }) {
    const { clientId, ...data } = body;
    return this.affiliatesService.createAffiliate(clientId, data);
  }

  @ApiOperation({ summary: 'List discount codes' })
  @Permissions('affiliates:read')
  @Get('discount-codes')
  listDiscountCodes(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('search') search?: string,
  ) {
    return this.affiliatesService.listDiscountCodes({ page, perPage, search });
  }

  @ApiOperation({ summary: 'Create a discount code' })
  @Permissions('affiliates:manage')
  @Post('discount-codes')
  createDiscountCode(@Body() body: any) {
    return this.affiliatesService.createDiscountCode(body);
  }

  @ApiOperation({ summary: 'Update a discount code' })
  @Permissions('affiliates:manage')
  @Put('discount-codes/:id')
  updateDiscountCode(@Param('id') id: string, @Body() body: any) {
    return this.affiliatesService.updateDiscountCode(id, body);
  }

  @ApiOperation({ summary: 'Validate a discount code (public / client)' })
  @Post('discount-codes/validate')
  validateDiscountCode(@Body() body: { code: string }) {
    return this.affiliatesService.validateDiscountCode(body.code);
  }

  @ApiOperation({ summary: 'Get affiliate by ID' })
  @Permissions('affiliates:read')
  @Get(':id')
  getAffiliate(@Param('id') id: string) {
    return this.affiliatesService.getAffiliate(id);
  }

  @ApiOperation({ summary: 'Update an affiliate' })
  @Permissions('affiliates:manage')
  @Put(':id')
  updateAffiliate(@Param('id') id: string, @Body() body: any) {
    return this.affiliatesService.updateAffiliate(id, body);
  }

  @ApiOperation({ summary: 'Approve an affiliate' })
  @Permissions('affiliates:manage')
  @Patch(':id/approve')
  approveAffiliate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.affiliatesService.approveAffiliate(id, user.sub);
  }

  @ApiOperation({ summary: "List an affiliate's referrals" })
  @Permissions('affiliates:read')
  @Get(':id/referrals')
  listReferrals(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.affiliatesService.listReferrals(id, { page, perPage });
  }
}
