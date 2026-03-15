'use client';

import { useEffect, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, type Category, type ParsedAction } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ParsedPreviewProps {
  parsedResult: ParsedAction;
  isEditing: boolean;
  editedFields: Partial<ParsedAction>;
  onStartEditing: () => void;
  onUpdateField: (field: keyof ParsedAction, value: string | number) => void;
  onConfirm: () => void;
  isConfirming?: boolean;
}

const TYPE_CONFIG = {
  expense: { label: 'Despesa', className: 'bg-red-500/15 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800' },
  income: { label: 'Receita', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800' },
  goal: { label: 'Meta', className: 'bg-blue-500/15 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800' },
  reminder: { label: 'Lembrete', className: 'bg-amber-500/15 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800' },
} as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function toInputDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

export function ParsedPreview({
  parsedResult,
  isEditing,
  editedFields,
  onStartEditing,
  onUpdateField,
  onConfirm,
  isConfirming = false,
}: ParsedPreviewProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  const typeConfig = TYPE_CONFIG[parsedResult.type];
  const currentAmount = editedFields.amount ?? parsedResult.amount;
  const currentCategory = editedFields.category ?? parsedResult.category;
  const currentDate = editedFields.date ?? parsedResult.date;
  const currentDescription = editedFields.description ?? parsedResult.description;

  const filteredCategories = categories.filter((c) =>
    parsedResult.type === 'expense' ? c.type === 'expense' : c.type === 'income'
  );

  return (
    <Card className={cn(
      'border-l-4 animate-in slide-in-from-bottom-2 duration-300',
      parsedResult.type === 'expense' && 'border-l-red-500',
      parsedResult.type === 'income' && 'border-l-emerald-500',
      parsedResult.type === 'goal' && 'border-l-blue-500',
      parsedResult.type === 'reminder' && 'border-l-amber-500',
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge className={cn('font-medium', typeConfig.className)}>
            {typeConfig.label}
          </Badge>
        </div>

        <div className="space-y-2.5">
          {currentAmount !== undefined && (
            <FieldRow label="Valor" isEditing={isEditing}>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentAmount}
                  onChange={(e) => onUpdateField('amount', Number.parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              ) : (
                <span className="font-semibold text-foreground">
                  {formatCurrency(currentAmount)}
                </span>
              )}
            </FieldRow>
          )}

          {currentCategory && (
            <FieldRow label="Categoria" isEditing={isEditing}>
              {isEditing ? (
                <Select
                  value={currentCategory}
                  onValueChange={(val) => onUpdateField('category', val)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.icon && <span className="mr-1.5">{cat.icon}</span>}
                          {cat.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={currentCategory}>{currentCategory}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-foreground">{currentCategory}</span>
              )}
            </FieldRow>
          )}

          {currentDate && (
            <FieldRow label="Data" isEditing={isEditing}>
              {isEditing ? (
                <Input
                  type="date"
                  value={toInputDate(currentDate)}
                  onChange={(e) => onUpdateField('date', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <span className="text-foreground">{formatDate(currentDate)}</span>
              )}
            </FieldRow>
          )}

          {currentDescription && (
            <FieldRow label="Descrição" isEditing={isEditing}>
              {isEditing ? (
                <Input
                  type="text"
                  value={currentDescription}
                  onChange={(e) => onUpdateField('description', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <span className="text-muted-foreground">{currentDescription}</span>
              )}
            </FieldRow>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1"
          >
            <Check className="h-4 w-4" />
            Confirmar
          </Button>
          {!isEditing && (
            <Button
              size="sm"
              variant="outline"
              onClick={onStartEditing}
              className="flex-1"
            >
              <Pencil className="h-4 w-4" />
              Corrigir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRow({
  label,
  isEditing,
  children,
}: {
  label: string;
  isEditing: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'flex items-center gap-3',
      isEditing ? 'flex-col items-start gap-1' : '',
    )}>
      <Label className="text-xs text-muted-foreground min-w-[72px] shrink-0">
        {label}
      </Label>
      <div className="flex-1 w-full text-sm">{children}</div>
    </div>
  );
}
