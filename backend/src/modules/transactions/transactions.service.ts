import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    type: TransactionType;
    amount: number;
    description: string;
    categoryId?: string;
    date?: string;
    messageLogId?: string;
  }) {
    return this.prisma.transaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        categoryId: data.categoryId,
        date: data.date ? new Date(data.date) : new Date(),
        messageLogId: data.messageLogId,
      },
      include: { category: true },
    });
  }

  async findAllByUser(
    userId: string,
    filters: {
      month?: string;
      year?: string;
      categoryId?: string;
      type?: TransactionType;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = { userId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.year || filters.month) {
      const year = filters.year ? parseInt(filters.year, 10) : new Date().getFullYear();
      const month = filters.month ? parseInt(filters.month, 10) : undefined;

      if (month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        where.date = { gte: start, lt: end };
      } else {
        const start = new Date(year, 0, 1);
        const end = new Date(year + 1, 0, 1);
        where.date = { gte: start, lt: end };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(id: string, userId: string, data: UpdateTransactionDto) {
    await this.findById(id, userId);

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: { category: true },
    });
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);

    return this.prisma.transaction.delete({ where: { id } });
  }

  async getMonthlySummary(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [incomeResult, expenseResult, transactionCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({
        where: { userId, date: { gte: start, lt: end } },
      }),
    ]);

    const totalIncome = incomeResult._sum.amount?.toNumber() ?? 0;
    const totalExpenses = expenseResult._sum.amount?.toNumber() ?? 0;

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount,
    };
  }

  async getCategoryBreakdown(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const groups = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'EXPENSE', date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    const total = groups.reduce(
      (sum, g) => sum + (g._sum.amount?.toNumber() ?? 0),
      0,
    );

    const categories = await Promise.all(
      groups.map(async (g) => {
        const category = g.categoryId
          ? await this.prisma.category.findUnique({ where: { id: g.categoryId } })
          : null;
        const amount = g._sum.amount?.toNumber() ?? 0;

        return {
          categoryId: g.categoryId,
          categoryName: category?.name ?? 'Uncategorized',
          total: amount,
          percentage: total > 0 ? Math.round((amount / total) * 10000) / 100 : 0,
        };
      }),
    );

    return categories.sort((a, b) => b.total - a.total);
  }

  async getWeeklyTotals(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: { type: true, amount: true, date: true },
      orderBy: { date: 'asc' },
    });

    const weeks: Array<{ week: number; income: number; expenses: number }> = [];
    const firstDay = start.getDay();

    for (const tx of transactions) {
      const dayOfMonth = tx.date.getDate() - 1;
      const weekIndex = Math.floor((dayOfMonth + firstDay) / 7);

      while (weeks.length <= weekIndex) {
        weeks.push({ week: weeks.length + 1, income: 0, expenses: 0 });
      }

      const amount = tx.amount.toNumber();
      if (tx.type === 'INCOME') {
        weeks[weekIndex].income += amount;
      } else {
        weeks[weekIndex].expenses += amount;
      }
    }

    return weeks;
  }
}
