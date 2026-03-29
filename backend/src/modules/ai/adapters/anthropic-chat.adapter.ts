import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ChatMessageInput, ChatResponse, IAiChatProvider, ToolDefinition } from '../interfaces/ai-chat-provider.interface.js';

/**
 * Anthropic (Claude) chat adapter.
 *
 * To enable, install the SDK:
 *   npm install @anthropic-ai/sdk
 *
 * Then uncomment the import and update the implementation below.
 * Set ANTHROPIC_API_KEY in your .env file.
 */
// import Anthropic from '@anthropic-ai/sdk';

export class AnthropicChatAdapter implements IAiChatProvider {
  private readonly logger = new Logger(AnthropicChatAdapter.name);
  // private readonly client: Anthropic;

  readonly providerName = 'anthropic';
  readonly defaultModel = 'claude-3-5-haiku-20241022';
  readonly availableModels = [
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20241022',
    'claude-opus-4-6',
  ];

  constructor(private readonly config: ConfigService) {
    // this.client = new Anthropic({ apiKey: config.get<string>('anthropic.apiKey') });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async chat(messages: ChatMessageInput[], model?: string, _tools?: ToolDefinition[]): Promise<ChatResponse> {
    // TODO: uncomment after installing @anthropic-ai/sdk
    throw new Error(
      'Anthropic adapter not fully configured. Install @anthropic-ai/sdk and set ANTHROPIC_API_KEY.',
    );

    /*
    const selectedModel = model ?? this.defaultModel;

    // Separate system messages from conversation
    const systemMsg = messages.find((m) => m.role === 'system');
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: selectedModel,
      max_tokens: 1024,
      system: systemMsg?.content,
      messages: conversationMessages,
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';

    return {
      content: text,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      },
    };
    */
  }
}
