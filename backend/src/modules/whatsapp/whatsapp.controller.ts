import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { Public } from '../../common/decorators/public.decorator.js';
import { MessagesService } from '../messages/messages.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WhatsAppSignatureGuard } from './guards/whatsapp-signature.guard.js';

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly messagesService: MessagesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Public()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const expectedToken = this.config.get<string>('whatsapp.verifyToken');

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      this.logger.log('Webhook verified successfully');
      res.status(200).send(challenge);
      return;
    }

    this.logger.warn('Webhook verification failed');
    res.status(403).send('Forbidden');
  }

  @Post()
  @Public()
  @UseGuards(WhatsAppSignatureGuard)
  async handleIncoming(@Req() req: Request): Promise<{ status: string }> {
    const body = req.body as Record<string, unknown>;
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown> | undefined;
    const messages = (value?.messages as Array<Record<string, unknown>>)?.[0];

    if (!messages) {
      return { status: 'no_message' };
    }

    const phone = messages.from as string;
    const messageId = messages.id as string;
    const textObj = messages.text as Record<string, string> | undefined;
    const text = textObj?.body;

    if (!text) {
      this.logger.debug(`Non-text message received from ${phone}, skipping`);
      return { status: 'ignored' };
    }

    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email: `${phone}@whatsapp.placeholder`, phone, whatsappVerified: true },
      });
      this.logger.log(`Created new user for phone ${phone}`);
    }

    await this.messagesService.ingest({
      userId: user.id,
      channel: 'WHATSAPP',
      text,
      idempotencyKey: messageId,
    });

    this.logger.log(`Ingested WhatsApp message from ${phone}`);
    return { status: 'ok' };
  }
}
