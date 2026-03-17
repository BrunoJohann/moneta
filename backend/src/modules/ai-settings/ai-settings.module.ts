import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiModule } from '../ai/ai.module.js';
import { AiSettingsController } from './ai-settings.controller.js';
import { AiSettingsService } from './ai-settings.service.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [AiSettingsController],
  providers: [AiSettingsService, AdminGuard],
})
export class AiSettingsModule {}
