import { Module } from '@nestjs/common';

import { MessagingModule } from '../messaging/messaging.module.js';
import { RemindersService } from './reminders.service.js';
import { RemindersController } from './reminders.controller.js';

@Module({
  imports: [MessagingModule],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
