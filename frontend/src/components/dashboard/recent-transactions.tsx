'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/components/shared/currency';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/api';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === 'income';
  const initial = transaction.category?.charAt(0).toUpperCase() ?? '?';
  const dateFormatted = format(parseISO(transaction.date), "dd MMM yyyy", { locale: ptBR });

  return (
    <div className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          isIncome
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        )}
      >
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {transaction.description || transaction.category}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {transaction.category && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {transaction.category}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{dateFormatted}</span>
        </div>
      </div>

      <span
        className={cn(
          'text-sm font-semibold shrink-0',
          isIncome
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400',
        )}
      >
        {isIncome ? '+ ' : '- '}{formatCurrency(transaction.amount)}
      </span>
    </div>
  );
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Transações Recentes</CardTitle>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma transação encontrada
          </p>
        ) : (
          <div className="space-y-1">
            {transactions.map((t) => (
              <TransactionItem key={t.id} transaction={t} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
