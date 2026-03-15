export const AI_PARSER = Symbol('IAiParser');

export interface ParseResult {
  action: string;
  data: Record<string, unknown>;
  confidence: number;
  rawOutput: Record<string, unknown>;
}

export interface IAiParser {
  parse(text: string): Promise<ParseResult>;
}
