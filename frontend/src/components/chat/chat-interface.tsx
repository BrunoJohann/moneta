'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api, type ChatMessage, type ChatSession } from '@/lib/api';
import { MessageBubble } from '@/components/chat/message-bubble';
import { AudioRecorder } from '@/components/chat/audio-recorder';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadSessions() {
    setIsLoadingSessions(true);
    try {
      const data = await api.chat.listSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        await selectSession(data[0].id);
      }
    } catch {
      toast.error('Erro ao carregar conversas');
    } finally {
      setIsLoadingSessions(false);
    }
  }

  async function selectSession(id: string) {
    setActiveSessionId(id);
    try {
      const session = await api.chat.getSession(id);
      setMessages(session.messages);
    } catch {
      toast.error('Erro ao carregar mensagens');
    }
  }

  async function newSession() {
    try {
      const session = await api.chat.createSession();
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch {
      toast.error('Erro ao criar conversa');
    }
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.chat.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        if (remaining.length > 0) {
          await selectSession(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch {
      toast.error('Erro ao excluir conversa');
    }
  }

  async function sendText() {
    if (!input.trim() || isSending) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await api.chat.createSession();
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        sessionId = session.id;
      } catch {
        toast.error('Erro ao iniciar conversa');
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: 'USER',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const assistantMsg = await api.chat.sendMessage(sessionId, userMessage.content);
      setMessages((prev) => [...prev, assistantMsg]);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, updatedAt: new Date().toISOString() } : s)),
      );
    } catch {
      toast.error('Erro ao enviar mensagem');
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setInput(userMessage.content);
    } finally {
      setIsSending(false);
    }
  }

  async function sendAudio(blob: Blob) {
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await api.chat.createSession();
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        sessionId = session.id;
      } catch {
        toast.error('Erro ao iniciar conversa');
        return;
      }
    }

    setIsSending(true);
    try {
      const result = await api.chat.sendAudio(sessionId, blob);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sessionId,
        role: 'USER',
        content: result.transcribedText,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage, result.assistantMessage]);
    } catch {
      toast.error('Erro ao processar áudio. Verifique se o OPENAI_API_KEY está configurado.');
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar de sessões */}
      <aside className="hidden md:flex w-64 flex-col gap-2">
        <Button onClick={newSession} variant="outline" className="w-full justify-start gap-2">
          <Plus className="h-4 w-4" />
          Nova conversa
        </Button>

        <ScrollArea className="flex-1 rounded-lg border">
          {isLoadingSessions ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground text-center">Nenhuma conversa ainda</p>
          ) : (
            <div className="p-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => selectSession(session.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors group',
                    activeSessionId === session.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent',
                  )}
                >
                  <span className="truncate flex-1">
                    {session.title || 'Nova conversa'}
                  </span>
                  <Trash2
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                      activeSessionId === session.id
                        ? 'text-primary-foreground/70 hover:text-primary-foreground'
                        : 'text-muted-foreground hover:text-destructive',
                    )}
                    onClick={(e) => deleteSession(session.id, e)}
                  />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Área principal do chat */}
      <div className="flex flex-1 flex-col rounded-xl border bg-card overflow-hidden">
        {/* Mensagens */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[200px] items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Olá! Sou a Moneta</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Seu assistente financeiro. Pergunte sobre suas finanças, gastos ou metas.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isSending && (
                <div className="flex gap-3 mr-auto">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">Digitando...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <AudioRecorder onRecordingComplete={sendAudio} disabled={isSending} />
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre suas finanças... (Enter para enviar)"
              className="min-h-[42px] max-h-32 resize-none flex-1"
              rows={1}
              disabled={isSending}
            />
            <Button
              onClick={sendText}
              disabled={!input.trim() || isSending}
              size="icon"
              className="h-9 w-9 shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground text-center">
            Enter envia · Shift+Enter nova linha · Microfone para áudio
          </p>
        </div>
      </div>
    </div>
  );
}
