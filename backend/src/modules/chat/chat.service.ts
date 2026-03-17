import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiProviderFactory } from '../ai/ai-provider.factory.js';
import { AiParserService } from '../ai/ai-parser.service.js';
import { OPENAI_CHAT_SYSTEM_PROMPT } from '../ai/adapters/openai-chat.adapter.js';
import type { ChatMessageInput } from '../ai/interfaces/ai-chat-provider.interface.js';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProviderFactory: AiProviderFactory,
    private readonly aiParserService: AiParserService,
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

    // Build conversation history for AI
    const history: ChatMessageInput[] = [
      { role: 'system', content: OPENAI_CHAT_SYSTEM_PROMPT },
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

    // Run AI chat and financial parser in parallel
    const [chatResult, parseResult] = await Promise.allSettled([
      provider.chat(history, providerConfig?.model ?? undefined),
      this.aiParserService.parse(content),
    ]);

    let aiContent: string;
    if (chatResult.status === 'fulfilled') {
      aiContent = chatResult.value.content;
    } else {
      this.logger.error(`AI chat failed: ${chatResult.reason}`);
      aiContent = 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente.';
    }

    // Create financial record if the parser detected an action
    if (parseResult.status === 'fulfilled' && parseResult.value) {
      await this.createFinancialRecord(userId, parseResult.value.action, parseResult.value.data).catch(
        (err) => this.logger.error(`Failed to create financial record: ${err}`),
      );
    }

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

  private async createFinancialRecord(userId: string, action: string, data: Record<string, unknown>) {
    if (action === 'create_transaction') {
      const categoryName = data.category as string | undefined;
      let categoryId: string | null = null;

      if (categoryName) {
        const found = await this.prisma.category.findFirst({
          where: {
            OR: [{ userId }, { userId: null }],
            name: { contains: categoryName, mode: 'insensitive' },
          },
        });
        categoryId = found?.id ?? null;
      }

      await this.prisma.transaction.create({
        data: {
          userId,
          type: (data.type as string) === 'INCOME' ? 'INCOME' : 'EXPENSE',
          amount: data.amount as number,
          description: (data.description as string) || categoryName || 'Transação via chat',
          categoryId,
          date: data.date ? new Date(data.date as string) : new Date(),
        },
      });

      this.logger.log(`Created transaction via chat: ${data.type} ${data.amount} for user ${userId}`);
    } else if (action === 'create_goal') {
      await this.prisma.goal.create({
        data: {
          userId,
          title: data.title as string,
          targetAmount: data.targetAmount as number,
          deadline: data.deadline ? new Date(data.deadline as string) : null,
        },
      });
      this.logger.log(`Created goal via chat: "${data.title}" for user ${userId}`);
    } else if (action === 'create_reminder') {
      const nextDueDate = data.date
        ? new Date(data.date as string)
        : new Date();

      await this.prisma.reminder.create({
        data: {
          userId,
          title: data.title as string,
          amount: data.amount ? (data.amount as number) : null,
          recurrenceType: (data.recurrenceType as 'ONCE' | 'WEEKLY' | 'MONTHLY') ?? 'ONCE',
          dayOfMonth: data.dayOfMonth ? (data.dayOfMonth as number) : null,
          dayOfWeek: data.dayOfWeek ? (data.dayOfWeek as number) : null,
          nextDueDate,
        },
      });
      this.logger.log(`Created reminder via chat: "${data.title}" for user ${userId}`);
    }
  }

  async sendAudio(userId: string, sessionId: string, audioBuffer: Buffer, mimeType: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.userId !== userId) throw new ForbiddenException();

    // Transcribe audio using OpenAI Whisper (always, regardless of chat provider)
    const transcriptionProvider = this.aiProviderFactory.getTranscriptionProvider();

    let transcribedText: string;
    try {
      transcribedText = await transcriptionProvider.transcribeAudio!(audioBuffer, mimeType);
    } catch (error) {
      this.logger.error(`Audio transcription failed: ${error}`);
      throw new Error('Falha ao transcrever o áudio. Tente novamente.');
    }

    // Now send as text message
    const assistantMessage = await this.sendMessage(userId, sessionId, transcribedText);

    return {
      transcribedText,
      assistantMessage,
    };
  }
}
