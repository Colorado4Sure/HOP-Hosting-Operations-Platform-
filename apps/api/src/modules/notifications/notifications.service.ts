import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const host = this.configService.get<string>("SMTP_HOST");
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>("SMTP_PORT", 587),
        secure: this.configService.get<boolean>("SMTP_SECURE", false),
        auth: {
          user: this.configService.get<string>("SMTP_USER"),
          pass: this.configService.get<string>("SMTP_PASS"),
        },
      });
    }
  }

  async sendEmail(
    templateSlug: string,
    recipient: string,
    variables: Record<string, string>,
  ) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { slug: templateSlug },
    });
    if (!template) {
      this.logger.warn(`Email template not found: ${templateSlug}`);
      return;
    }

    const subject = this.interpolate(template.subject, variables);
    const bodyHtml = this.interpolate(template.bodyHtml, variables);
    const bodyText = template.bodyText
      ? this.interpolate(template.bodyText, variables)
      : undefined;

    const logEntry = await this.prisma.notificationLog.create({
      data: {
        channel: "Email",
        recipient,
        templateSlug,
        subject,
        body: bodyHtml,
        status: "Queued",
      },
    });

    if (!this.transporter) {
      this.logger.warn(
        `SMTP not configured â€” skipping email to ${recipient} (${templateSlug})`,
      );
      await this.prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: { status: "Failed", errorMessage: "SMTP not configured" },
      });
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>("SMTP_FROM", "noreply@hop.local"),
        to: recipient,
        subject,
        html: bodyHtml,
        text: bodyText,
      });

      await this.prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: { status: "Sent", sentAt: new Date() },
      });

      this.logger.log(`Email sent to ${recipient} (${templateSlug})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email to ${recipient}: ${message}`);
      await this.prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: { status: "Failed", errorMessage: message },
      });
    }
  }

  async getTemplates() {
    return this.prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
  }

  async createTemplate(data: {
    name: string;
    slug: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    variables?: string[];
  }) {
    return this.prisma.emailTemplate.create({ data });
  }

  async updateTemplate(
    id: string,
    data: { subject?: string; bodyHtml?: string; bodyText?: string },
  ) {
    return this.prisma.emailTemplate.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  async deleteTemplate(id: string) {
    const tpl = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (tpl?.isSystem) throw new Error('Cannot delete system templates');
    return this.prisma.emailTemplate.delete({ where: { id } });
  }

  async getLogs(params: { page?: number; perPage?: number; status?: string }) {
    const { page: _page, perPage: _perPage, status } = params;
    const page = Math.max(1, parseInt(String(_page ?? 1), 10) || 1);
    const perPage = Math.max(1, parseInt(String(_perPage ?? 25), 10) || 25);
    const skip = (Math.max(1, Number.isFinite(+page) ? +page : 1) - 1) * Math.max(1, Number.isFinite(+perPage) ? +perPage : 25);
    const where = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.notificationLog.count({ where }),
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

  private interpolate(
    template: string,
    variables: Record<string, string>,
  ): string {
    return template.replace(
      /\{(\w+)\}/g,
      (_, key) => variables[key] ?? `{${key}}`,
    );
  }
}
