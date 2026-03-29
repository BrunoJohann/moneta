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

export class OpenAiChatAdapter implements IAiChatProvider {
  private readonly logger = new Logger(OpenAiChatAdapter.name);
  private readonly openai: OpenAI;

  readonly providerName = 'openai';
  readonly defaultModel = 'gpt-4o-mini';
  readonly availableModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'];

  constructor(config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: config.get<string>('openai.apiKey'),
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

    const completion = await this.openai.chat.completions.create({
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

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav';
    const filename = `audio.${extension}`;

    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength,
    ) as ArrayBuffer;
    const file = new File([arrayBuffer], filename, { type: mimeType });

    const transcription = await this.openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'pt',
    });

    return transcription.text;
  }
}
