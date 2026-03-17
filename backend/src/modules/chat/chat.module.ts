import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiModule } from '../ai/ai.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
