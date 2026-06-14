import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('billing')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Invoices ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all invoices' })
  @Permissions('invoices:read')
  @Get('invoices')
  listInvoices(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.billingService.listInvoices({ page, perPage, clientId, status, search });
  }

  @ApiOperation({ summary: 'Get invoice by ID' })
  @Permissions('invoices:read')
  @Get('invoices/:id')
  getInvoice(@Param('id') id: string) {
    return this.billingService.getInvoice(id);
  }

  @ApiOperation({ summary: 'Create a new invoice' })
  @Permissions('invoices:create')
  @Post('invoices')
  createInvoice(
    @Body()
    body: {
      clientId: string;
      lineItems: { description: string; quantity: number; unitPrice: number; taxRate?: number; serviceId?: string; domainId?: string }[];
      dueDate: Date;
      notes?: string;
      currency?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.billingService.createInvoice(body, user.sub);
  }

  @ApiOperation({ summary: 'Send invoice to client' })
  @Permissions('invoices:update')
  @Post('invoices/:id/send')
  sendInvoice(@Param('id') id: string) {
    return this.billingService.sendInvoice(id);
  }

  @ApiOperation({ summary: 'Record a payment against an invoice' })
  @Permissions('invoices:pay')
  @Post('invoices/:id/payment')
  recordPayment(
    @Param('id') id: string,
    @Body() body: { amount: number; gateway: string; gatewayTransactionId?: string; fee?: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.billingService.recordPayment(id, body, user.sub);
  }

  @ApiOperation({ summary: 'Cancel an invoice' })
  @Permissions('invoices:update')
  @Patch('invoices/:id/cancel')
  cancelInvoice(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.cancelInvoice(id, user.sub);
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List transactions' })
  @Permissions('invoices:read')
  @Get('transactions')
  listTransactions(
    @Query('clientId') clientId?: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.billingService.listTransactions({ clientId, page, perPage });
  }

  // ─── Credit Notes ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Create a credit note' })
  @Permissions('invoices:create')
  @Post('credit-notes')
  createCreditNote(
    @Body() body: { clientId: string; invoiceId?: string; amount: number; currency: string; reason: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.billingService.createCreditNote(body, user.sub);
  }

  // ─── Tax Rules ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List tax rules' })
  @Permissions('settings:read')
  @Get('tax-rules')
  getTaxRules() {
    return this.billingService.getTaxRules();
  }

  @ApiOperation({ summary: 'Create a tax rule' })
  @Permissions('settings:update')
  @Post('tax-rules')
  createTaxRule(
    @Body()
    body: {
      name: string;
      rate: number;
      country?: string;
      state?: string;
      isCompound?: boolean;
      appliesTo?: string;
    },
  ) {
    return this.billingService.createTaxRule(body);
  }

  @ApiOperation({ summary: 'Update a tax rule' })
  @Permissions('settings:update')
  @Put('tax-rules/:id')
  updateTaxRule(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      rate: number;
      country: string;
      state: string;
      isCompound: boolean;
      appliesTo: string;
      isActive: boolean;
    }>,
  ) {
    return this.billingService.updateTaxRule(id, body);
  }
}
