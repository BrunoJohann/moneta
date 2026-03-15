import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { MessagesService } from './messages.service.js';
import { MessagesController } from './messages.controller.js';

@Module({
  imports: [BullModule.registerQueue({ name: 'ai-parse' })],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
