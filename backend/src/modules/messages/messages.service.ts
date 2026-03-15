import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('ai-parse') private readonly aiParseQueue: Queue,
  ) {}

  async ingest(params: {
    userId: string;
    channel: 'WHATSAPP' | 'WEB';
    text: string;
    idempotencyKey: string;
  }) {
    const existing = await this.prisma.messageLog.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing && existing.status !== 'FAILED') {
      this.logger.debug(
        `Idempotent hit for key=${params.idempotencyKey}, returning existing`,
      );
      return existing;
    }

    const messageLog = await this.prisma.messageLog.create({
      data: {
        userId: params.userId,
        channel: params.channel,
        rawText: params.text,
        idempotencyKey: params.idempotencyKey,
        status: 'PENDING',
      },
    });

    await this.aiParseQueue.add('parse', { messageLogId: messageLog.id });

    this.logger.log(
      `Message ingested id=${messageLog.id} channel=${params.channel}`,
    );

    return messageLog;
  }

  async findById(id: string) {
    return this.prisma.messageLog.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async findByUser(userId: string, limit: number) {
    return this.prisma.messageLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
