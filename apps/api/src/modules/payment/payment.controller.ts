import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('payment')
@Controller({ path: 'payment', version: '1' })
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'List active payment gateways' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('settings:read')
  @Get('gateways')
  getGateways() {
    return this.paymentService.getActiveGateways();
  }

  @ApiOperation({ summary: 'Initiate a payment checkout' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('invoices:pay')
  @Post('initiate')
  initiatePayment(
    @Body() body: { gatewaySlug: string; invoiceId: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.initiatePayment(
      { gatewaySlug: body.gatewaySlug, invoiceId: body.invoiceId, clientId: user.sub },
      user.sub,
    );
  }

  @ApiOperation({ summary: 'Receive payment gateway webhook (public)' })
  @Post('webhook/:gatewaySlug')
  processWebhook(
    @Param('gatewaySlug') gatewaySlug: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ) {
    const body = req.body as Record<string, unknown>;
    return this.paymentService.processWebhook(gatewaySlug, body, headers);
  }

  @ApiOperation({ summary: 'List all transactions' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('invoices:read')
  @Get('transactions')
  getTransactions(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.paymentService.getAllTransactions({ page, perPage });
  }
}
