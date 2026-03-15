'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { MessageComposer } from './message-composer';

interface ComposerTriggerProps {
  onTransactionCreated?: () => void;
}

export function ComposerTrigger({ onTransactionCreated }: ComposerTriggerProps) {
  const [open, setOpen] = useState(false);

  const handleCreated = () => {
    onTransactionCreated?.();
    setTimeout(() => setOpen(false), 600);
  };

  return (
    <div className="md:hidden">
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
      >
        <MessageSquarePlus className="h-6 w-6" />
        <span className="sr-only">Registrar transação</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Registrar transação</SheetTitle>
            <SheetDescription>
              Use texto livre para registrar uma transação
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col h-full pt-2">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/20 mb-1" />
            <MessageComposer
              onTransactionCreated={handleCreated}
              className="flex-1 min-h-0"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
