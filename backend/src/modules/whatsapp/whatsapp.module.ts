import { Module, forwardRef } from '@nestjs/common';

import { MessagesModule } from '../messages/messages.module.js';
import { WhatsAppWebhookController } from './whatsapp.controller.js';

@Module({
  imports: [forwardRef(() => MessagesModule)],
  controllers: [WhatsAppWebhookController],
})
export class WhatsAppModule {}
