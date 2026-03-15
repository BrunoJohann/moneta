'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Lightbulb,
  Brain,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { api, type AiInsight } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 10;

const TYPE_CONFIG: Record<
  AiInsight['type'],
  { label: string; className: string; borderColor: string; icon: React.ElementType }
> = {
  DAILY_SUMMARY: {
    label: 'Resumo Diário',
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
    borderColor: 'border-l-blue-500',
    icon: BarChart3,
  },
  SPENDING_ALERT: {
    label: 'Alerta de Gasto',
    className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20',
    borderColor: 'border-l-orange-500',
    icon: AlertTriangle,
  },
  FORECAST: {
    label: 'Previsão',
    className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20',
    borderColor: 'border-l-purple-500',
    icon: TrendingUp,
  },
  TIP: {
    label: 'Dica',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    borderColor: 'border-l-emerald-500',
    icon: Sparkles,
  },
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchInitial = useCallback(async () => {
    try {
      const data = await api.insights.list(PAGE_SIZE, 0);
      setInsights(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      toast.error('Erro ao carregar insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await api.insights.list(PAGE_SIZE, insights.length);
      setInsights((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      toast.error('Erro ao carregar mais insights');
    } finally {
      setLoadingMore(false);
    }
  }

  const grouped = groupByDate(insights);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-l-4 border-l-muted">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-6 w-6 text-yellow-500" />
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
      </div>

      {insights.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Brain className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center max-w-sm">
            Ainda sem insights. O coach financeiro começa a enviar insights após
            seu primeiro dia de uso.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ dateLabel, items }) => (
            <div key={dateLabel} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {dateLabel}
              </h2>
              <div className="space-y-3">
                {items.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: AiInsight }) {
  const config = TYPE_CONFIG[insight.type];
  const Icon = config.icon;

  return (
    <Card className={`border-l-4 ${config.borderColor}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <Badge className={config.className}>{config.label}</Badge>
          {insight.sentViaWhatsapp && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <MessageCircle className="h-3.5 w-3.5" />
              Enviado via WhatsApp
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-line">{insight.content}</p>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(insight.createdAt), "HH:mm", { locale: ptBR })}
        </p>
      </CardContent>
    </Card>
  );
}

function groupByDate(insights: AiInsight[]) {
  const map = new Map<string, AiInsight[]>();

  for (const insight of insights) {
    const dateKey = format(parseISO(insight.createdAt), 'yyyy-MM-dd');
    const existing = map.get(dateKey);
    if (existing) {
      existing.push(insight);
    } else {
      map.set(dateKey, [insight]);
    }
  }

  return Array.from(map.entries()).map(([dateKey, items]) => ({
    dateLabel: format(parseISO(dateKey), "dd MMM yyyy", { locale: ptBR }),
    items,
  }));
}
