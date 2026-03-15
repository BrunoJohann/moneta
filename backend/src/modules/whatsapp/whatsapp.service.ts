import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;

  constructor(private readonly config: ConfigService) {
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')!;
    this.accessToken = this.config.get<string>('WHATSAPP_TOKEN')!;
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
