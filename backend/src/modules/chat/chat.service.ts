import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiProviderFactory } from '../ai/ai-provider.factory.js';
import { CalendarService } from '../calendar/calendar.service.js';
import { CHAT_SYSTEM_PROMPT, CHAT_TOOL_DEFINITIONS } from '../ai/ai.constants.js';
import type { ChatMessageInput } from '../ai/interfaces/ai-chat-provider.interface.js';

const TOOL_LOOP_MAX = 5;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProviderFactory: AiProviderFactory,
    private readonly calendarService: CalendarService,
  ) {}

  async listSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
  }

  async createSession(userId: string, title?: string) {
    return this.prisma.chatSession.create({
      data: { userId, title: title ?? 'Nova conversa' },
    });
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.userId !== userId) throw new ForbiddenException();

    return session;
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.userId !== userId) throw new ForbiddenException();

    await this.prisma.chatSession.delete({ where: { id: sessionId } });
  }

  async sendMessage(userId: string, sessionId: string, content: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });

    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.userId !== userId) throw new ForbiddenException();

    // Save user message
    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'USER', content },
    });

    // Build context-aware system prompt
    const systemPrompt = await this.buildSystemPrompt(userId);

    // Build conversation history for AI
    const history: ChatMessageInput[] = [
      { role: 'system', content: systemPrompt },
      ...session.messages.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content },
    ];

    // Get global provider config
    const providerConfig = await this.prisma.aiProviderConfig.findFirst();
    const providerName = (providerConfig?.provider?.toLowerCase() ?? 'openai') as 'openai' | 'anthropic';
    const provider = this.aiProviderFactory.getProvider(providerName);
    const model = providerConfig?.model ?? undefined;

    // Agentic loop — execute tool calls until the model produces a final text response
    let response = await provider.chat(history, model, CHAT_TOOL_DEFINITIONS);
    let loopCount = 0;

    while (response.toolCalls?.length && loopCount < TOOL_LOOP_MAX) {
      loopCount++;

      // Append assistant's tool-call message
      history.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      });

      // Execute each tool and append results
      for (const toolCall of response.toolCalls) {
        const result = await this.executeToolCall(userId, toolCall.name, toolCall.arguments);
        this.logger.log(`Tool "${toolCall.name}" → ${JSON.stringify(result)}`);
        history.push({
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: toolCall.id,
        });
      }

      // Continue conversation
      response = await provider.chat(history, model, CHAT_TOOL_DEFINITIONS);
    }

    const aiContent = response.content ?? 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente.';

    // Save assistant message
    const assistantMessage = await this.prisma.chatMessage.create({
      data: { sessionId, role: 'ASSISTANT', content: aiContent },
    });

    // Update session timestamp
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return assistantMessage;
  }

  private async buildSystemPrompt(userId: string): Promise<string> {
    const now = new Date();

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    const tz = user?.timezone ?? 'America/Sao_Paulo';

    const localDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
    const localTime = (d: Date) =>
      new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);

    const today = localDate(now);

    // Midnight in user's timezone as a UTC Date
    const tzNow = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const offsetMs = now.getTime() - tzNow.getTime();
    const startOfToday = new Date(new Date(today + 'T00:00:00Z').getTime() + offsetMs);
    const startOfMonth = new Date(new Date(today.slice(0, 7) + '-01T00:00:00Z').getTime() + offsetMs);

    const [monthTotals, goalCount, nextEvents] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { userId, date: { gte: startOfMonth, lte: now } },
        _sum: { amount: true },
      }),
      this.prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
      this.calendarService.list(userId, startOfToday, new Date(startOfToday.getTime() + 7 * 86_400_000)),
    ]);

    const income = monthTotals.find((r) => r.type === 'INCOME')?._sum.amount ?? 0;
    const expenses = monthTotals.find((r) => r.type === 'EXPENSE')?._sum.amount ?? 0;
    const balance = Number(income) - Number(expenses);

    let prompt = `${CHAT_SYSTEM_PROMPT}\n\nData atual: ${today}`;

    prompt += `\n\nResumo do mês atual:`
      + `\n- Receitas: R$${Number(income).toFixed(2)}`
      + `\n- Despesas: R$${Number(expenses).toFixed(2)}`
      + `\n- Saldo: R$${balance.toFixed(2)}`;

    if (goalCount > 0) {
      prompt += `\n\nMetas ativas: ${goalCount} (use get_goals para detalhes)`;
    }

    if (nextEvents.length > 0) {
      const lines = nextEvents.slice(0, 3).map((e) => {
        const date = localDate(e.startAt);
        const time = e.allDay ? '' : ` ${localTime(e.startAt)}`;
        return `[id:${e.id}] ${date}${time} "${e.title}"`;
      });
      prompt += `\n\nPróximos compromissos:\n${lines.join('\n')}`;
      if (nextEvents.length > 3) {
        prompt += `\n(+${nextEvents.length - 3} mais — use search_events para ver todos)`;
      }
    }

    prompt += `\n\nPara dados históricos ou detalhados use: search_transactions, search_events, get_goals.`;

    return prompt;
  }

  private tzUtils(tz: string) {
    return {
      localDate: (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d),
      localTime: (d: Date) =>
        new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d),
    };
  }

  private async executeToolCall(
    userId: string,
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string; id?: string; data?: unknown }> {
    try {
      switch (name) {
        case 'create_transaction': {
          const categoryId = await this.resolveCategoryId(userId, args.category as string | undefined);
          const tx = await this.prisma.transaction.create({
            data: {
              userId,
              type: (args.type as string) === 'INCOME' ? 'INCOME' : 'EXPENSE',
              amount: args.amount as number,
              description: (args.description as string) || (args.category as string) || 'Transação via chat',
              categoryId,
              date: args.date ? new Date(args.date as string) : new Date(),
            },
          });
          return { success: true, message: `Transação criada com id ${tx.id}`, id: tx.id };
        }

        case 'update_transaction': {
          const id = args.id as string;
          await this.assertTransactionOwner(userId, id);
          const updateData: Record<string, unknown> = {};
          if (args.type !== undefined) updateData.type = args.type;
          if (args.amount !== undefined) updateData.amount = args.amount;
          if (args.description !== undefined) updateData.description = args.description;
          if (args.date !== undefined) updateData.date = new Date(args.date as string);
          if (args.category !== undefined) {
            updateData.categoryId = await this.resolveCategoryId(userId, args.category as string);
          }
          await this.prisma.transaction.update({ where: { id }, data: updateData });
          return { success: true, message: `Transação ${id} atualizada` };
        }

        case 'delete_transaction': {
          const id = args.id as string;
          await this.assertTransactionOwner(userId, id);
          await this.prisma.transaction.delete({ where: { id } });
          return { success: true, message: `Transação ${id} removida` };
        }

        case 'create_event': {
          const event = await this.calendarService.create(userId, {
            title: args.title as string,
            description: args.description as string | undefined,
            startAt: args.startAt as string,
            endAt: args.endAt as string | undefined,
            allDay: (args.allDay as boolean | undefined) ?? false,
            location: args.location as string | undefined,
          });
          return { success: true, message: `Evento criado com id ${event.id}`, id: event.id };
        }

        case 'update_event': {
          const id = args.id as string;
          const updateDto: Partial<{
            title: string;
            description?: string;
            startAt: string;
            endAt?: string;
            allDay: boolean;
            location?: string;
          }> = {};
          if (args.title !== undefined) updateDto.title = args.title as string;
          if (args.description !== undefined) updateDto.description = args.description as string;
          if (args.startAt !== undefined) updateDto.startAt = args.startAt as string;
          if (args.endAt !== undefined) updateDto.endAt = args.endAt as string;
          if (args.allDay !== undefined) updateDto.allDay = args.allDay as boolean;
          if (args.location !== undefined) updateDto.location = args.location as string;
          await this.calendarService.update(userId, id, updateDto);
          return { success: true, message: `Evento ${id} atualizado` };
        }

        case 'delete_event': {
          const id = args.id as string;
          await this.calendarService.delete(userId, id);
          return { success: true, message: `Evento ${id} removido` };
        }

        case 'create_goal': {
          const goal = await this.prisma.goal.create({
            data: {
              userId,
              title: args.title as string,
              targetAmount: args.targetAmount as number,
              deadline: args.deadline ? new Date(args.deadline as string) : null,
            },
          });
          return { success: true, message: `Meta criada com id ${goal.id}`, id: goal.id };
        }

        case 'update_goal': {
          const id = args.id as string;
          await this.assertGoalOwner(userId, id);
          const updateData: Record<string, unknown> = {};
          if (args.title !== undefined) updateData.title = args.title;
          if (args.targetAmount !== undefined) updateData.targetAmount = args.targetAmount;
          if (args.deadline !== undefined) updateData.deadline = args.deadline ? new Date(args.deadline as string) : null;
          await this.prisma.goal.update({ where: { id }, data: updateData });
          return { success: true, message: `Meta ${id} atualizada` };
        }

        case 'create_reminder': {
          const nextDueDate = args.date ? new Date(args.date as string) : new Date();
          const reminder = await this.prisma.reminder.create({
            data: {
              userId,
              title: args.title as string,
              amount: args.amount ? (args.amount as number) : null,
              recurrenceType: (args.recurrenceType as 'ONCE' | 'WEEKLY' | 'MONTHLY') ?? 'ONCE',
              dayOfMonth: args.dayOfMonth ? (args.dayOfMonth as number) : null,
              dayOfWeek: args.dayOfWeek ? (args.dayOfWeek as number) : null,
              nextDueDate,
            },
          });
          return { success: true, message: `Lembrete criado com id ${reminder.id}`, id: reminder.id };
        }

        case 'search_transactions': {
          const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
          const tz = user?.timezone ?? 'America/Sao_Paulo';
          const { localDate } = this.tzUtils(tz);
          const where: Record<string, unknown> = { userId };
          if (args.startDate || args.endDate) {
            where.date = {
              ...(args.startDate ? { gte: new Date(args.startDate as string) } : {}),
              ...(args.endDate ? { lte: new Date(args.endDate as string) } : {}),
            };
          }
          if (args.type) where.type = args.type;
          const txs = await this.prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' },
            take: (args.limit as number) ?? 20,
            include: { category: { select: { name: true } } },
          });
          const data = txs.map((t) => ({
            id: t.id,
            date: localDate(t.date),
            type: t.type,
            amount: Number(t.amount),
            description: t.description,
            category: t.category?.name ?? null,
          }));
          return { success: true, message: `${data.length} transações encontradas`, data };
        }

        case 'search_events': {
          const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
          const tz = user?.timezone ?? 'America/Sao_Paulo';
          const { localDate, localTime } = this.tzUtils(tz);
          const evts = await this.calendarService.list(
            userId,
            new Date(args.startDate as string),
            new Date(args.endDate as string),
          );
          const data = evts.map((e) => ({
            id: e.id,
            date: localDate(e.startAt),
            time: e.allDay ? null : localTime(e.startAt),
            allDay: e.allDay,
            title: e.title,
            location: e.location ?? null,
            description: e.description ?? null,
          }));
          return { success: true, message: `${data.length} eventos encontrados`, data };
        }

        case 'get_goals': {
          const status = (args.status as string | undefined) ?? 'ACTIVE';
          const goals = await this.prisma.goal.findMany({
            where: { userId, status: status as 'ACTIVE' | 'COMPLETED' | 'CANCELLED' },
            orderBy: { createdAt: 'desc' },
          });
          const data = goals.map((g) => ({
            id: g.id,
            title: g.title,
            targetAmount: Number(g.targetAmount),
            currentAmount: Number(g.currentAmount),
            progress: Number(g.targetAmount) > 0 ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100) : 0,
            deadline: g.deadline?.toISOString().split('T')[0] ?? null,
            status: g.status,
          }));
          return { success: true, message: `${data.length} metas encontradas`, data };
        }

        default:
          return { success: false, message: `Tool desconhecida: ${name}` };
      }
    } catch (err) {
      this.logger.error(`executeToolCall "${name}" failed: ${err}`);
      return { success: false, message: String(err) };
    }
  }

  private async resolveCategoryId(userId: string, categoryName?: string): Promise<string | null> {
    if (!categoryName) return null;
    const found = await this.prisma.category.findFirst({
      where: {
        OR: [{ userId }, { userId: null }],
        name: { contains: categoryName, mode: 'insensitive' },
      },
    });
    return found?.id ?? null;
  }

  private async assertTransactionOwner(userId: string, id: string): Promise<void> {
    const tx = await this.prisma.transaction.findUnique({ where: { id }, select: { userId: true } });
    if (!tx) throw new NotFoundException(`Transação ${id} não encontrada`);
    if (tx.userId !== userId) throw new ForbiddenException();
  }

  private async assertGoalOwner(userId: string, id: string): Promise<void> {
    const goal = await this.prisma.goal.findUnique({ where: { id }, select: { userId: true } });
    if (!goal) throw new NotFoundException(`Meta ${id} não encontrada`);
    if (goal.userId !== userId) throw new ForbiddenException();
  }

  async sendAudio(userId: string, sessionId: string, audioBuffer: Buffer, mimeType: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.userId !== userId) throw new ForbiddenException();

    const providerConfig = await this.prisma.aiProviderConfig.findFirst();
    const transcriptionProviderName = (providerConfig?.transcriptionProvider?.toLowerCase() ?? 'openai') as 'openai' | 'anthropic' | 'groq';
    const transcriptionProvider = this.aiProviderFactory.getTranscriptionProvider(transcriptionProviderName);

    let transcribedText: string;
    try {
      transcribedText = await transcriptionProvider.transcribeAudio!(audioBuffer, mimeType);
    } catch (error) {
      this.logger.error(`Audio transcription failed: ${error}`);
      throw new Error('Falha ao transcrever o áudio. Tente novamente.');
    }

    const assistantMessage = await this.sendMessage(userId, sessionId, transcribedText);

    return {
      transcribedText,
      assistantMessage,
    };
  }
}
