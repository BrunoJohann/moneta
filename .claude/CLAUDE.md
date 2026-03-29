# Moneta — Project Context for Claude Code

## O que é o Moneta

Moneta é um assistente financeiro pessoal multi-canal com IA. Usuários registram receitas, despesas, metas e lembretes via linguagem natural — pelo WhatsApp ou pelo dashboard web. O projeto está em estágio MVP.

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Backend | NestJS 11 + TypeScript 5.7 |
| Frontend | Next.js 14 (App Router) + TypeScript |
| Banco de dados | PostgreSQL 16 via Prisma ORM |
| Fila | Redis 7 + BullMQ |
| IA (chat) | OpenAI GPT-4o-mini (padrão) ou Anthropic Claude 3.5 Sonnet (configurável por admin) |
| IA (transcrição) | OpenAI Whisper (sempre, independente do provider de chat) |
| IA (parsing) | OpenAI GPT-4o-mini + fallback local |
| Autenticação | Email OTP + JWT (access + refresh tokens) |
| Email | Resend (prod) / Mailpit SMTP (dev) |
| WhatsApp | Meta Cloud API v21 |
| Estilização | Tailwind CSS + shadcn/ui + Radix UI |
| Infra local | Docker Compose (Postgres + Redis + Mailpit) |

---

## Estrutura de Diretórios

```
/
├── backend/          # NestJS API (porta 3001)
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/   # filtros, interceptors, decorators, config
│   │   ├── prisma/   # PrismaModule
│   │   └── modules/  # Todos os módulos de negócio
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts
│       └── migrations/
├── frontend/         # Next.js (porta 3000)
│   └── src/
│       ├── app/      # Rotas (App Router)
│       ├── components/
│       ├── hooks/
│       └── lib/api.ts
├── docs/             # Estratégia de produto e design
└── docker-compose.yml
```

---

## Backend — Módulos

Localização: `backend/src/modules/`

| Módulo | Responsabilidade |
|--------|-----------------|
| `auth` | OTP por e-mail, JWT, refresh token, logout |
| `users` | Perfil do usuário |
| `transactions` | CRUD de transações + summaries/breakdowns |
| `categories` | Categorias padrão e do usuário |
| `goals` | Metas financeiras + progresso |
| `reminders` | Lembretes (once/weekly/monthly) |
| `messages` | Ingestão de mensagens (idempotente) |
| `ai` | Parsing com OpenAI ou fallback local; adapters: openai, anthropic, mock |
| `ai-settings` | Configuração global de provider/modelo de IA (admin only) |
| `insights` | Insights gerados por IA |
| `forecast` | Projeção financeira |
| `chat` | Sessões de chat web com histórico, áudio e ações financeiras automáticas |
| `messaging` | Abstração multi-canal (WhatsApp / mock) |
| `email` | Abstração de e-mail (Resend / SMTP) |
| `queue` | Setup do BullMQ |
| `whatsapp` | Webhook Meta + envio de mensagens |

### Padrões do Backend
- **Guards globais:** `ThrottlerGuard` (60 req/60s), `JwtAuthGuard`
- **@Public()** — decorator para rotas sem autenticação
- **@AdminOnly()** — decorator para rotas admin (valida ADMIN_EMAILS do .env)
- **@CurrentUser()** — extrai usuário do JWT no controller
- **Filtro global:** `AllExceptionsFilter`
- **Interceptor global:** `LoggingInterceptor`
- **Porta:** 3001
- **Prefixo da API:** `/api` (exceto `/webhooks`)

---

## Banco de Dados — Entidades Principais

```
User              — id, email, name, phone, whatsappVerified, timezone (default: America/Sao_Paulo)
AuthSession       — OTP hash, expiração, uso
RefreshToken      — token hash, expiração, revogação
Transaction       — type (INCOME|EXPENSE), amount (DECIMAL 12,2), date, categoryId, messageLogId
Category          — userId (null = global), name, icon, color, isDefault
Goal              — title, targetAmount, currentAmount, deadline, status, messageLogId
Reminder          — title, amount, recurrenceType, dayOfMonth, dayOfWeek, nextDueDate, isActive
MessageLog        — idempotencyKey, rawText, parsedAction, aiRawOutput, status, errorMessage
AiInsight         — type, content, metadata, sentViaWhatsapp
ChatSession       — userId, title, createdAt, updatedAt
ChatMessage       — sessionId, role (USER|ASSISTANT), content, transcribedFrom, createdAt
AiProviderConfig  — provider (OPENAI|ANTHROPIC), model, updatedBy, updatedAt (singleton global)
```

### Enums
- `TransactionType`: INCOME, EXPENSE
- `MessageChannel`: WHATSAPP, WEB
- `MessageStatus`: PENDING, PROCESSING, COMPLETED, FAILED
- `GoalStatus`: ACTIVE, COMPLETED, CANCELLED
- `RecurrenceType`: ONCE, WEEKLY, MONTHLY
- `InsightType`: DAILY_SUMMARY, SPENDING_ALERT, FORECAST, TIP
- `AiProvider`: OPENAI, ANTHROPIC
- `ChatRole`: USER, ASSISTANT

---

## Frontend — Rotas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/login` | `app/(auth)/login/page.tsx` | Formulário de e-mail para OTP |
| `/verify` | `app/(auth)/verify/page.tsx` | Verificação do código OTP |
| `/` | `app/(dashboard)/page.tsx` | Dashboard: cards, gráficos, transações recentes |
| `/transactions` | `app/(dashboard)/transactions/page.tsx` | Lista + CRUD de transações com filtros |
| `/goals` | `app/(dashboard)/goals/page.tsx` | Gestão de metas com progresso e forecast |
| `/insights` | `app/(dashboard)/insights/page.tsx` | Feed de insights por IA |
| `/chat` | `app/(dashboard)/chat/page.tsx` | Chat multi-sessão com IA (texto + áudio) |
| `/settings` | `app/(dashboard)/settings/page.tsx` | Configuração de provider/modelo de IA (admin edit, read-only para usuários) |

### Componentes (`frontend/src/components/`)

| Pasta | Componentes |
|-------|------------|
| `chat/` | `chat-interface.tsx`, `message-bubble.tsx`, `audio-recorder.tsx` |
| `composer/` | `message-composer.tsx`, `composer-trigger.tsx`, `parsed-preview.tsx` |
| `dashboard/` | `summary-cards.tsx`, `income-expense-chart.tsx`, `category-chart.tsx`, `recent-transactions.tsx` |
| `layout/` | `sidebar.tsx`, `bottom-nav.tsx`, `top-bar.tsx` |
| `shared/` | `currency.tsx`, `loading-skeleton.tsx` |
| `ui/` | Primitivos Radix UI (button, card, dialog, input, select, tabs, etc.) |

### Cliente de API (`lib/api.ts`)
Wrapper fetch com namespace. Gerenciamento de tokens automático:
- Access token: `localStorage.moneta_token`
- Refresh token: `localStorage.moneta_refresh_token`
- Cookie de sessão: `moneta_session=true` (7 dias)
- Auto-refresh em respostas 401

**Namespaces disponíveis:** `auth`, `transactions`, `goals`, `reminders`, `categories`, `insights`, `users`, `forecast`, `dashboard`, `chat`, `aiSettings`

### Middleware de Autenticação
`src/middleware.ts` — redireciona usuários não autenticados para `/login` via cookie `moneta_session`.

---

## Autenticação — Fluxo

1. `POST /api/auth/login` → envia OTP de 6 dígitos por e-mail (10 min)
2. `POST /api/auth/verify` → valida OTP, retorna JWT + refresh token
3. `POST /api/auth/refresh` → renova access token
4. `POST /api/auth/logout` → revoga refresh token

Tokens são armazenados **hasheados** (SHA256) no banco.

---

## Chat — Fluxo

1. Criar sessão → `POST /api/chat/sessions`
2. Enviar mensagem → `POST /api/chat/sessions/:id/messages`
   - Salva mensagem do usuário
   - Busca últimas 20 mensagens como histórico
   - Chama AI provider (OpenAI ou Anthropic) com histórico completo
   - Executa parsing financeiro em paralelo
   - Se ação detectada: cria Transaction / Goal / Reminder automaticamente
   - Salva resposta do assistant
3. Enviar áudio → `POST /api/chat/sessions/:id/audio`
   - Transcreve com Whisper (sempre OpenAI)
   - Chama fluxo de mensagem com texto transcrito
   - Retorna `{ transcribedText, assistantMessage }`

---

## Scripts de Desenvolvimento

### Backend
```bash
cd backend
npm run start:dev          # dev com watch
npm run prisma:migrate     # aplicar migrations
npm run prisma:seed        # seed 17 categorias padrão
npm run prisma:studio      # GUI do banco
npm run test               # jest
```

### Frontend
```bash
cd frontend
npm run dev                # Next.js na porta 3000
npm run build
npm run lint
```

### Infra
```bash
docker compose up -d       # Postgres + Redis + Mailpit
# Portas: Postgres 5432, Redis 6379, Mailpit SMTP 1025, Mailpit WebUI 8025
```

---

## Variáveis de Ambiente

### Backend (`.env`)
```
DATABASE_URL           # PostgreSQL connection string
REDIS_URL              # Redis connection string
JWT_SECRET             # min 32 chars
JWT_REFRESH_SECRET     # min 32 chars
OPENAI_API_KEY         # necessário para chat e transcrição
WHATSAPP_TOKEN         # Meta Cloud API token
WHATSAPP_VERIFY_TOKEN  # token de verificação do webhook
WHATSAPP_PHONE_NUMBER_ID
META_APP_SECRET        # para HMAC do webhook
RESEND_API_KEY         # produção: Resend API
SMTP_HOST / SMTP_PORT  # dev: Mailpit (localhost:1025)
FRONTEND_URL           # CORS (http://localhost:3000)
PORT                   # default: 3001
NODE_ENV               # development | production
ADMIN_EMAILS           # e-mails admin separados por vírgula
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL    # http://localhost:3001/api
NEXT_PUBLIC_APP_URL    # http://localhost:3000
```

---

## Endpoints da API

### Públicos
- `POST /api/auth/login` — solicitar OTP
- `POST /api/auth/verify` — verificar OTP
- `POST /api/auth/refresh` — renovar tokens
- `POST /api/auth/logout` — revogar refresh token
- `GET/POST /webhooks/whatsapp` — webhook Meta
- `GET /api/ai-settings` — ler provider/modelo ativo
- `GET /api/ai-settings/providers` — listar providers disponíveis

### Protegidos (JWT)
- `GET/POST/PATCH/DELETE /api/transactions`
- `GET /api/transactions/summary` — totais do mês
- `GET /api/transactions/categories` — breakdown por categoria
- `GET /api/transactions/weekly` — tendência semanal
- `GET/POST/PATCH/DELETE /api/goals`
- `POST /api/goals/:id/progress`
- `GET/POST/PATCH/DELETE /api/reminders`
- `GET/POST/PATCH/DELETE /api/categories`
- `GET /api/insights`, `GET /api/insights/latest`
- `GET /api/forecast`
- `POST /api/messages`, `GET /api/messages/:id`
- `GET /api/users/me`, `PATCH /api/users/me`
- `GET/POST /api/chat/sessions`
- `GET/DELETE /api/chat/sessions/:id`
- `POST /api/chat/sessions/:id/messages`
- `POST /api/chat/sessions/:id/audio`

### Admin (JWT + AdminGuard)
- `PUT /api/ai-settings` — alterar provider/modelo global de IA

---

## Arquivos-Chave para Navegar

| Arquivo | Finalidade |
|---------|-----------|
| `backend/prisma/schema.prisma` | Schema completo do banco |
| `backend/src/app.module.ts` | Registro de módulos e providers globais |
| `backend/src/common/config/configuration.ts` | Configuração + validação Joi |
| `backend/src/modules/ai/ai-provider.factory.ts` | Seleção dinâmica de provider de IA |
| `backend/src/modules/ai/adapters/` | Adapters OpenAI, Anthropic, Mock |
| `backend/src/modules/chat/chat.service.ts` | Lógica central do chat |
| `frontend/src/lib/api.ts` | Cliente HTTP completo do frontend |
| `frontend/src/middleware.ts` | Proteção de rotas |
| `frontend/src/components/chat/chat-interface.tsx` | UI principal do chat |
| `docker-compose.yml` | Serviços locais |
