import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // â”€â”€â”€ Invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async listInvoices(params: { page?: number; perPage?: number; clientId?: string; status?: string; search?: string }) {
    const { page: _page, perPage: _perPage, clientId, status, search } = params;
    const page = Math.max(1, parseInt(String(_page ?? 1), 10) || 1);
    const perPage = Math.max(1, parseInt(String(_perPage ?? 25), 10) || 25);
    const skip = (Math.max(1, Number.isFinite(+page) ? +page : 1) - 1) * Math.max(1, Number.isFinite(+perPage) ? +perPage : 25);

    const where: Prisma.InvoiceWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search ? { invoiceNumber: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { client: { select: { firstName: true, lastName: true, email: true } }, lineItems: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, meta: { total, page, perPage, totalPages: Math.ceil(total / perPage), hasPreviousPage: page > 1, hasNextPage: page < Math.ceil(total / perPage) } };
  }

  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lineItems: true, transactions: true, creditNotes: true },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async createInvoice(data: {
    clientId: string;
    lineItems: { description: string; quantity: number; unitPrice: number; taxRate?: number; serviceId?: string; domainId?: string }[];
    dueDate: Date;
    notes?: string;
    currency?: string;
  }, actorId: string) {
    const client = await this.prisma.client.findUniqueOrThrow({ where: { id: data.clientId } });
    const currency = data.currency ?? client.currencyCode;

    // Generate invoice number
    const setting = await this.prisma.setting.findUnique({ where: { key: 'invoice_prefix' } });
    const prefix = setting?.value ?? 'INV-';
    const count = await this.prisma.invoice.count();
    const invoiceNumber = `${prefix}${String(count + 1).padStart(6, '0')}`;

    // Calculate totals
    const lineItems = data.lineItems.map((item) => {
      const subtotal = item.quantity * item.unitPrice;
      const taxRate = item.taxRate ?? 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      return { ...item, taxRate, taxAmount, subtotal, total };
    });

    const subtotal = lineItems.reduce((s, i) => s + i.subtotal, 0);
    const taxTotal = lineItems.reduce((s, i) => s + i.taxAmount, 0);
    const total = subtotal + taxTotal;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: data.clientId,
        status: 'Unpaid',
        currency,
        subtotal,
        taxTotal,
        total,
        dueDate: data.dueDate,
        notes: data.notes,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true },
    });

    await this.auditService.log({ userId: actorId, action: 'create', resource: 'invoice', resourceId: invoice.id });

    // Send invoice email
    this.notificationsService.sendEmail('invoice-created', client.email, {
      first_name: client.firstName,
      invoice_number: invoice.invoiceNumber,
      amount: `${currency} ${total.toFixed(2)}`,
      due_date: data.dueDate.toLocaleDateString(),
    }).catch(() => {});

    return invoice;
  }

  async sendInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id },
      include: { client: true },
    });

    await this.prisma.invoice.update({ where: { id }, data: { sentAt: new Date() } });

    await this.notificationsService.sendEmail('invoice-created', invoice.client.email, {
      first_name: invoice.client.firstName,
      invoice_number: invoice.invoiceNumber,
      amount: `${invoice.currency} ${invoice.total.toFixed(2)}`,
      due_date: invoice.dueDate.toLocaleDateString(),
    });

    return { message: 'Invoice sent' };
  }

  async recordPayment(invoiceId: string, data: { amount: number; gateway: string; gatewayTransactionId?: string; fee?: number }, actorId: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { client: true } });

    const newAmountPaid = invoice.amountPaid + data.amount;
    const newStatus = newAmountPaid >= invoice.total ? 'Paid' : 'PartiallyPaid';

    await this.prisma.$transaction([
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus,
          paidAt: newStatus === 'Paid' ? new Date() : undefined,
        },
      }),
      this.prisma.transaction.create({
        data: {
          clientId: invoice.clientId,
          invoiceId,
          type: 'Payment',
          status: 'Completed',
          gateway: data.gateway,
          gatewayTransactionId: data.gatewayTransactionId,
          amount: data.amount,
          currency: invoice.currency,
          fee: data.fee,
        },
      }),
    ]);

    if (newStatus === 'Paid') {
      this.notificationsService.sendEmail('payment-received', invoice.client.email, {
        first_name: invoice.client.firstName,
        invoice_number: invoice.invoiceNumber,
        amount: `${invoice.currency} ${data.amount.toFixed(2)}`,
      }).catch(() => {});
    }

    await this.auditService.log({ userId: actorId, action: 'record-payment', resource: 'invoice', resourceId: invoiceId, metadata: data });

    return { message: 'Payment recorded', status: newStatus };
  }

  async cancelInvoice(id: string, actorId: string) {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'Cancelled' },
    });
    await this.auditService.log({ userId: actorId, action: 'cancel', resource: 'invoice', resourceId: id });
    return invoice;
  }

  // â”€â”€â”€ Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async listTransactions(params: { page?: number; perPage?: number; clientId?: string }) {
    const { page: _page, perPage: _perPage, clientId } = params;
    const page = Math.max(1, parseInt(String(_page ?? 1), 10) || 1);
    const perPage = Math.max(1, parseInt(String(_perPage ?? 25), 10) || 25);
    const skip = (Math.max(1, Number.isFinite(+page) ? +page : 1) - 1) * Math.max(1, Number.isFinite(+perPage) ? +perPage : 25);
    const where = clientId ? { clientId } : {};

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: perPage }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, meta: { total, page, perPage, totalPages: Math.ceil(total / perPage), hasPreviousPage: page > 1, hasNextPage: page < Math.ceil(total / perPage) } };
  }

  // â”€â”€â”€ Credit Notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async createCreditNote(data: { clientId: string; invoiceId?: string; amount: number; currency: string; reason: string }, actorId: string) {
    const count = await this.prisma.creditNote.count();
    const creditNoteNumber = `CN-${String(count + 1).padStart(6, '0')}`;

    const creditNote = await this.prisma.creditNote.create({
      data: { ...data, creditNoteNumber },
    });

    await this.auditService.log({ userId: actorId, action: 'create', resource: 'credit-note', resourceId: creditNote.id });
    return creditNote;
  }

  // â”€â”€â”€ Tax Rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async getTaxRules() {
    return this.prisma.taxRule.findMany({ orderBy: { name: 'asc' } });
  }

  async createTaxRule(data: { name: string; rate: number; country?: string; state?: string; isCompound?: boolean; appliesTo?: string }) {
    return this.prisma.taxRule.create({ data });
  }

  async updateTaxRule(id: string, data: Partial<{ name: string; rate: number; country: string; state: string; isCompound: boolean; appliesTo: string; isActive: boolean }>) {
    return this.prisma.taxRule.update({ where: { id }, data });
  }
}
