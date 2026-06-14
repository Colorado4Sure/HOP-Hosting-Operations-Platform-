import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const [
      totalClients,
      activeServices,
      openTickets,
      paidInvoicesThisMonth,
      overdueCount,
      todayTransactions,
    ] = await Promise.all([
      this.prisma.client.count({ where: { status: "Active" } }),
      this.prisma.service.count({ where: { status: "Active" } }),
      this.prisma.ticket.count({
        where: { status: { in: ["Open", "Answered", "CustomerReply"] } },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: "Completed", createdAt: { gte: startOfMonth } },
      }),
      this.prisma.invoice.count({
        where: { status: "Unpaid", dueDate: { lt: now } },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: "Completed", createdAt: { gte: startOfToday } },
      }),
    ]);

    // MRR: sum of active monthly services
    const mrrResult = await this.prisma.service.aggregate({
      _sum: { amount: true },
      where: { status: "Active", billingCycle: "Monthly" },
    });

    return {
      totalClients,
      activeServices,
      openTickets,
      monthlyRevenue: Number(paidInvoicesThisMonth._sum.amount ?? 0),
      mrr: Number(mrrResult._sum.amount ?? 0),
      overdueInvoices: overdueCount,
      revenueToday: Number(todayTransactions._sum.amount ?? 0),
    };
  }

  async getRevenueReport(params: {
    startDate: Date;
    endDate: Date;
    groupBy: "day" | "month";
  }) {
    const { startDate, endDate, groupBy } = params;

    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: "Completed",
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: { amount: true, currency: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by day or month
    const grouped: Record<string, number> = {};
    for (const tx of transactions) {
      const d = new Date(tx.createdAt);
      const key =
        groupBy === "day"
          ? d.toISOString().split("T")[0]
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      grouped[key] = (grouped[key] ?? 0) + Number(tx.amount);
    }

    return Object.entries(grouped).map(([date, total]) => ({ date, total }));
  }

  async getClientReport(params: { startDate?: Date; endDate?: Date }) {
    const { startDate, endDate } = params;

    const where: Prisma.ClientWhereInput = {
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [allClients, activeCount, inactiveCount] = await Promise.all([
      this.prisma.client.findMany({
        where,
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.client.count({ where: { status: "Active" } }),
      this.prisma.client.count({ where: { status: { not: "Active" } } }),
    ]);

    // Group by month
    const byMonth: Record<string, number> = {};
    for (const c of allClients) {
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    }

    return {
      newClientsByMonth: Object.entries(byMonth).map(([month, count]) => ({
        month,
        count,
      })),
      activeCount,
      inactiveCount,
    };
  }

  async getServiceReport() {
    const [byStatus, topProducts] = await Promise.all([
      this.prisma.service.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.service.groupBy({
        by: ["productId"],
        _count: { _all: true },
        orderBy: { _count: { productId: "desc" } },
        take: 10,
      }),
    ]);

    const productIds = topProducts
      .map((p) => p.productId)
      .filter(Boolean) as string[];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

    return {
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count._all,
      })),
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        productName: p.productId
          ? (productMap[p.productId] ?? "Unknown")
          : "None",
        count: p._count._all,
      })),
    };
  }

  async getOverdueReport() {
    const now = new Date();
    return this.prisma.invoice.findMany({
      where: { status: "Unpaid", dueDate: { lt: now } },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  async getMrrReport() {
    const cycleMultiplier: Record<string, number> = {
      Monthly: 1,
      Quarterly: 1 / 3,
      SemiAnnually: 1 / 6,
      Annually: 1 / 12,
    };

    const services = await this.prisma.service.findMany({
      where: { status: "Active" },
      select: { billingCycle: true, amount: true, currency: true },
    });

    const mrrByCycle: Record<string, number> = {};
    let totalMrr = 0;

    for (const service of services) {
      const multiplier = cycleMultiplier[service.billingCycle] ?? 1;
      const monthly = Number(service.amount) * multiplier;
      mrrByCycle[service.billingCycle] =
        (mrrByCycle[service.billingCycle] ?? 0) + monthly;
      totalMrr += monthly;
    }

    return {
      totalMrr,
      byCycle: Object.entries(mrrByCycle).map(([cycle, mrr]) => ({
        cycle,
        mrr,
      })),
    };
  }
}
