import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiProviderFactory } from '../ai/ai-provider.factory.js';
import type { UpdateAiSettingsDto } from './dto/update-ai-settings.dto.js';

@Injectable()
export class AiSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProviderFactory: AiProviderFactory,
  ) {}

  async getSettings() {
    const config = await this.prisma.aiProviderConfig.findFirst();

    return {
      provider: config?.provider ?? 'OPENAI',
      model: config?.model ?? null,
    };
  }

  async updateSettings(adminEmail: string, dto: UpdateAiSettingsDto) {
    const existing = await this.prisma.aiProviderConfig.findFirst();

    if (existing) {
      return this.prisma.aiProviderConfig.update({
        where: { id: existing.id },
        data: {
          provider: dto.provider as any,
          model: dto.model ?? null,
          updatedBy: adminEmail,
        },
      });
    }

    return this.prisma.aiProviderConfig.create({
      data: {
        provider: dto.provider as any,
        model: dto.model ?? null,
        updatedBy: adminEmail,
      },
    });
  }

  listProviders() {
    return this.aiProviderFactory.listProviders();
  }
}
