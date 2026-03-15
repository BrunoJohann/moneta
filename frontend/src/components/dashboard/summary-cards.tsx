'use client';

import { Wallet, TrendingUp, TrendingDown, LineChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/components/shared/currency';
import type { TransactionSummary, Forecast } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  summary: TransactionSummary;
  forecast: Forecast | null;
}

const trendConfig = {
  up: { label: 'Alta', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  stable: { label: 'Estável', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
  down: { label: 'Queda', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
} as const;

export function SummaryCards({ summary, forecast }: SummaryCardsProps) {
  const trend = forecast?.trend ?? 'stable';
  const trendInfo = trendConfig[trend];

  const cards = [
    {
      title: 'Saldo do Mês',
      value: summary.balance,
      icon: Wallet,
      valueClassName: summary.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
    },
    {
      title: 'Receitas',
      value: summary.totalIncome,
      icon: TrendingUp,
      valueClassName: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Despesas',
      value: summary.totalExpenses,
      icon: TrendingDown,
      valueClassName: 'text-red-600 dark:text-red-400',
    },
    {
      title: 'Previsão Fim do Mês',
      value: forecast?.projectedBalance ?? 0,
      icon: LineChart,
      valueClassName: cn(
        trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
        trend === 'stable' && 'text-yellow-600 dark:text-yellow-400',
        trend === 'down' && 'text-red-600 dark:text-red-400',
      ),
      badge: forecast ? (
        <Badge className={cn('text-[10px] font-medium border-0', trendInfo.className)}>
          {trendInfo.label}
        </Badge>
      ) : null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-bold', card.valueClassName)}>
                {formatCurrency(card.value)}
              </span>
              {card.badge}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
