import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service.js';
import {
  MESSAGING_SERVICE,
  type IMessagingService,
} from '../messaging/interfaces/messaging.interface.js';
import { ForecastService } from '../forecast/forecast.service.js';

interface CategorySpending {
  categoryName: string;
  total: number;
}

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGING_SERVICE) private readonly messaging: IMessagingService,
    private readonly forecastService: ForecastService,
    private readonly config: ConfigService,
  ) {}

  async findByUser(userId: string, limit = 10, offset = 0) {
    return this.prisma.aiInsight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getLatest(userId: string) {
    return this.prisma.aiInsight.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Cron('0 11 * * *')
  async generateDailyInsights() {
    const users = await this.prisma.user.findMany({
      where: { whatsappVerified: true },
    });

    for (const user of users) {
      try {
        await this.generateInsightForUser(user.id, user.phone);
      } catch (error) {
        this.logger.error(
          `Failed to generate insight for user ${user.id}: ${error}`,
        );
      }
    }

    this.logger.log(
      `Daily insights generated for ${users.length} verified users`,
    );
  }

  private async generateInsightForUser(
    userId: string,
    phone: string | null,
  ) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);

    const [currentPeriod, previousPeriod] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: sevenDaysAgo, lte: now },
        },
        include: { category: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
        include: { category: true },
      }),
    ]);

    const currentByCategory = this.groupByCategory(currentPeriod);
    const previousByCategory = this.groupByCategory(previousPeriod);

    const spikes = this.detectSpikes(currentByCategory, previousByCategory);

    const forecast = await this.forecastService.getEndOfMonthForecast(userId);

    const totalSpent = currentPeriod.reduce(
      (sum: number, tx: { amount: unknown }) => sum + Number(tx.amount),
      0,
    );

    const insightText = this.composeDailyInsight({
      totalSpent,
      spikes,
      forecast,
    });

    const insight = await this.prisma.aiInsight.create({
      data: {
        userId,
        type: 'DAILY_SUMMARY',
        content: insightText,
        metadata: {
          totalSpent,
          spikes,
          projectedEndBalance: forecast.projectedEndBalance,
          riskLevel: forecast.riskLevel,
        },
        sentViaWhatsapp: !!phone,
      },
    });

    if (phone) {
      try {
        await this.messaging.sendText(phone, insightText);
      } catch (error) {
        this.logger.error(`Failed to send WhatsApp insight: ${error}`);
        await this.prisma.aiInsight.update({
          where: { id: insight.id },
          data: { sentViaWhatsapp: false },
        });
      }
    }

    return insight;
  }

  private groupByCategory(
    transactions: Array<{
      amount: unknown;
      category: { name: string } | null;
    }>,
  ): CategorySpending[] {
    const map = new Map<string, number>();

    for (const tx of transactions) {
      const name = tx.category?.name ?? 'Sem categoria';
      const current = map.get(name) ?? 0;
      map.set(name, current + Number(tx.amount));
    }

    return Array.from(map.entries()).map(([categoryName, total]) => ({
      categoryName,
      total,
    }));
  }

  private detectSpikes(
    current: CategorySpending[],
    previous: CategorySpending[],
  ) {
    const previousMap = new Map(
      previous.map((c) => [c.categoryName, c.total]),
    );

    return current
      .filter((c) => {
        const prev = previousMap.get(c.categoryName) ?? 0;
        return prev > 0 && c.total > prev * 1.3;
      })
      .map((c) => {
        const prev = previousMap.get(c.categoryName)!;
        return {
          categoryName: c.categoryName,
          current: c.total,
          previous: prev,
          percentageIncrease: Math.round(((c.total - prev) / prev) * 100),
        };
      })
      .sort((a, b) => b.percentageIncrease - a.percentageIncrease);
  }

  private composeDailyInsight(data: {
    totalSpent: number;
    spikes: Array<{
      categoryName: string;
      percentageIncrease: number;
    }>;
    forecast: {
      projectedEndBalance: number;
      riskLevel: string;
    };
  }): string {
    const parts: string[] = [
      `Bom dia! Nos últimos 7 dias você gastou R$ ${data.totalSpent.toFixed(2)}.`,
    ];

    if (data.spikes.length > 0) {
      const top = data.spikes[0];
      parts.push(
        `Categoria que mais cresceu: ${top.categoryName} (+${top.percentageIncrease}%).`,
      );
    }

    parts.push(
      `Previsão fim do mês: R$ ${data.forecast.projectedEndBalance.toFixed(2)}.`,
    );

    if (data.forecast.riskLevel === 'HIGH') {
      parts.push(
        'Atenção: risco alto de saldo negativo este mês. Considere revisar seus gastos.',
      );
    } else if (data.forecast.riskLevel === 'MEDIUM') {
      parts.push(
        'Dica: seus gastos estão se aproximando do limite. Fique de olho!',
      );
    } else {
      parts.push('Seus gastos estão dentro do esperado. Continue assim!');
    }

    return parts.join(' ');
  }
}
