import { Injectable, Inject } from '@nestjs/common';

import type { IAiParser, ParseResult } from './interfaces/ai-parser.interface.js';
import { AI_PARSER } from './interfaces/ai-parser.interface.js';

@Injectable()
export class AiParserService {
  constructor(
    @Inject(AI_PARSER) private readonly aiParser: IAiParser,
  ) {}

  async parse(text: string): Promise<ParseResult> {
    return this.aiParser.parse(text);
  }
}
