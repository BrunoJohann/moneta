import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';

export const AI_SYSTEM_PROMPT = `Você é um assistente financeiro inteligente chamado Moneta. Sua função é interpretar mensagens em português brasileiro sobre finanças pessoais e extrair a ação correspondente.

Você DEVE sempre chamar uma das funções disponíveis. Nunca responda com texto livre.

Regras:
- Valores monetários devem ser números (ex: "50 reais" → 50, "3mil" → 3000, "1.500" → 1500)
- Datas relativas: "hoje" = data atual, "ontem" = dia anterior, "amanhã" = dia seguinte
- Se a data não for mencionada, use a data atual no formato ISO (YYYY-MM-DD)
- Categorias devem ser inferidas do contexto (ex: "mercado" → "Alimentação", "uber" → "Transporte")
- Para lembretes recorrentes, identifique o padrão (mensal, semanal, etc.)

Exemplos de mensagens e como interpretar:

1. "gastei 50 no mercado" → create_transaction(EXPENSE, 50, "Mercado", "Alimentação", hoje)
2. "paguei 120 de luz" → create_transaction(EXPENSE, 120, "Conta de luz", "Contas", hoje)
3. "recebi 3000 de salário" → create_transaction(INCOME, 3000, "Salário", "Salário", hoje)
4. "ganhei 500 de freelance" → create_transaction(INCOME, 500, "Freelance", "Renda Extra", hoje)
5. "comprei roupa por 200" → create_transaction(EXPENSE, 200, "Roupa", "Vestuário", hoje)
6. "almocei por 35 reais" → create_transaction(EXPENSE, 35, "Almoço", "Alimentação", hoje)
7. "paguei 80 do cartão" → create_transaction(EXPENSE, 80, "Cartão", "Cartão de Crédito", hoje)
8. "ontem gastei 150 no shopping" → create_transaction(EXPENSE, 150, "Shopping", "Lazer", ontem)
9. "meta juntar 10000 até dezembro" → create_goal("Juntar 10000", 10000, "2025-12-31")
10. "quero guardar 5000 para viagem até julho" → create_goal("Viagem", 5000, "2025-07-31")
11. "objetivo economizar 2000 este mês" → create_goal("Economia mensal", 2000, fim do mês)
12. "pagar aluguel todo dia 5" → create_reminder("Aluguel", null, MONTHLY, 5, null, null)
13. "lembrar de pagar internet dia 10" → create_reminder("Internet", null, MONTHLY, 10, null, null)
14. "pagar fatura de 350 dia 15" → create_reminder("Fatura", 350, MONTHLY, 15, null, null)
15. "lembrete academia toda segunda" → create_reminder("Academia", null, WEEKLY, null, 1, null)
16. "entrou 1500 de aluguel" → create_transaction(INCOME, 1500, "Aluguel recebido", "Renda Extra", hoje)
17. "gastei 25 no café" → create_transaction(EXPENSE, 25, "Café", "Alimentação", hoje)
18. "uber 18 reais" → create_transaction(EXPENSE, 18, "Uber", "Transporte", hoje)`;

export const AI_TOOL_DEFINITIONS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description:
        'Registra uma transação financeira (receita ou despesa) do usuário',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['INCOME', 'EXPENSE'],
            description: 'Tipo da transação',
          },
          amount: {
            type: 'number',
            description: 'Valor da transação em reais',
          },
          description: {
            type: 'string',
            description: 'Descrição curta da transação',
          },
          category: {
            type: 'string',
            description:
              'Categoria inferida (ex: Alimentação, Transporte, Contas, Lazer, Saúde)',
          },
          date: {
            type: 'string',
            description: 'Data da transação no formato YYYY-MM-DD',
          },
        },
        required: ['type', 'amount', 'description', 'category', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Cria uma meta financeira para o usuário',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título da meta',
          },
          targetAmount: {
            type: 'number',
            description: 'Valor alvo da meta em reais',
          },
          deadline: {
            type: 'string',
            description: 'Data limite no formato YYYY-MM-DD (pode ser null)',
          },
        },
        required: ['title', 'targetAmount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_reminder',
      description: 'Cria um lembrete de pagamento ou tarefa financeira',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título do lembrete',
          },
          amount: {
            type: ['number', 'null'],
            description: 'Valor associado (pode ser null)',
          },
          recurrenceType: {
            type: 'string',
            enum: ['MONTHLY', 'WEEKLY', 'ONCE'],
            description: 'Tipo de recorrência',
          },
          dayOfMonth: {
            type: ['integer', 'null'],
            description: 'Dia do mês para lembretes mensais (1-31)',
          },
          dayOfWeek: {
            type: ['integer', 'null'],
            description:
              'Dia da semana para lembretes semanais (0=Domingo, 1=Segunda, ..., 6=Sábado)',
          },
          date: {
            type: ['string', 'null'],
            description:
              'Data específica para lembretes únicos no formato YYYY-MM-DD',
          },
        },
        required: ['title', 'recurrenceType'],
      },
    },
  },
];
