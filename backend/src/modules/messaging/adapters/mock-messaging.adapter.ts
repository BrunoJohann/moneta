import { Logger } from '@nestjs/common';

import type { IMessagingService } from '../interfaces/messaging.interface.js';

export class MockMessagingAdapter implements IMessagingService {
  private readonly logger = new Logger(MockMessagingAdapter.name);

  async sendText(phone: string, text: string): Promise<void> {
    this.logger.log(`[Mock] Would send to ${phone}: ${text}`);
  }

  async sendTemplate(
    phone: string,
    templateName: string,
    params: string[],
  ): Promise<void> {
    this.logger.log(
      `[Mock] Would send template "${templateName}" to ${phone} with params: ${params.join(', ')}`,
    );
  }
}
