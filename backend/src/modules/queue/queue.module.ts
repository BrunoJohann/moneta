import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { AiModule } from '../ai/ai.module.js';
import { MessagingModule } from '../messaging/messaging.module.js';
import { AiParseProcessor } from './ai-parse.processor.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'ai-parse' }),
    AiModule,
    MessagingModule,
  ],
  providers: [AiParseProcessor],
})
export class QueueModule {}
