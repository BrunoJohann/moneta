import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { RecurrenceType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service.js';
import {
  MESSAGING_SERVICE,
  type IMessagingService,
} from '../messaging/interfaces/messaging.interface.js';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGING_SERVICE) private readonly messaging: IMessagingService,
  ) {}

  async create(data: {
    userId: string;
    title: string;
    amount?: number;
    recurrenceType: RecurrenceType;
    dayOfMonth?: number;
    dayOfWeek?: number;
    nextDueDate: string;
    messageLogId?: string;
  }) {
    return this.prisma.reminder.create({
      data: {
        userId: data.userId,
        title: data.title,
        amount: data.amount,
        recurrenceType: data.recurrenceType,
        dayOfMonth: data.dayOfMonth,
        dayOfWeek: data.dayOfWeek,
        nextDueDate: new Date(data.nextDueDate),
        messageLogId: data.messageLogId,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.reminder.findMany({
      where: { userId },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  async findById(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, userId },
    });
    if (!reminder) throw new NotFoundException('Reminder not found');
    return reminder;
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      amount?: number;
      recurrenceType?: RecurrenceType;
      dayOfMonth?: number;
      dayOfWeek?: number;
      nextDueDate?: string;
      isActive?: boolean;
    },
  ) {
    await this.findById(id, userId);
    return this.prisma.reminder.update({
      where: { id },
      data: {
        ...data,
        nextDueDate: data.nextDueDate
          ? new Date(data.nextDueDate)
          : undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);
    return this.prisma.reminder.delete({ where: { id } });
  }

  @Cron('0 * * * *')
  async checkDueReminders() {
    const now = new Date();
    const dueReminders = await this.prisma.reminder.findMany({
      where: { nextDueDate: { lte: now }, isActive: true },
      include: { user: true },
    });

    for (const reminder of dueReminders) {
      try {
        const phone = reminder.user.phone;
        if (phone) {
          const amountText = reminder.amount
            ? ` - R$ ${Number(reminder.amount).toFixed(2)}`
            : '';
          await this.messaging.sendText(
            phone,
            `🔔 Lembrete: ${reminder.title}${amountText}`,
          );
        }

        if (reminder.recurrenceType === 'ONCE') {
          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: { isActive: false },
          });
        } else if (reminder.recurrenceType === 'MONTHLY') {
          const next = new Date(reminder.nextDueDate);
          next.setMonth(next.getMonth() + 1);
          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: { nextDueDate: next },
          });
        } else if (reminder.recurrenceType === 'WEEKLY') {
          const next = new Date(reminder.nextDueDate);
          next.setDate(next.getDate() + 7);
          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: { nextDueDate: next },
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to process reminder ${reminder.id}: ${error}`,
        );
      }
    }

    if (dueReminders.length > 0) {
      this.logger.log(`Processed ${dueReminders.length} due reminders`);
    }
  }
}
