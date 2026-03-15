import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import type { IMessagingService } from '../interfaces/messaging.interface.js';

export class WhatsAppAdapter implements IMessagingService {
  private readonly logger = new Logger(WhatsAppAdapter.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;

  constructor(config: ConfigService) {
    this.phoneNumberId = config.get<string>('whatsapp.phoneNumberId')!;
    this.accessToken = config.get<string>('whatsapp.token')!;
  }

  async sendText(phone: string, text: string): Promise<void> {
    const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;

    try {
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text },
        },
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        },
      );
      this.logger.log(`Text message sent to ${phone}`);
    } catch (error) {
      this.logger.error(
        `Failed to send text message to ${phone}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async sendTemplate(
    phone: string,
    templateName: string,
    params: string[],
  ): Promise<void> {
    const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;

    try {
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'pt_BR' },
            components: [
              {
                type: 'body',
                parameters: params.map((p) => ({ type: 'text', text: p })),
              },
            ],
          },
        },
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        },
      );
      this.logger.log(`Template "${templateName}" sent to ${phone}`);
    } catch (error) {
      this.logger.error(
        `Failed to send template "${templateName}" to ${phone}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }
}
