import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service.js';
import { AiParserService } from '../ai/ai-parser.service.js';
import {
  MESSAGING_SERVICE,
  type IMessagingService,
} from '../messaging/interfaces/messaging.interface.js';

interface AiParseJobData {
  messageLogId: string;
}

@Processor('ai-parse', { concurrency: 5 })
export class AiParseProcessor extends WorkerHost {
  private readonly logger = new Logger(AiParseProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiParser: AiParserService,
    @Inject(MESSAGING_SERVICE) private readonly messaging: IMessagingService,
  ) {
    super();
  }

  async process(job: Job<AiParseJobData>): Promise<void> {
    const { messageLogId } = job.data;
    this.logger.log(`Processing message ${messageLogId}`);

    const messageLog = await this.prisma.messageLog.findUnique({
      where: { id: messageLogId },
      include: { user: true },
    });

    if (!messageLog) {
      this.logger.error(`MessageLog ${messageLogId} not found`);
      return;
    }

    try {
      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: { status: 'PROCESSING' },
      });

      const result = await this.aiParser.parse(messageLog.rawText);

      await this.handleAction(
        result.action,
        result.data,
        messageLog.userId,
        messageLogId,
      );

      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: {
          status: 'COMPLETED',
          parsedAction: result as object,
          aiRawOutput: result.rawOutput as object,
        },
      });

      if (messageLog.channel === 'WHATSAPP' && messageLog.user.phone) {
        await this.sendWhatsAppConfirmation(
          messageLog.user.phone,
          result.action,
          result.data,
        );
      }

      this.logger.log(
        `Message ${messageLogId} completed: action=${result.action}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed processing message ${messageLogId}: ${error}`,
        (error as Error).stack,
      );
      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: {
          status: 'FAILED',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  private async handleAction(
    action: string,
    data: Record<string, unknown>,
    userId: string,
    messageLogId: string,
  ): Promise<void> {
    switch (action) {
      case 'create_transaction':
        await this.createTransaction(data, userId, messageLogId);
        break;
      case 'create_goal':
        await this.createGoal(data, userId, messageLogId);
        break;
      case 'create_reminder':
        await this.createReminder(data, userId, messageLogId);
        break;
      default:
        this.logger.warn(`Unknown action: ${action}`);
    }
  }

  private async createTransaction(
    data: Record<string, unknown>,
    userId: string,
    messageLogId: string,
  ): Promise<void> {
    const category = await this.findOrCreateCategory(
      userId,
      data.category as string,
    );

    await this.prisma.transaction.create({
      data: {
        userId,
        type: data.type as 'INCOME' | 'EXPENSE',
        amount: data.amount as number,
        description: data.description as string,
        categoryId: category.id,
        date: data.date ? new Date(data.date as string) : new Date(),
        messageLogId,
      },
    });
  }

  private async createGoal(
    data: Record<string, unknown>,
    userId: string,
    messageLogId: string,
  ): Promise<void> {
    await this.prisma.goal.create({
      data: {
        userId,
        title: data.title as string,
        targetAmount: data.targetAmount as number,
        deadline: data.deadline ? new Date(data.deadline as string) : null,
        messageLogId,
      },
    });
  }

  private async createReminder(
    data: Record<string, unknown>,
    userId: string,
    messageLogId: string,
  ): Promise<void> {
    const nextDueDate = this.calculateNextDueDate(
      data.recurrenceType as string,
      data.dayOfMonth as number | null,
      data.dayOfWeek as number | null,
      data.date as string | null,
    );

    await this.prisma.reminder.create({
      data: {
        userId,
        title: data.title as string,
        amount: data.amount as number | null,
        recurrenceType: data.recurrenceType as 'ONCE' | 'WEEKLY' | 'MONTHLY',
        dayOfMonth: (data.dayOfMonth as number) ?? null,
        dayOfWeek: (data.dayOfWeek as number) ?? null,
        nextDueDate,
        messageLogId,
      },
    });
  }

  private calculateNextDueDate(
    recurrenceType: string,
    dayOfMonth: number | null,
    dayOfWeek: number | null,
    date: string | null,
  ): Date {
    const now = new Date();

    if (recurrenceType === 'ONCE' && date) {
      return new Date(date);
    }

    if (recurrenceType === 'MONTHLY' && dayOfMonth) {
      const next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    }

    if (recurrenceType === 'WEEKLY' && dayOfWeek !== null) {
      const next = new Date(now);
      const currentDay = next.getDay();
      const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7;
      next.setDate(next.getDate() + daysUntil);
      next.setHours(0, 0, 0, 0);
      return next;
    }

    return now;
  }

  private async findOrCreateCategory(
    userId: string,
    categoryName = 'Outros',
  ) {
    const name = categoryName;

    const existing = await this.prisma.category.findFirst({
      where: {
        name,
        OR: [{ userId }, { isDefault: true }],
      },
    });

    if (existing) return existing;

    return this.prisma.category.create({
      data: { userId, name },
    });
  }

  private async sendWhatsAppConfirmation(
    phone: string,
    action: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const messages: Record<string, string> = {
        create_transaction: `✅ Registrado: ${data.type === 'INCOME' ? 'Receita' : 'Despesa'} de R$${data.amount} - ${data.description}`,
        create_goal: `🎯 Meta criada: ${data.title} - R$${data.targetAmount}`,
        create_reminder: `⏰ Lembrete criado: ${data.title}`,
      };

      const message = messages[action] ?? '✅ Ação registrada com sucesso!';
      await this.messaging.sendText(phone, message);
    } catch (error) {
      this.logger.error(`WhatsApp confirmation failed: ${error}`);
    }
  }
}
