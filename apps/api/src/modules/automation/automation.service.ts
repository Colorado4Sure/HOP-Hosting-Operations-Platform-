import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Job Registry ──────────────────────────────────────────────────────────

  async listJobs() {
    return this.prisma.automationJob.findMany({ orderBy: { slug: 'asc' } });
  }

  async getJob(slug: string) {
    return this.prisma.automationJob.findUnique({ where: { slug } });
  }

  async updateJob(
    slug: string,
    data: { schedule?: string; isEnabled?: boolean; description?: string },
  ) {
    return this.prisma.automationJob.update({ where: { slug }, data });
  }

  async getJobLogs(slug: string, params: { page?: number; perPage?: number }) {
    const { page = 1, perPage = 25 } = params;
    const skip = (page - 1) * perPage;

    const [data, total] = await Promise.all([
      this.prisma.jobRunLog.findMany({
        where: { jobSlug: slug },
        orderBy: { startedAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.jobRunLog.count({ where: { jobSlug: slug } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(total / perPage),
      },
    };
  }

  async manualRun(slug: string, actorId: string) {
    const job = await this.prisma.automationJob.findUnique({ where: { slug } });
    if (!job) throw new Error(`Automation job '${slug}' not found`);

    await this.prisma.automationJob.update({
      where: { slug },
      data: { lastRunAt: new Date(), lastRunStatus: 'Running' },
    });

    const log = await this.prisma.jobRunLog.create({
      data: { jobSlug: slug, startedAt: new Date(), status: 'Running' },
    });

    let result: string;
    let status: 'Success' | 'Failed';

    try {
      switch (slug) {
        case 'generate-invoices':
          result = await this.runInvoiceGeneration();
          break;
        case 'suspend-overdue':
          result = await this.runSuspendOverdue();
          break;
        case 'domain-expiry':
          result = await this.runDomainExpiryReminders();
          break;
        case 'payment-reminders':
          result = await this.runPaymentReminders();
          break;
        case 'prune-notification-logs':
          result = await this.runPruneNotificationLogs();
          break;
        default:
          result = `Unknown job slug: ${slug}`;
      }
      status = 'Success';
    } catch (error: any) {
      result = error?.message ?? 'Unknown error';
      status = 'Failed';
    }

    await Promise.all([
      this.prisma.jobRunLog.update({
        where: { id: log.id },
        data: { completedAt: new Date(), status, output: result },
      }),
      this.prisma.automationJob.update({
        where: { slug },
        data: { lastRunStatus: status },
      }),
    ]);

    await this.auditService.log({
      userId: actorId,
      action: 'manual-run',
      resource: 'automation-job',
      resourceId: slug,
      metadata: { status, output: result },
    });

    return { slug, status, output: result, completedAt: new Date() };
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  private async runInvoiceGeneration(): Promise<string> {
    const now = new Date();

    const services = await this.prisma.service.findMany({
      where: {
        status: 'Active',
        nextDueDate: { lte: now },
      },
      include: { client: true, product: true },
    });

    let generated = 0;

    for (const service of services) {
      try {
        const prefix = 'INV-';
        const count = await this.prisma.invoice.count();
        const invoiceNumber = `${prefix}${String(count + 1).padStart(6, '0')}`;

        await this.prisma.invoice.create({
          data: {
            invoiceNumber,
            clientId: service.clientId,
            status: 'Unpaid',
            currency: service.currency,
            subtotal: service.amount,
            taxTotal: 0,
            total: service.amount,
            dueDate: service.nextDueDate,
            lineItems: {
              create: {
                description: `${service.product?.name ?? 'Service'} - ${service.billingCycle}`,
                quantity: 1,
                unitPrice: service.amount,
                taxRate: 0,
                taxAmount: 0,
                subtotal: service.amount,
                total: service.amount,
                serviceId: service.id,
              },
            },
          },
        });

        // Advance next due date
        const next = new Date(service.nextDueDate);
        if (service.billingCycle === 'Monthly') next.setMonth(next.getMonth() + 1);
        else if (service.billingCycle === 'Annually') next.setFullYear(next.getFullYear() + 1);
        else if (service.billingCycle === 'Quarterly') next.setMonth(next.getMonth() + 3);
        else next.setMonth(next.getMonth() + 1);

        await this.prisma.service.update({
          where: { id: service.id },
          data: { nextDueDate: next },
        });

        generated++;
      } catch (err) {
        this.logger.error(`Failed to generate invoice for service ${service.id}`, err);
      }
    }

    return `Generated ${generated} invoices`;
  }

  private async runSuspendOverdue(): Promise<string> {
    const gracePeriodDays = 3;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - gracePeriodDays);

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { status: 'Unpaid', dueDate: { lt: cutoff } },
      include: { lineItems: { select: { serviceId: true } } },
    });

    let suspended = 0;

    for (const invoice of overdueInvoices) {
      const serviceIds = invoice.lineItems
        .map((li) => li.serviceId)
        .filter(Boolean) as string[];

      for (const serviceId of serviceIds) {
        try {
          await this.prisma.service.updateMany({
            where: { id: serviceId, status: 'Active' },
            data: { status: 'Suspended', suspendedAt: new Date() },
          });
          suspended++;
        } catch (err) {
          this.logger.error(`Failed to suspend service ${serviceId}`, err);
        }
      }
    }

    return `Suspended ${suspended} overdue services`;
  }

  private async runDomainExpiryReminders(): Promise<string> {
    const thresholds = [30, 14, 7, 1];
    let sent = 0;

    for (const days of thresholds) {
      const future = new Date();
      future.setDate(future.getDate() + days);
      const dayStart = new Date(future);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(future);
      dayEnd.setHours(23, 59, 59, 999);

      const domains = await this.prisma.domain.findMany({
        where: { expiryDate: { gte: dayStart, lte: dayEnd }, status: 'Active' },
        include: { client: true },
      });

      for (const domain of domains) {
        try {
          await this.notificationsService.sendEmail('domain-expiry', domain.client.email, {
            first_name: domain.client.firstName,
            domain: domain.domain,
            expiry_date: domain.expiryDate.toLocaleDateString(),
            days_remaining: String(days),
          });
          sent++;
        } catch (err) {
          this.logger.error(`Failed to send domain expiry email for ${domain.domain}`, err);
        }
      }
    }

    return `Sent ${sent} domain expiry reminders`;
  }

  private async runPaymentReminders(): Promise<string> {
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { status: 'Unpaid', dueDate: { lt: new Date() } },
      include: { client: true },
    });

    let sent = 0;

    for (const invoice of overdueInvoices) {
      try {
        await this.notificationsService.sendEmail('payment-overdue', invoice.client.email, {
          first_name: invoice.client.firstName,
          invoice_number: invoice.invoiceNumber,
          amount: `${invoice.currency} ${invoice.total.toFixed(2)}`,
          due_date: invoice.dueDate.toLocaleDateString(),
        });
        sent++;
      } catch (err) {
        this.logger.error(`Failed to send payment reminder for invoice ${invoice.id}`, err);
      }
    }

    return `Sent ${sent} payment reminder emails`;
  }

  private async runPruneNotificationLogs(): Promise<string> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const { count } = await this.prisma.notificationLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return `Pruned ${count} notification log entries older than 90 days`;
  }

  // ─── Scheduled Tasks ───────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduledInvoiceGeneration() {
    this.logger.log('Running scheduled invoice generation');
    await this.runInvoiceGeneration().catch((err) =>
      this.logger.error('Invoice generation failed', err),
    );
  }

  @Cron('0 1 * * *') // 1:00 AM daily
  async scheduledSuspendOverdue() {
    this.logger.log('Running scheduled suspend-overdue');
    await this.runSuspendOverdue().catch((err) =>
      this.logger.error('Suspend overdue failed', err),
    );
  }

  @Cron('0 2 * * *') // 2:00 AM daily
  async scheduledDomainExpiryReminders() {
    this.logger.log('Running domain expiry reminders');
    await this.runDomainExpiryReminders().catch((err) =>
      this.logger.error('Domain expiry reminders failed', err),
    );
  }

  @Cron('0 9 * * *') // 9:00 AM daily
  async scheduledPaymentReminders() {
    this.logger.log('Running payment reminders');
    await this.runPaymentReminders().catch((err) =>
      this.logger.error('Payment reminders failed', err),
    );
  }

  @Cron(CronExpression.EVERY_WEEK)
  async scheduledPruneNotificationLogs() {
    this.logger.log('Pruning notification logs');
    await this.runPruneNotificationLogs().catch((err) =>
      this.logger.error('Prune notification logs failed', err),
    );
  }
}
