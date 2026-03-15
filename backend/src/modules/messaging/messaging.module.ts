import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MESSAGING_SERVICE } from './interfaces/messaging.interface.js';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter.js';
import { MockMessagingAdapter } from './adapters/mock-messaging.adapter.js';

@Module({
  providers: [
    {
      provide: MESSAGING_SERVICE,
      useFactory: (config: ConfigService) => {
        return config.get('nodeEnv') === 'production'
          ? new WhatsAppAdapter(config)
          : new MockMessagingAdapter();
      },
      inject: [ConfigService],
    },
  ],
  exports: [MESSAGING_SERVICE],
})
export class MessagingModule {}
