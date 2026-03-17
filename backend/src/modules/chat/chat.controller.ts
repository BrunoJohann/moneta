import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ChatService } from './chat.service.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

interface JwtUser {
  userId: string;
  email: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  listSessions(@CurrentUser() user: JwtUser) {
    return this.chatService.listSessions(user.userId);
  }

  @Post('sessions')
  createSession(@CurrentUser() user: JwtUser, @Body() dto: CreateSessionDto) {
    return this.chatService.createSession(user.userId, dto.title);
  }

  @Get('sessions/:id')
  getSession(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.chatService.getSession(user.userId, id);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.chatService.deleteSession(user.userId, id);
  }

  @Post('sessions/:id/messages')
  sendMessage(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.userId, id, dto.content);
  }

  @Post('sessions/:id/audio')
  @UseInterceptors(FileInterceptor('audio', { storage: memoryStorage() }))
  async sendAudio(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.chatService.sendAudio(
      user.userId,
      id,
      file.buffer,
      file.mimetype,
    );
  }
}
