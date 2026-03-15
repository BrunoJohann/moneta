import { Logger } from '@nestjs/common';

import type { IAiParser, ParseResult } from '../interfaces/ai-parser.interface.js';
import { FallbackParserService } from '../fallback-parser.service.js';

export class MockAiAdapter implements IAiParser {
  private readonly logger = new Logger(MockAiAdapter.name);

  constructor(private readonly fallbackParser: FallbackParserService) {}

  async parse(text: string): Promise<ParseResult> {
    this.logger.debug(`Mock AI parsing: "${text}"`);

    const fallbackResult = this.fallbackParser.parse(text);

    if (fallbackResult) {
      return fallbackResult;
    }

    return {
      action: 'unknown',
      data: { originalText: text },
      confidence: 0,
      rawOutput: { source: 'mock', message: 'Fallback could not parse' },
    };
  }
}
