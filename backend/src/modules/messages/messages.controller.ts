import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { MessagesService } from './messages.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';

interface AuthUser {
  userId: string;
  email: string;
}

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.ingest({
      userId: user.userId,
      channel: 'WEB',
      text: dto.text,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const message = await this.messagesService.findById(id);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }
}
