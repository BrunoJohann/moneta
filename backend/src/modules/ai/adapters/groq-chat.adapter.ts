import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';

import type {
  ChatMessageInput,
  ChatResponse,
  IAiChatProvider,
  ToolDefinition,
} from '../interfaces/ai-chat-provider.interface.js';

export class GroqChatAdapter implements IAiChatProvider {
  private readonly logger = new Logger(GroqChatAdapter.name);
  private readonly client: OpenAI;

  readonly providerName = 'groq';
  readonly defaultModel = 'llama-3.3-70b-versatile';
  readonly availableModels = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it',
    'mixtral-8x7b-32768',
  ];

  constructor(config: ConfigService) {
    this.client = new OpenAI({
      apiKey: config.get<string>('groq.apiKey') ?? '',
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async chat(messages: ChatMessageInput[], model?: string, tools?: ToolDefinition[]): Promise<ChatResponse> {
    const selectedModel = model ?? this.defaultModel;

    const openAiMessages: ChatCompletionMessageParam[] = messages.map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.toolCallId!, content: m.content ?? '' };
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant',
          content: m.content,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        };
      }
      return { role: m.role as 'user' | 'system' | 'assistant', content: m.content ?? '' };
    });

    const completion = await this.client.chat.completions.create({
      model: selectedModel,
      messages: openAiMessages,
      temperature: 0.7,
      ...(tools?.length
        ? {
            tools: tools.map((t) => ({
              type: 'function' as const,
              function: { name: t.name, description: t.description, parameters: t.parameters },
            })),
            tool_choice: 'auto' as const,
          }
        : {}),
    });

    const choice = completion.choices[0];
    const toolCalls = choice.message.tool_calls?.map((tc) => {
      const fn = 'function' in tc ? tc.function : null;
      return {
        id: tc.id,
        name: fn?.name ?? '',
        arguments: (() => {
          try { return JSON.parse(fn?.arguments ?? '{}') as Record<string, unknown>; }
          catch { return {} as Record<string, unknown>; }
        })(),
      };
    });

    return {
      content: choice.message.content ?? null,
      model: completion.model,
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
          }
        : undefined,
    };
  }
}
