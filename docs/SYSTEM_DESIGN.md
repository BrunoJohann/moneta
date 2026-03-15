# MONETA — System Design

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INPUT CHANNELS                               │
│  ┌──────────────────┐              ┌──────────────────────────┐     │
│  │  WhatsApp Cloud   │              │  Web Dashboard Composer   │     │
│  │  (Meta API v21)   │              │  (Next.js 14)             │     │
│  └────────┬─────────┘              └────────────┬─────────────┘     │
│           │ POST /webhooks/whatsapp              │ POST /api/messages│
└───────────┼──────────────────────────────────────┼──────────────────┘
            │                                      │
            ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       NestJS API SERVER                              │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────────────────────┐       │
│  │ WhatsApp Webhook  │    │  Messages Controller (JWT auth)   │       │
│  │ Controller        │    │                                   │       │
│  │ (HMAC guard)      │    └───────────────┬──────────────────┘       │
│  └────────┬─────────┘                    │                           │
│           │                              │                           │
│           ▼                              ▼                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Message Ingestion Service                       │    │
│  │  1. Validate idempotency key                                 │    │
│  │  2. Persist message_log (status: PENDING)                    │    │
│  │  3. Enqueue to BullMQ "ai-parse" queue                       │    │
│  └─────────────────────────────┬───────────────────────────────┘    │
│                                │                                     │
│  ┌─────────────────────────────▼───────────────────────────────┐    │
│  │              BullMQ Queue ("ai-parse")                       │    │
│  │  Redis-backed • 3 retries • exponential backoff              │    │
│  └─────────────────────────────┬───────────────────────────────┘    │
│                                │                                     │
│  ┌─────────────────────────────▼───────────────────────────────┐    │
│  │              AI Parse Worker (Processor)                      │    │
│  │  1. Fetch message_log from DB                                │    │
│  │  2. Call OpenAI function calling (gpt-4o-mini)               │    │
│  │  3. On failure → fallback regex parser                       │    │
│  │  4. Create entity (transaction/goal/reminder)                │    │
│  │  5. Update message_log (status: COMPLETED, parsedAction)     │    │
│  │  6. If WhatsApp channel → send confirmation via WhatsApp     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐     │
│  │ REST API Controllers      │  │ Scheduled Jobs (Cron)         │     │
│  │ • /transactions (CRUD)    │  │ • Daily 8AM: AI Insights      │     │
│  │ • /goals (CRUD)           │  │ • Hourly: Reminder check      │     │
│  │ • /reminders (CRUD)       │  │                               │     │
│  │ • /insights (list)        │  └──────────────┬───────────────┘     │
│  │ • /dashboard/summary      │                 │                     │
│  └──────────────────────────┘                  ▼                     │
│                                   ┌──────────────────────────┐       │
│                                   │ WhatsApp Sender Service   │       │
│                                   │ (Meta Graph API v21)      │       │
│                                   └──────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
            │                                      │
            ▼                                      ▼
     ┌──────────────┐                    ┌──────────────┐
     │  PostgreSQL   │                    │    Redis      │
     │  (data store) │                    │  (queues +    │
     │               │                    │   sessions)   │
     └──────────────┘                    └──────────────┘
```

## 2. Data Flows

### 2.1 WhatsApp Message Flow

```
User sends "gastei 50 no mercado" via WhatsApp
    │
    ▼
Meta Cloud API delivers POST to /webhooks/whatsapp
    │
    ├─► WhatsAppSignatureGuard validates HMAC-SHA256 (X-Hub-Signature-256)
    │   Uses META_APP_SECRET to compute expected hash
    │   Rejects with 401 if mismatch
    │
    ▼
WhatsAppWebhookController
    ├─► Extracts: message.text.body, message.from (phone), message.id
    ├─► Looks up user by phone number (creates pending user if not found)
    ├─► Calls MessageIngestionService.ingest({
    │     userId, channel: WHATSAPP, text, idempotencyKey: whatsapp_msg_id
    │   })
    ├─► Returns 200 OK immediately (Meta requires fast response)
    │
    ▼
MessageIngestionService.ingest()
    ├─► Checks idempotency: if message_log with same key exists → skip
    ├─► Creates message_log record (status: PENDING)
    ├─► Enqueues job { messageLogId } to "ai-parse" BullMQ queue
    │
    ▼
AiParseProcessor (BullMQ worker)
    ├─► Updates message_log status → PROCESSING
    ├─► Calls AiParserService.parse(rawText)
    │   ├─► Sends to OpenAI with function calling tools
    │   ├─► On success: returns { action, data, confidence }
    │   ├─► On failure/timeout: FallbackParserService.parse(rawText)
    │
    ├─► Based on action type:
    │   ├─► create_transaction → TransactionsService.create()
    │   ├─► create_goal → GoalsService.create()
    │   ├─► create_reminder → RemindersService.create()
    │
    ├─► Updates message_log: status → COMPLETED, parsedAction, aiRawOutput
    ├─► Sends WhatsApp confirmation: "Registrado: Despesa R$ 50,00 — Mercado (Alimentação)"
```

### 2.2 Web Composer Flow

```
User types "recebi 3000 salario" in web composer
    │
    ▼
Frontend POST /api/messages { text, idempotencyKey: client_uuid }
    │
    ├─► JWT auth middleware validates token
    │
    ▼
MessagesController → MessageIngestionService.ingest()
    ├─► Same flow as WhatsApp (persist + enqueue)
    ├─► Returns { messageLogId, status: PENDING }
    │
    ▼
Frontend polls GET /api/messages/:id (or uses SSE/webhook)
    ├─► When status → COMPLETED, receives parsed result
    │
    ▼
Frontend shows ParsedPreview component
    ├─► Type: INCOME, Amount: R$ 3.000, Category: Salário, Date: today
    ├─► User can edit any field
    ├─► On "Confirmar" → transaction is already created, show success
    ├─► On edit → PATCH /api/transactions/:id with corrections
```

## 3. Queue & Worker Design

### BullMQ Configuration

- **Queue name:** `ai-parse`
- **Connection:** Redis (same instance, dedicated DB index)
- **Concurrency:** 5 (parallel job processing)
- **Job options:**
  - `attempts: 3`
  - `backoff: { type: 'exponential', delay: 2000 }`
  - `removeOnComplete: { count: 1000 }` (keep last 1000 for debugging)
  - `removeOnFail: { count: 5000 }`
  - `timeout: 30000` (30s max per job)

### Worker Process

Runs in-process for MVP (can be extracted to separate process for scale).

```
Job payload: { messageLogId: string }

Worker steps:
1. Fetch message_log from DB (including user)
2. Update status → PROCESSING
3. Try: AiParserService.parse(rawText)
   - OpenAI call with 15s timeout
   - On success → extract tool call result
4. Catch: FallbackParserService.parse(rawText)
   - Regex-based extraction
   - Lower confidence score
5. Create appropriate entity (transaction/goal/reminder)
6. Update message_log with parsed result
7. If channel === WHATSAPP → send confirmation message
8. If channel === WEB → result available via polling
```

### Dead Letter Queue

Jobs that fail after 3 attempts go to `ai-parse-dlq`. Logged with full context for manual review.

## 4. Cron Job Design

### Daily AI Insights (8:00 AM UTC-3)

```
Schedule: '0 11 * * *' (UTC, = 8 AM BRT)

For each active user:
1. Query transactions from last 7 days
2. Query transactions from previous 7 days (comparison)
3. Calculate:
   - Total spend this week vs last week
   - Category breakdown with % changes
   - Detect spikes: any category > 30% above 4-week average
   - End-of-month projection (ForecastService)
4. Generate insight text in pt-BR
5. Store in ai_insights table
6. If user has WhatsApp linked → send via WhatsApp
```

### Hourly Reminder Check

```
Schedule: '0 * * * *' (every hour)

1. Query reminders WHERE nextDueDate <= NOW() AND isActive = true
2. For each reminder:
   a. Send WhatsApp notification to user
   b. If recurring → calculate next occurrence, update nextDueDate
   c. If one-time → set isActive = false
```

## 5. Module Boundaries

```
AppModule
├── ConfigModule (global)       — env validation, typed config
├── PrismaModule (global)       — database connection
├── AuthModule                  — login, verify, JWT, guards
├── UsersModule                 — user profile CRUD
├── MessagesModule              — ingestion pipeline, message_logs
├── QueueModule                 — BullMQ setup, AI parse processor
├── AiModule                    — OpenAI parser, fallback parser
├── TransactionsModule          — CRUD, filters, aggregations
├── CategoriesModule            — default + custom categories
├── GoalsModule                 — CRUD, progress, forecast
├── RemindersModule             — CRUD, cron scheduler
├── InsightsModule              — daily cron, store, list
├── ForecastModule              — end-of-month projection logic
├── WhatsAppModule              — webhook handler, sender service
├── ThrottlerModule (global)    — rate limiting
└── ScheduleModule (global)     — @nestjs/schedule for crons
```

Each module follows NestJS convention:
- `*.module.ts` — module definition with imports/exports
- `*.controller.ts` — HTTP endpoints
- `*.service.ts` — business logic
- `*.dto.ts` — request/response DTOs with class-validator
- `*.processor.ts` — BullMQ workers (queue module only)

## 6. Security

### Authentication
- **Method:** Email OTP (6-digit code) + JWT
- **Access token:** 15-minute expiry, stored in httpOnly cookie
- **Refresh token:** 7-day expiry, stored in httpOnly cookie, rotated on use
- **Token storage:** Hashed (SHA-256) in database
- **Global guard:** JwtAuthGuard applied globally, @Public() decorator to bypass

### Webhook Security
- **HMAC-SHA256 validation:** Every WhatsApp webhook POST is validated against META_APP_SECRET
- **Raw body preservation:** NestJS middleware preserves raw body for signature computation
- **Constant-time comparison:** Uses `crypto.timingSafeEqual` to prevent timing attacks

### Secret Handling
- **Environment variables:** All secrets via env vars, never in code
- **Joi validation:** App fails to start if required env vars are missing
- **`.env.example`:** Template with placeholder values, `.env` gitignored

### Rate Limiting
- **@nestjs/throttler:** Applied globally
  - Default: 60 requests per minute per IP
  - Auth endpoints: 5 requests per minute (prevent OTP brute-force)
  - Webhook: 100 requests per minute (Meta sends bursts)

### Input Validation
- **class-validator + class-transformer:** All DTOs validated with decorators
- **Prisma:** Parameterized queries (SQL injection prevention built-in)
- **Sanitization:** Strip HTML/scripts from user text input

### CORS
- Backend allows only FRONTEND_URL origin
- Credentials: true (for httpOnly cookies)

### Future Security (post-MVP)
- Helmet middleware (security headers)
- CSP headers on frontend
- API key rotation mechanism
- Audit logging
