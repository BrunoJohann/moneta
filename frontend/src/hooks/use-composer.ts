'use client';

import { useCallback, useRef, useState } from 'react';
import { api, type ParsedAction } from '@/lib/api';

const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 1_000;

export interface ComposerState {
  text: string;
  isLoading: boolean;
  parsedResult: ParsedAction | null;
  transactionId: string | null;
  aiResponse: string | null;
  isEditing: boolean;
  editedFields: Partial<ParsedAction>;
  error: string | null;
}

const initialState: ComposerState = {
  text: '',
  isLoading: false,
  parsedResult: null,
  transactionId: null,
  aiResponse: null,
  isEditing: false,
  editedFields: {},
  error: null,
};

export function useComposer() {
  const [state, setState] = useState<ComposerState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const setText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, text }));
  }, []);

  const pollForResult = useCallback(async (messageId: string): Promise<ParsedAction | null> => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      if (abortRef.current?.signal.aborted) return null;

      const message = await api.messages.getById(messageId);

      if (message.status === 'COMPLETED') {
        return message.parsedAction ?? null;
      }

      if (message.status === 'FAILED') {
        throw new Error(message.response || 'Falha ao processar mensagem');
      }
    }

    throw new Error('Tempo esgotado aguardando processamento');
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({
      ...prev,
      isLoading: true,
      parsedResult: null,
      transactionId: null,
      aiResponse: null,
      isEditing: false,
      editedFields: {},
      error: null,
    }));

    try {
      const idempotencyKey = crypto.randomUUID();
      const message = await api.messages.send(text, idempotencyKey);

      if (message.status === 'COMPLETED' && message.parsedAction) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          parsedResult: message.parsedAction!,
          transactionId: message.parsedAction!.transactionId ?? null,
          aiResponse: message.response,
        }));
        return;
      }

      const parsedAction = await pollForResult(message.id);

      if (abortRef.current?.signal.aborted) return;

      if (parsedAction) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          parsedResult: parsedAction,
          transactionId: parsedAction.transactionId ?? null,
          aiResponse: message.response,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Nenhuma ação foi identificada na mensagem',
        }));
      }
    } catch (err) {
      if (abortRef.current?.signal.aborted) return;

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro ao enviar mensagem',
      }));
    }
  }, [pollForResult]);

  const startEditing = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isEditing: true,
      editedFields: {},
    }));
  }, []);

  const updateField = useCallback((field: keyof ParsedAction, value: string | number) => {
    setState((prev) => ({
      ...prev,
      editedFields: { ...prev.editedFields, [field]: value },
    }));
  }, []);

  const confirmResult = useCallback(async (): Promise<boolean> => {
    const { parsedResult, editedFields, transactionId } = state;
    if (!parsedResult) return false;

    const hasEdits = Object.keys(editedFields).length > 0;

    if (hasEdits && transactionId) {
      try {
        const updates: Record<string, unknown> = {};
        if (editedFields.amount !== undefined) updates.amount = editedFields.amount;
        if (editedFields.category !== undefined) updates.category = editedFields.category;
        if (editedFields.date !== undefined) updates.date = editedFields.date;
        if (editedFields.description !== undefined) updates.description = editedFields.description;

        await api.transactions.update(transactionId, updates);
      } catch {
        setState((prev) => ({
          ...prev,
          error: 'Erro ao atualizar transação',
        }));
        return false;
      }
    }

    return true;
  }, [state]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  return {
    ...state,
    setText,
    sendMessage,
    startEditing,
    updateField,
    confirmResult,
    reset,
  };
}
