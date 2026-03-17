import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service.js';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AdminOnly } from '../../common/decorators/admin.decorator.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';

interface JwtUser {
  userId: string;
  email: string;
}

@Controller('ai-settings')
export class AiSettingsController {
  constructor(private readonly aiSettingsService: AiSettingsService) {}

  @Get()
  getSettings() {
    return this.aiSettingsService.getSettings();
  }

  @Put()
  @AdminOnly()
  @UseGuards(AdminGuard)
  updateSettings(@CurrentUser() user: JwtUser, @Body() dto: UpdateAiSettingsDto) {
    return this.aiSettingsService.updateSettings(user.email, dto);
  }

  @Get('providers')
  listProviders() {
    return this.aiSettingsService.listProviders();
  }
}
