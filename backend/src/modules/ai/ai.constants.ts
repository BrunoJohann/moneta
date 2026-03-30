import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import type { ToolDefinition } from './interfaces/ai-chat-provider.interface.js';

export const AI_SYSTEM_PROMPT = `Você é um assistente financeiro inteligente chamado Moneta. Sua função é interpretar mensagens em português brasileiro sobre finanças pessoais e agenda e extrair a ação correspondente.

Você DEVE sempre chamar uma das funções disponíveis. Nunca responda com texto livre.

Regras:
- Valores monetários devem ser números (ex: "50 reais" → 50, "3mil" → 3000, "1.500" → 1500)
- Datas relativas: "hoje" = data atual, "ontem" = dia anterior, "amanhã" = dia seguinte
- Se a data não for mencionada, use a data atual no formato ISO (YYYY-MM-DD)
- Categorias devem ser inferidas do contexto (ex: "mercado" → "Alimentação", "uber" → "Transporte")
- Para lembretes recorrentes, identifique o padrão (mensal, semanal, etc.)
- Para eventos de agenda com data/hora específica, use create_event. Horários: "3 horas da tarde" = 15:00, "meio-dia" = 12:00, "de manhã" sem hora = 09:00
- Eventos de agenda são compromissos, reuniões, consultas, aniversários, etc. Lembretes são pagamentos e tarefas financeiras recorrentes.

Exemplos de mensagens e como interpretar:

1. "gastei 50 no mercado" → create_transaction(EXPENSE, 50, "Mercado", "Alimentação", hoje)
2. "paguei 120 de luz" → create_transaction(EXPENSE, 120, "Conta de luz", "Contas", hoje)
3. "recebi 3000 de salário" → create_transaction(INCOME, 3000, "Salário", "Salário", hoje)
4. "comprei roupa por 200" → create_transaction(EXPENSE, 200, "Roupa", "Vestuário", hoje)
5. "meta juntar 10000 até dezembro" → create_goal("Juntar 10000", 10000, "2025-12-31")
6. "quero guardar 5000 para viagem até julho" → create_goal("Viagem", 5000, "2025-07-31")
7. "pagar aluguel todo dia 5" → create_reminder("Aluguel", null, MONTHLY, 5, null, null)
8. "lembrar de pagar internet dia 10" → create_reminder("Internet", null, MONTHLY, 10, null, null)
9. "lembrete academia toda segunda" → create_reminder("Academia", null, WEEKLY, null, 1, null)
10. "tenho uma reunião amanhã às 14h com o cliente" → create_event("Reunião com cliente", amanhã T14:00, amanhã T15:00, false)
11. "compromisso amanhã as 3 horas da tarde com um amigo" → create_event("Compromisso com amigo", amanhã T15:00, amanhã T16:00, false)
12. "consulta médica na sexta às 10h" → create_event("Consulta médica", sexta T10:00, sexta T11:00, false)
13. "aniversário da Maria no dia 25" → create_event("Aniversário da Maria", dia 25 T00:00, null, true)
14. "tenho um evento dia 15 de abril" → create_event("Evento", 2026-04-15 T09:00, null, true)`;

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
  {
    type: 'function',
    function: {
      name: 'create_event',
      description:
        'Cria um evento na agenda do usuário (compromisso, reunião, consulta, aniversário, etc.)',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título descritivo do evento',
          },
          startAt: {
            type: 'string',
            description: 'Data e hora de início no formato ISO 8601 (ex: 2026-03-30T15:00:00)',
          },
          endAt: {
            type: ['string', 'null'],
            description: 'Data e hora de fim no formato ISO 8601. Se não informado, 1 hora após o início. Null para eventos de dia inteiro sem hora específica.',
          },
          allDay: {
            type: 'boolean',
            description: 'True se o evento é de dia inteiro sem horário específico',
          },
          location: {
            type: ['string', 'null'],
            description: 'Local do evento (opcional)',
          },
          description: {
            type: ['string', 'null'],
            description: 'Descrição adicional do evento (opcional)',
          },
        },
        required: ['title', 'startAt', 'allDay'],
      },
    },
  },
];

// ─── Chat-specific tools (full CRUD — used only in the web chat agentic loop) ──

export const CHAT_SYSTEM_PROMPT = `Você é Moneta, um assistente financeiro pessoal inteligente.
Ajude o usuário a entender suas finanças, responder dúvidas sobre gastos, receitas, metas, lembretes e agenda.
Seja objetivo, amigável e use formatação clara. Responda sempre em português brasileiro.

Quando o usuário mencionar um gasto, receita, meta, lembrete ou evento de agenda, use a função correspondente para registrá-lo e depois confirme na sua resposta. Exemplos:
- "Registrei o gasto de R$ 50,00 em Alimentação! ✓"
- "Adicionei 'Reunião com João' ao seu calendário para amanhã às 15h! ✓"
- "Meta 'Viagem' criada com valor alvo de R$ 5.000,00! ✓"

Se o usuário pedir para alterar ou apagar um registro, use as funções de update/delete passando o ID fornecido nos dados.
Se a mensagem for apenas uma pergunta ou conversa, responda normalmente sem chamar nenhuma função.

Para perguntas sobre histórico de transações, eventos passados ou detalhes de metas, use as ferramentas de busca (search_transactions, search_events, get_goals) em vez de dizer que não tem acesso aos dados.

Valores monetários: "50 reais" → 50, "3mil" → 3000, "1.500" → 1500.
Datas relativas: "hoje" = data atual, "ontem" = dia anterior, "amanhã" = dia seguinte.
Horários: "3 horas da tarde" = 15:00, "meio-dia" = 12:00, "de manhã" sem hora = 09:00.`;

export const CHAT_TOOL_DEFINITIONS: ToolDefinition[] = [
  // ── Create ──────────────────────────────────────────────────────────────────
  {
    name: 'create_transaction',
    description: 'Registra uma nova transação financeira (receita ou despesa)',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
        amount: { type: 'number', description: 'Valor em reais' },
        description: { type: 'string', description: 'Descrição curta' },
        category: { type: 'string', description: 'Categoria inferida (ex: Alimentação, Transporte)' },
        date: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
      },
      required: ['type', 'amount', 'description', 'category', 'date'],
    },
  },
  {
    name: 'update_transaction',
    description: 'Atualiza uma transação financeira existente pelo ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID da transação (visível no contexto)' },
        type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
        amount: { type: 'number' },
        description: { type: 'string' },
        category: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_transaction',
    description: 'Remove uma transação financeira pelo ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID da transação (visível no contexto)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_event',
    description: 'Cria um evento na agenda (compromisso, reunião, consulta, aniversário, etc.)',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        startAt: { type: 'string', description: 'ISO 8601 sem timezone (ex: 2026-03-30T15:00:00)' },
        endAt: { type: ['string', 'null'], description: 'ISO 8601 sem timezone. null para eventos de dia inteiro.' },
        allDay: { type: 'boolean' },
        location: { type: ['string', 'null'] },
        description: { type: ['string', 'null'] },
      },
      required: ['title', 'startAt', 'allDay'],
    },
  },
  {
    name: 'update_event',
    description: 'Atualiza um evento da agenda pelo ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID do evento (visível no contexto)' },
        title: { type: 'string' },
        startAt: { type: 'string', description: 'ISO 8601 sem timezone' },
        endAt: { type: ['string', 'null'] },
        allDay: { type: 'boolean' },
        location: { type: ['string', 'null'] },
        description: { type: ['string', 'null'] },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_event',
    description: 'Remove um evento da agenda pelo ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID do evento (visível no contexto)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_goal',
    description: 'Cria uma meta financeira',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        targetAmount: { type: 'number', description: 'Valor alvo em reais' },
        deadline: { type: ['string', 'null'], description: 'Data limite YYYY-MM-DD ou null' },
      },
      required: ['title', 'targetAmount'],
    },
  },
  {
    name: 'update_goal',
    description: 'Atualiza uma meta financeira pelo ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID da meta (visível no contexto)' },
        title: { type: 'string' },
        targetAmount: { type: 'number' },
        deadline: { type: ['string', 'null'] },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_reminder',
    description: 'Cria um lembrete de pagamento ou tarefa financeira recorrente',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        amount: { type: ['number', 'null'] },
        recurrenceType: { type: 'string', enum: ['MONTHLY', 'WEEKLY', 'ONCE'] },
        dayOfMonth: { type: ['integer', 'null'], description: '1-31 para lembretes mensais' },
        dayOfWeek: { type: ['integer', 'null'], description: '0=Dom … 6=Sáb para semanais' },
        date: { type: ['string', 'null'], description: 'YYYY-MM-DD para ONCE' },
      },
      required: ['title', 'recurrenceType'],
    },
  },
  // ── Read ────────────────────────────────────────────────────────────────────
  {
    name: 'search_transactions',
    description: 'Busca transações financeiras do usuário com filtros opcionais. Use para responder perguntas sobre gastos, receitas ou histórico financeiro.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Data inicial no formato YYYY-MM-DD (inclusive)' },
        endDate: { type: 'string', description: 'Data final no formato YYYY-MM-DD (inclusive)' },
        type: { type: 'string', enum: ['INCOME', 'EXPENSE'], description: 'Filtrar por tipo (opcional)' },
        limit: { type: 'integer', description: 'Número máximo de resultados (padrão: 20)' },
      },
      required: [],
    },
  },
  {
    name: 'search_events',
    description: 'Busca eventos da agenda do usuário em um intervalo de datas. Use para responder perguntas sobre compromissos passados ou futuros.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Data inicial no formato YYYY-MM-DD (inclusive)' },
        endDate: { type: 'string', description: 'Data final no formato YYYY-MM-DD (inclusive)' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_goals',
    description: 'Retorna as metas financeiras do usuário com progresso detalhado.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'], description: 'Filtrar por status (padrão: ACTIVE)' },
      },
      required: [],
    },
  },
];
