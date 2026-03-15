'use client';

import { useCallback, useRef, useState } from 'react';
import { Bot, Loader2, SendHorizontal, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useComposer } from '@/hooks/use-composer';
import { ParsedPreview } from './parsed-preview';

interface MessageComposerProps {
  onTransactionCreated?: () => void;
  className?: string;
}

export function MessageComposer({ onTransactionCreated, className }: MessageComposerProps) {
  const composer = useComposer();
  const [isConfirming, setIsConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = composer.text.trim();
    if (!trimmed || composer.isLoading) return;

    await composer.sendMessage(trimmed);

    if (composer.error) {
      toast.error('Erro', { description: composer.error });
    }
  }, [composer]);

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      const success = await composer.confirmResult();
      if (success) {
        toast.success('Registrado!', {
          description: 'Transação registrada com sucesso.',
        });
        composer.reset();
        onTransactionCreated?.();
        inputRef.current?.focus();
      }
    } catch {
      toast.error('Erro ao confirmar');
    } finally {
      setIsConfirming(false);
    }
  }, [composer, onTransactionCreated]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = (e.target as HTMLElement).closest('form');
      form?.requestSubmit();
    }
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold leading-none">Registrar</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Descreva sua transação em texto livre
          </p>
        </div>
        {(composer.parsedResult || composer.error) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={composer.reset}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {!composer.isLoading && !composer.parsedResult && !composer.error && (
            <EmptyState />
          )}

          {composer.isLoading && <LoadingState />}

          {composer.error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in-0 duration-200">
              {composer.error}
            </div>
          )}

          {composer.parsedResult && (
            <div className="space-y-2 animate-in fade-in-0 duration-300">
              {composer.aiResponse && (
                <div className="flex gap-2">
                  <div className="flex items-start justify-center h-6 w-6 rounded-full bg-muted shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground mt-1" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {composer.aiResponse}
                  </p>
                </div>
              )}
              <ParsedPreview
                parsedResult={composer.parsedResult}
                isEditing={composer.isEditing}
                editedFields={composer.editedFields}
                onStartEditing={composer.startEditing}
                onUpdateField={composer.updateField}
                onConfirm={handleConfirm}
                isConfirming={isConfirming}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={composer.text}
            onChange={(e) => composer.setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Gastei 45 reais no mercado..."
            disabled={composer.isLoading}
            className="flex-1 h-10 rounded-full px-4 bg-muted/50 border-0 focus-visible:ring-1"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!composer.text.trim() || composer.isLoading}
            className="h-10 w-10 rounded-full shrink-0"
          >
            {composer.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted mb-3">
        <Bot className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Digite sua mensagem abaixo
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-[220px]">
        Ex: &quot;Gastei 150 no supermercado&quot; ou &quot;Recebi 3000 de salário&quot;
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-3 py-6 justify-center animate-in fade-in-0 duration-200">
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-sm text-muted-foreground">Processando...</span>
    </div>
  );
}
