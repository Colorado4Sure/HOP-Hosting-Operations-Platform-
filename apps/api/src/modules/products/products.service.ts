import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ─── Product Groups ────────────────────────────────────────────────────────

  async listProductGroups() {
    return this.prisma.productGroup.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async createProductGroup(data: {
    name: string;
    headline?: string;
    description?: string;
    isVisible?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.productGroup.create({ data });
  }

  async updateProductGroup(
    id: string,
    data: Partial<{
      name: string;
      headline: string;
      description: string;
      isVisible: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.prisma.productGroup.update({ where: { id }, data });
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  async listProducts(params: {
    page?: number;
    perPage?: number;
    status?: string;
    groupId?: string;
    search?: string;
  }) {
    const { page = 1, perPage = 25, status, groupId, search } = params;
    const skip = (page - 1) * perPage;

    const where: Prisma.ProductWhereInput = {
      ...(status ? { status: status as any } : {}),
      ...(groupId ? { groupId } : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          group: true,
          pricing: true,
          configurableOptions: { include: { values: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.product.count({ where }),
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

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        group: true,
        pricing: true,
        configurableOptions: { include: { values: true } },
      },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async createProduct(data: {
    groupId?: string;
    name: string;
    description?: string;
    type?: string;
    status?: string;
    moduleType?: string;
    moduleSettings?: Record<string, unknown>;
    stockEnabled?: boolean;
    stockLevel?: number;
    pricing?: {
      billingCycle: string;
      currency: string;
      price: number;
      setupFee?: number;
    }[];
    configurableOptions?: any[];
  }) {
    const { pricing, configurableOptions, ...productData } = data;

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        ...(pricing ? { pricing: { create: pricing } } : {}),
        ...(configurableOptions
          ? {
              configurableOptions: {
                create: configurableOptions.map((opt: any) => ({
                  ...opt,
                  values: opt.values ? { create: opt.values } : undefined,
                })),
              },
            }
          : {}),
      } as any,
      include: {
        pricing: true,
        configurableOptions: { include: { values: true } },
      },
    });

    return product;
  }

  async updateProduct(
    id: string,
    data: Partial<{
      groupId: string;
      name: string;
      description: string;
      type: string;
      status: string;
      moduleType: string;
      moduleSettings: Record<string, unknown>;
      stockEnabled: boolean;
      stockLevel: number;
    }>,
  ) {
    return this.prisma.product.update({ where: { id }, data: data as any });
  }

  async deleteProduct(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { status: "Inactive" },
    });
  }

  // ─── Pricing ───────────────────────────────────────────────────────────────

  async addPricing(
    productId: string,
    data: {
      billingCycle: string;
      currency: string;
      price: number;
      setupFee?: number;
    },
  ) {
    return this.prisma.productPricing.create({ data: { ...data, productId } as any });
  }

  async updatePricing(
    id: string,
    data: Partial<{
      billingCycle: string;
      currency: string;
      price: number;
      setupFee: number;
    }>,
  ) {
    return this.prisma.productPricing.update({ where: { id }, data: data as any });
  }

  async removePricing(id: string) {
    return this.prisma.productPricing.delete({ where: { id } });
  }

  // ─── Addons ────────────────────────────────────────────────────────────────

  async listAddons(params: { page?: number; perPage?: number }) {
    const { page = 1, perPage = 25 } = params;
    const skip = (page - 1) * perPage;

    const [data, total] = await Promise.all([
      this.prisma.productAddon.findMany({
        include: { pricing: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.productAddon.count(),
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

  async createAddon(data: {
    productId?: string;
    name: string;
    description?: string;
    isRecurring?: boolean;
    pricing?: any[];
  }) {
    const { pricing, ...addonData } = data;
    return this.prisma.productAddon.create({
      data: {
        ...addonData,
        ...(pricing ? { pricing: { create: pricing } } : {}),
      },
      include: { pricing: true },
    });
  }
}
