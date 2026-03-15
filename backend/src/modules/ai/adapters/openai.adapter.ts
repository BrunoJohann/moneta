import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { AI_SYSTEM_PROMPT, AI_TOOL_DEFINITIONS } from '../ai.constants.js';
import type { IAiParser, ParseResult } from '../interfaces/ai-parser.interface.js';
import { FallbackParserService } from '../fallback-parser.service.js';

export class OpenAIAdapter implements IAiParser {
  private readonly logger = new Logger(OpenAIAdapter.name);
  private readonly openai: OpenAI;

  constructor(
    config: ConfigService,
    private readonly fallbackParser: FallbackParserService,
  ) {
    this.openai = new OpenAI({
      apiKey: config.get<string>('openai.apiKey'),
    });
  }

  async parse(text: string): Promise<ParseResult> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        tools: AI_TOOL_DEFINITIONS,
        tool_choice: 'required',
        temperature: 0.1,
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      const fn = toolCall && 'function' in toolCall ? toolCall.function : null;

      if (!fn) {
        this.logger.warn('No tool call in OpenAI response, using fallback');
        return this.useFallback(
          text,
          completion as unknown as Record<string, unknown>,
        );
      }

      const parsed = JSON.parse(fn.arguments) as Record<string, unknown>;

      return {
        action: fn.name,
        data: parsed,
        confidence: 0.95,
        rawOutput: {
          model: completion.model,
          usage: completion.usage,
          toolCall: {
            name: fn.name,
            arguments: parsed,
          },
        },
      };
    } catch (error) {
      this.logger.error(`OpenAI parse failed: ${error}`, (error as Error).stack);
      return this.useFallback(text);
    }
  }

  private useFallback(
    text: string,
    rawOutput?: Record<string, unknown>,
  ): ParseResult {
    const fallbackResult = this.fallbackParser.parse(text);

    if (fallbackResult) {
      return fallbackResult;
    }

    return {
      action: 'unknown',
      data: { originalText: text },
      confidence: 0,
      rawOutput: rawOutput ?? { error: 'Both AI and fallback failed' },
    };
  }
}
