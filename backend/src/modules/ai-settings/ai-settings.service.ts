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
      transcriptionProvider: config?.transcriptionProvider ?? 'OPENAI',
      transcriptionModel: config?.transcriptionModel ?? null,
    };
  }

  async updateSettings(adminEmail: string, dto: UpdateAiSettingsDto) {
    const existing = await this.prisma.aiProviderConfig.findFirst();

    const data = {
      provider: dto.provider as any,
      model: dto.model ?? null,
      transcriptionProvider: (dto.transcriptionProvider ?? dto.provider) as any,
      transcriptionModel: dto.transcriptionModel ?? null,
      updatedBy: adminEmail,
    };

    if (existing) {
      return this.prisma.aiProviderConfig.update({ where: { id: existing.id }, data });
    }

    return this.prisma.aiProviderConfig.create({ data });
  }

  listProviders() {
    return this.aiProviderFactory.listProviders();
  }

  listTranscriptionProviders() {
    return this.aiProviderFactory.listTranscriptionProviders();
  }
}
