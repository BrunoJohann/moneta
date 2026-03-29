export const AI_CHAT_PROVIDER = Symbol('IAiChatProvider');

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  toolCallId?: string;
  toolCalls?: ToolCallRequest[];
}

export interface ChatResponse {
  content: string | null;
  model: string;
  toolCalls?: ToolCallRequest[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface IAiChatProvider {
  readonly providerName: string;
  readonly defaultModel: string;
  readonly availableModels: string[];

  chat(messages: ChatMessageInput[], model?: string, tools?: ToolDefinition[]): Promise<ChatResponse>;
  transcribeAudio?(audioBuffer: Buffer, mimeType: string): Promise<string>;
}
