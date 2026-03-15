'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Target, Pencil, XCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import { api, type Goal } from '@/lib/api';
import { formatCurrency } from '@/components/shared/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type GoalFormData = {
  title: string;
  targetAmount: string;
  deadline: string;
};

const emptyForm: GoalFormData = { title: '', targetAmount: '', deadline: '' };

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalFormData>(emptyForm);

  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressAmount, setProgressAmount] = useState('');

  const fetchGoals = useCallback(async () => {
    try {
      const data = await api.goals.list();
      setGoals(data);
    } catch {
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  function openCreate() {
    setForm(emptyForm);
    setEditGoal(null);
    setCreateOpen(true);
  }

  function openEdit(goal: Goal) {
    setForm({
      title: goal.title,
      targetAmount: String(goal.targetAmount),
      deadline: goal.deadline ? goal.deadline.slice(0, 10) : '',
    });
    setEditGoal(goal);
    setCreateOpen(true);
  }

  function closeDialog() {
    setCreateOpen(false);
    setEditGoal(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.targetAmount) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        targetAmount: Number(form.targetAmount),
        deadline: form.deadline || undefined,
      };

      if (editGoal) {
        await api.goals.update(editGoal.id, payload);
        toast.success('Meta atualizada');
      } else {
        await api.goals.create(payload);
        toast.success('Meta criada');
      }
      closeDialog();
      await fetchGoals();
    } catch {
      toast.error('Erro ao salvar meta');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddProgress() {
    if (!progressGoal || !progressAmount) return;
    setSaving(true);
    try {
      await api.goals.addProgress(progressGoal.id, Number(progressAmount));
      toast.success(`Progresso adicionado!`);
      setProgressGoal(null);
      setProgressAmount('');
      await fetchGoals();
    } catch {
      toast.error('Erro ao adicionar progresso');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(goal: Goal) {
    try {
      await api.goals.update(goal.id, { status: 'CANCELLED' });
      toast.success('Meta cancelada');
      await fetchGoals();
    } catch {
      toast.error('Erro ao cancelar meta');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-full rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Metas</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhuma meta criada ainda.
            <br />
            Crie sua primeira meta!
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => openEdit(goal)}
              onAddProgress={() => {
                setProgressGoal(goal);
                setProgressAmount('');
              }}
              onCancel={() => handleCancel(goal)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editGoal ? 'Editar meta' : 'Nova meta'}</DialogTitle>
            <DialogDescription>
              {editGoal
                ? 'Atualize as informações da sua meta.'
                : 'Defina uma meta financeira para acompanhar.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Título</Label>
              <Input
                id="goal-title"
                placeholder="Ex: Reserva de emergência"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-amount">Valor alvo (R$)</Label>
              <Input
                id="goal-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="10000"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">Prazo (opcional)</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.targetAmount}>
              {saving && 'Salvando...'}
              {!saving && editGoal && 'Salvar'}
              {!saving && !editGoal && 'Criar meta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Progress Dialog */}
      <Dialog
        open={!!progressGoal}
        onOpenChange={(open) => {
          if (!open) {
            setProgressGoal(null);
            setProgressAmount('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar progresso</DialogTitle>
            <DialogDescription>
              Quanto você quer adicionar a &ldquo;{progressGoal?.title}&rdquo;?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="progress-amount">Valor (R$)</Label>
            <Input
              id="progress-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="500"
              value={progressAmount}
              onChange={(e) => setProgressAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddProgress}
              disabled={saving || !progressAmount || Number(progressAmount) <= 0}
            >
              {saving ? 'Adicionando...' : `Adicionar R$`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onAddProgress,
  onCancel,
}: {
  goal: Goal;
  onEdit: () => void;
  onAddProgress: () => void;
  onCancel: () => void;
}) {
  const pct = goal.targetAmount > 0
    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
    : 0;

  let progressColor = 'bg-emerald-500';
  if (goal.status === 'COMPLETED') {
    progressColor = 'bg-blue-500';
  } else if (goal.forecast?.onTrack === false) {
    progressColor = 'bg-yellow-500';
  }

  const statusConfig: Record<Goal['status'], { label: string; className: string }> = {
    ACTIVE: { label: 'Ativa', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20' },
    COMPLETED: { label: 'Concluída', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
    CANCELLED: { label: 'Cancelada', className: 'bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20' },
  };

  const statusBadge = statusConfig[goal.status];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{goal.title}</CardTitle>
          <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
            </span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Deadline */}
        {goal.deadline && (
          <p className="text-sm text-muted-foreground">
            Prazo:{' '}
            <span className="text-foreground">
              {format(parseISO(goal.deadline), "dd MMM yyyy", { locale: ptBR })}
            </span>
          </p>
        )}

        {/* Forecast */}
        {goal.forecast && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Previsão:{' '}
              {format(parseISO(goal.forecast.predictedDate), "dd MMM yyyy", { locale: ptBR })}
            </span>
            <Badge
              className={
                goal.forecast.onTrack
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20'
              }
            >
              {goal.forecast.onTrack ? 'No caminho' : 'Atrasado'}
            </Badge>
          </div>
        )}

        {/* Actions */}
        {goal.status === 'ACTIVE' && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={onAddProgress}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Adicionar progresso
            </Button>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Editar
            </Button>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onCancel}>
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
