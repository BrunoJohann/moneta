import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { IAiChatProvider } from './interfaces/ai-chat-provider.interface.js';
import { OpenAiChatAdapter } from './adapters/openai-chat.adapter.js';
import { AnthropicChatAdapter } from './adapters/anthropic-chat.adapter.js';

export type AiProviderName = 'openai' | 'anthropic';

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);
  private readonly providers = new Map<AiProviderName, IAiChatProvider>();

  constructor(config: ConfigService) {
    this.providers.set('openai', new OpenAiChatAdapter(config));
    this.providers.set('anthropic', new AnthropicChatAdapter(config));
  }

  getProvider(name: AiProviderName = 'openai'): IAiChatProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      this.logger.warn(`Provider "${name}" not found, falling back to openai`);
      return this.providers.get('openai')!;
    }
    return provider;
  }

  getTranscriptionProvider(): IAiChatProvider {
    // OpenAI Whisper is the only transcription option currently
    return this.providers.get('openai')!;
  }

  listProviders(): Array<{ name: string; models: string[]; defaultModel: string }> {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.providerName,
      models: p.availableModels,
      defaultModel: p.defaultModel,
    }));
  }
}
