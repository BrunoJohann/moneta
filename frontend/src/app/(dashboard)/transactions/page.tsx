'use client';

import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Receipt,
  Trash2,
} from 'lucide-react';
import {
  api,
  type Transaction,
  type Category,
  type PaginatedResponse,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/components/shared/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const ITEMS_PER_PAGE = 15;

// ── Skeleton loader ──────────────────────────────────────────────────

function TransactionCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-24" />
      </CardContent>
    </Card>
  );
}

// ── Empty state ──────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Receipt className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-lg font-medium">Nenhuma transação encontrada</p>
      <p className="text-sm text-muted-foreground mt-1">
        Tente ajustar os filtros ou adicione uma nova transação.
      </p>
    </div>
  );
}

// ── Transaction card ─────────────────────────────────────────────────

function TransactionCard({
  transaction,
  onClick,
}: {
  transaction: Transaction;
  onClick: () => void;
}) {
  const isIncome = transaction.type === 'income';
  const initial = transaction.category?.charAt(0).toUpperCase() ?? '?';
  const dateFormatted = format(parseISO(transaction.date), "dd 'de' MMMM", {
    locale: ptBR,
  });

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/40"
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-4">
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
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {transaction.category && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {transaction.category}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {dateFormatted}
            </span>
          </div>
        </div>

        <span
          className={cn(
            'text-sm font-semibold shrink-0 tabular-nums',
            isIncome
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400',
          )}
        >
          {isIncome ? '+ ' : '- '}
          {formatCurrency(transaction.amount)}
        </span>
      </CardContent>
    </Card>
  );
}

// ── Edit dialog ──────────────────────────────────────────────────────

function EditTransactionDialog({
  transaction,
  categories,
  open,
  onOpenChange,
  onSaved,
}: {
  transaction: Transaction | null;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description ?? '');
      setAmount(String(transaction.amount));
      setCategory(transaction.category ?? '');
      setType(transaction.type);
      setDate(transaction.date.slice(0, 10));
      setConfirmDelete(false);
    }
  }, [transaction]);

  async function handleSave() {
    if (!transaction) return;
    setSaving(true);
    try {
      await api.transactions.update(transaction.id, {
        description,
        amount: Number(amount),
        category,
        type,
        date,
      });
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await api.transactions.delete(transaction.id);
      onOpenChange(false);
      onSaved();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar transação</DialogTitle>
          <DialogDescription>
            Altere os dados da transação abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Valor</Label>
              <Input
                id="edit-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as 'income' | 'expense')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.icon ? `${c.icon} ` : ''}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            {confirmDelete ? 'Confirmar exclusão' : 'Excluir transação'}
          </Button>
          <Button onClick={handleSave} disabled={saving || deleting} size="sm">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'income' | 'expense'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaginatedResponse<Transaction> | null>(
    null,
  );
  const [categories, setCategories] = useState<Category[]>([]);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        month: month + 1,
        year,
        page,
        limit: ITEMS_PER_PAGE,
      };
      if (typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter !== 'all') params.categoryId = categoryFilter;

      const data = await api.transactions.list(
        params as Parameters<typeof api.transactions.list>[0],
      );
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [month, year, typeFilter, categoryFilter, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [month, year, typeFilter, categoryFilter]);

  function openEdit(tx: Transaction) {
    setEditingTx(tx);
    setDialogOpen(true);
  }

  const transactions = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">
            {MONTHS[month]} de {year} &middot; {total}{' '}
            {total === 1 ? 'transação' : 'transações'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="sm:hidden"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Filters */}
      <Card
        className={cn(
          'overflow-hidden transition-all',
          showFilters ? 'max-h-[500px]' : 'max-h-0 sm:max-h-[500px]',
          !showFilters && 'border-0 sm:border',
        )}
      >
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:flex-wrap">
          {/* Month */}
          <div className="grid gap-1.5 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">Mês</Label>
            <Select
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year */}
          <div className="grid gap-1.5 min-w-[100px]">
            <Label className="text-xs text-muted-foreground">Ano</Label>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="grid gap-1.5 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.icon ? `${c.icon} ` : ''}
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <div className="flex rounded-md border border-input overflow-hidden">
              {(
                [
                  ['all', 'Todos'],
                  ['income', 'Receitas'],
                  ['expense', 'Despesas'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTypeFilter(value)}
                  className={cn(
                    'px-3 h-9 text-sm font-medium transition-colors',
                    typeFilter === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-transparent text-muted-foreground hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction list */}
      <div className="space-y-2">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <TransactionCardSkeleton key={i} />
          ))}
        {!loading && transactions.length === 0 && <EmptyState />}
        {!loading &&
          transactions.length > 0 &&
          transactions.map((tx) => (
            <TransactionCard
              key={tx.id}
              transaction={tx}
              onClick={() => openEdit(tx)}
            />
          ))}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Edit dialog */}
      <EditTransactionDialog
        transaction={editingTx}
        categories={categories}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchTransactions}
      />
    </div>
  );
}
