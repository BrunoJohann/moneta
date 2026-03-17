import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AI_PARSER } from './interfaces/ai-parser.interface.js';
import { AiParserService } from './ai-parser.service.js';
import { FallbackParserService } from './fallback-parser.service.js';
import { OpenAIAdapter } from './adapters/openai.adapter.js';
import { MockAiAdapter } from './adapters/mock-ai.adapter.js';
import { AiProviderFactory } from './ai-provider.factory.js';

@Module({
  providers: [
    FallbackParserService,
    {
      provide: AI_PARSER,
      useFactory: (
        config: ConfigService,
        fallbackParser: FallbackParserService,
      ) => {
        return config.get('nodeEnv') === 'production'
          ? new OpenAIAdapter(config, fallbackParser)
          : new MockAiAdapter(fallbackParser);
      },
      inject: [ConfigService, FallbackParserService],
    },
    AiParserService,
    {
      provide: AiProviderFactory,
      useFactory: (config: ConfigService) => new AiProviderFactory(config),
      inject: [ConfigService],
    },
  ],
  exports: [AiParserService, AiProviderFactory],
})
export class AiModule {}
