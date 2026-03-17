import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import type { ChatMessageInput, ChatResponse, IAiChatProvider } from '../interfaces/ai-chat-provider.interface.js';

export const OPENAI_CHAT_SYSTEM_PROMPT = `Você é Moneta, um assistente financeiro pessoal inteligente.
Ajude o usuário a entender suas finanças, responder dúvidas sobre gastos, receitas, metas e orçamento.
Seja objetivo, amigável e use formatação clara. Responda sempre em português brasileiro.
Quando o usuário mencionar um gasto, receita, meta ou lembrete (ex: "gastei 50 reais em pastel", "recebi 2000 de salário"), confirme que você registrou automaticamente. Exemplo: "Registrei o gasto de R$ 50,00 em Alimentação! ✓". Se a mensagem for apenas uma pergunta ou conversa, responda normalmente sem mencionar nenhum registro.`;

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

  async chat(messages: ChatMessageInput[], model?: string): Promise<ChatResponse> {
    const selectedModel = model ?? this.defaultModel;

    const completion = await this.openai.chat.completions.create({
      model: selectedModel,
      messages,
      temperature: 0.7,
    });

    const choice = completion.choices[0];

    return {
      content: choice.message.content ?? '',
      model: completion.model,
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

    // Copy to a plain ArrayBuffer to satisfy the BlobPart type constraint
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
