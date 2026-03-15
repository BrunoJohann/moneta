import { Injectable, Logger } from '@nestjs/common';

import type { ParseResult } from './interfaces/ai-parser.interface.js';

export type { ParseResult };

@Injectable()
export class FallbackParserService {
  private readonly logger = new Logger(FallbackParserService.name);

  parse(text: string): ParseResult | null {
    const normalized = text.trim().toLowerCase();

    const expense = this.tryExpense(normalized, text);
    if (expense) return expense;

    const income = this.tryIncome(normalized, text);
    if (income) return income;

    const goal = this.tryGoal(normalized, text);
    if (goal) return goal;

    const reminder = this.tryReminder(normalized, text);
    if (reminder) return reminder;

    this.logger.warn(`Fallback parser could not parse: "${text}"`);
    return null;
  }

  private tryExpense(normalized: string, original: string): ParseResult | null {
    const pattern =
      /(?:gastei|paguei|comprei)\s+(\d+(?:[.,]\d{1,2})?)\s*(?:reais\s*)?(?:em|de|no|na)?\s*(.+)/i;
    const match = pattern.exec(normalized);
    if (!match) return null;

    const amount = Number.parseFloat(match[1].replace(',', '.'));
    const description = match[2].trim();

    return {
      action: 'create_transaction',
      data: {
        type: 'EXPENSE',
        amount,
        description,
        category: this.guessCategory(description),
        date: new Date().toISOString().split('T')[0],
      },
      confidence: 0.6,
      rawOutput: { source: 'fallback', original },
    };
  }

  private tryIncome(normalized: string, original: string): ParseResult | null {
    const pattern =
      /(?:recebi|ganhei|entrou)\s+(\d+(?:[.,]\d{1,2})?)\s*(?:reais\s*)?(?:de\s+)?(.+)?/i;
    const match = pattern.exec(normalized);
    if (!match) return null;

    const amount = Number.parseFloat(match[1].replace(',', '.'));
    const description = match[2]?.trim() || 'Receita';

    return {
      action: 'create_transaction',
      data: {
        type: 'INCOME',
        amount,
        description,
        category: 'Renda',
        date: new Date().toISOString().split('T')[0],
      },
      confidence: 0.6,
      rawOutput: { source: 'fallback', original },
    };
  }

  private tryGoal(normalized: string, original: string): ParseResult | null {
    const pattern =
      /(?:meta|objetivo|juntar|guardar)\s+(\d+(?:[.,]\d{1,2})?)\s*(?:reais\s*)?(?:at[eé]|para)\s*(.+)/i;
    const match = pattern.exec(normalized);
    if (!match) return null;

    const targetAmount = Number.parseFloat(match[1].replace(',', '.'));
    const deadlineHint = match[2].trim();

    return {
      action: 'create_goal',
      data: {
        title: deadlineHint,
        targetAmount,
        deadline: null,
      },
      confidence: 0.6,
      rawOutput: { source: 'fallback', original },
    };
  }

  private tryReminder(
    normalized: string,
    original: string,
  ): ParseResult | null {
    const pattern =
      /(?:pagar|lembrar|lembrete)\s+(.+?)(?:\s+(?:todo|dia|cada)\s+(?:dia\s+)?(\d+))?$/i;
    const match = pattern.exec(normalized);
    if (!match) return null;

    const title = match[1].trim();
    const dayOfMonth = match[2] ? Number.parseInt(match[2], 10) : null;

    return {
      action: 'create_reminder',
      data: {
        title,
        amount: null,
        recurrenceType: dayOfMonth ? 'MONTHLY' : 'ONCE',
        dayOfMonth,
        dayOfWeek: null,
        date: dayOfMonth ? null : new Date().toISOString().split('T')[0],
      },
      confidence: 0.6,
      rawOutput: { source: 'fallback', original },
    };
  }

  private guessCategory(description: string): string {
    const lower = description.toLowerCase();
    const map: Record<string, string[]> = {
      Alimentação: [
        'mercado',
        'supermercado',
        'almoço',
        'jantar',
        'café',
        'restaurante',
        'padaria',
        'lanche',
        'ifood',
      ],
      Transporte: ['uber', 'gasolina', 'estacionamento', 'ônibus', 'metrô'],
      Contas: ['luz', 'água', 'internet', 'telefone', 'gás'],
      Lazer: ['cinema', 'shopping', 'netflix', 'spotify', 'jogo'],
      Saúde: ['farmácia', 'médico', 'remédio', 'academia'],
    };

    for (const [category, keywords] of Object.entries(map)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        return category;
      }
    }

    return 'Outros';
  }
}
