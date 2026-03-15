'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  api,
  type TransactionSummary,
  type CategoryBreakdown,
  type WeeklyTotal,
  type Transaction,
  type Forecast,
} from '@/lib/api';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart';
import { CategoryChart } from '@/components/dashboard/category-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [weeklyTotals, setWeeklyTotals] = useState<WeeklyTotal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    async function load() {
      try {
        const [summaryRes, categoriesRes, weeklyRes, txRes, forecastRes] =
          await Promise.allSettled([
            api.transactions.getSummary(year, month),
            api.transactions.getCategoryBreakdown(year, month),
            api.transactions.getWeeklyTotals(year, month),
            api.transactions.list({ limit: 5 }),
            api.forecast.get(),
          ]);

        if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
        if (categoriesRes.status === 'fulfilled') setCategories(categoriesRes.value);
        if (weeklyRes.status === 'fulfilled') setWeeklyTotals(weeklyRes.value);
        if (txRes.status === 'fulfilled') setTransactions(txRes.value.data);
        if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const now = new Date();
  const monthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground capitalize">{monthLabel}</p>
      </div>

      {summary && <SummaryCards summary={summary} forecast={forecast} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IncomeExpenseChart data={weeklyTotals} />
        <CategoryChart data={categories} />
      </div>

      <RecentTransactions transactions={transactions} />
    </div>
  );
}
