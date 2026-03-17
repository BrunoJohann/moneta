export const AI_CHAT_PROVIDER = Symbol('IAiChatProvider');

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface IAiChatProvider {
  readonly providerName: string;
  readonly defaultModel: string;
  readonly availableModels: string[];

  chat(messages: ChatMessageInput[], model?: string): Promise<ChatResponse>;
  transcribeAudio?(audioBuffer: Buffer, mimeType: string): Promise<string>;
}
