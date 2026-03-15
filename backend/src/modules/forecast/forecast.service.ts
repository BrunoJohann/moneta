import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface EndOfMonthForecast {
  currentBalance: number;
  projectedEndBalance: number;
  projectedTotalExpenses: number;
  dailyExpenseRate: number;
  riskLevel: RiskLevel;
  riskDate: Date | null;
}

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  async getEndOfMonthForecast(userId: string): Promise<EndOfMonthForecast> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const totalDaysInMonth = endOfMonth.getDate();
    const daysSoFar = Math.max(1, now.getDate());
    const remainingDays = totalDaysInMonth - daysSoFar;

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: now },
      },
    });

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (tx.type === 'INCOME') {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }
    }

    const dailyExpenseRate = totalExpenses / daysSoFar;
    const projectedRemainingExpenses = dailyExpenseRate * remainingDays;
    const projectedTotalExpenses = totalExpenses + projectedRemainingExpenses;
    const currentBalance = totalIncome - totalExpenses;
    const projectedEndBalance = totalIncome - projectedTotalExpenses;

    let riskDate: Date | null = null;
    if (projectedEndBalance < 0 && dailyExpenseRate > 0) {
      const daysUntilNegative = currentBalance / dailyExpenseRate;
      riskDate = new Date(now.getTime() + daysUntilNegative * 86_400_000);
    }

    let riskLevel: RiskLevel;
    if (totalIncome === 0) {
      riskLevel = projectedTotalExpenses > 0 ? 'HIGH' : 'LOW';
    } else if (projectedEndBalance < 0) {
      riskLevel = 'HIGH';
    } else if (projectedEndBalance < totalIncome * 0.2) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    return {
      currentBalance: Math.round(currentBalance * 100) / 100,
      projectedEndBalance: Math.round(projectedEndBalance * 100) / 100,
      projectedTotalExpenses: Math.round(projectedTotalExpenses * 100) / 100,
      dailyExpenseRate: Math.round(dailyExpenseRate * 100) / 100,
      riskLevel,
      riskDate,
    };
  }
}
