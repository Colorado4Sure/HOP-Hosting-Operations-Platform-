import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

@Injectable()
export class AffiliatesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── Affiliates ────────────────────────────────────────────────────────────

  async listAffiliates(params: {
    page?: number;
    perPage?: number;
    status?: string;
  }) {
    const { page = 1, perPage = 25, status } = params;
    const skip = (page - 1) * perPage;

    const where: Prisma.AffiliateWhereInput = status
      ? { status: status as any }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.affiliate.findMany({
        where,
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.affiliate.count({ where }),
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

  async getAffiliate(id: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id },
      include: {
        client: true,
        referrals: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!affiliate) throw new NotFoundException(`Affiliate ${id} not found`);
    return affiliate;
  }

  async createAffiliate(
    clientId: string,
    data: {
      commissionType?: string;
      commissionValue?: number;
      payoutThreshold?: number;
      payoutMethod?: string;
    },
  ) {
    const code = randomBytes(6).toString("hex").toUpperCase();

    return this.prisma.affiliate.create({
      data: {
        clientId,
        code,
        status: "Pending",
        commissionType: (data.commissionType as any) ?? "Percentage",
        commissionValue: data.commissionValue ?? 10,
        payoutThreshold: data.payoutThreshold ?? 50,
        payoutMethod: data.payoutMethod,
      },
    });
  }

  async updateAffiliate(id: string, data: any) {
    return this.prisma.affiliate.update({ where: { id }, data });
  }

  async approveAffiliate(id: string, actorId: string) {
    const affiliate = await this.prisma.affiliate.update({
      where: { id },
      data: { status: "Active" },
    });

    await this.auditService.log({
      userId: actorId,
      action: "approve",
      resource: "affiliate",
      resourceId: id,
    });

    return affiliate;
  }

  async listReferrals(
    affiliateId: string,
    params: { page?: number; perPage?: number },
  ) {
    const { page = 1, perPage = 25 } = params;
    const skip = (page - 1) * perPage;

    const [data, total] = await Promise.all([
      this.prisma.referral.findMany({
        where: { affiliateId },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.referral.count({ where: { affiliateId } }),
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

  // ─── Discount Codes ────────────────────────────────────────────────────────

  async listDiscountCodes(params: {
    page?: number;
    perPage?: number;
    search?: string;
  }) {
    const { page = 1, perPage = 25, search } = params;
    const skip = (page - 1) * perPage;

    const where: Prisma.DiscountCodeWhereInput = search
      ? { code: { contains: search, mode: "insensitive" } }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.discountCode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.discountCode.count({ where }),
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

  async createDiscountCode(data: {
    code: string;
    description?: string;
    type?: string;
    value: number;
    currency?: string;
    usageLimit?: number;
    startsAt?: Date;
    expiresAt?: Date;
    appliesTo?: string;
    productIds?: string[];
  }) {
    return this.prisma.discountCode.create({ data: data as any });
  }

  async updateDiscountCode(id: string, data: any) {
    return this.prisma.discountCode.update({ where: { id }, data });
  }

  async validateDiscountCode(code: string) {
    const discount = await this.prisma.discountCode.findUnique({
      where: { code },
    });
    if (!discount)
      throw new NotFoundException(`Discount code '${code}' not found`);

    const now = new Date();

    if (!discount.isActive) {
      throw new BadRequestException("Discount code is not active");
    }
    if (discount.startsAt && discount.startsAt > now) {
      throw new BadRequestException("Discount code is not yet valid");
    }
    if (discount.expiresAt && discount.expiresAt < now) {
      throw new BadRequestException("Discount code has expired");
    }
    if (
      discount.usageLimit !== null &&
      discount.usedCount >= discount.usageLimit
    ) {
      throw new BadRequestException(
        "Discount code usage limit has been reached",
      );
    }

    return { valid: true, discount };
  }

  async applyDiscountCode(code: string) {
    const { discount } = await this.validateDiscountCode(code);
    return this.prisma.discountCode.update({
      where: { id: discount.id },
      data: { usedCount: { increment: 1 } },
    });
  }
}
