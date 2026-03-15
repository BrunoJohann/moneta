# MONETA

**Sua assessora financeira no WhatsApp.**

Moneta is a multi-channel AI personal finance assistant SaaS that lets users track income, expenses, goals, and reminders through natural language — via WhatsApp or a web dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11 (TypeScript) |
| Database | PostgreSQL 16 + Prisma ORM |
| Queue | Redis + BullMQ |
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| AI | OpenAI API (gpt-4o-mini) with function calling |
| WhatsApp | Meta Cloud API v21.0 |
| Email | Resend |
| Auth | JWT + Email OTP |

## Project Structure

```
moneta/
├── backend/           NestJS API server
│   ├── prisma/        Database schema & migrations
│   └── src/
│       ├── common/    Shared config, guards, filters, decorators
│       ├── modules/   Feature modules (auth, messages, ai, transactions, etc.)
│       └── prisma/    Prisma service
├── frontend/          Next.js web dashboard
│   └── src/
│       ├── app/       Pages (App Router)
│       ├── components/ UI components
│       ├── hooks/     Custom React hooks
│       └── lib/       API client, auth helpers, utils
├── docs/              Product strategy & system design
└── docker-compose.yml Local Postgres + Redis
```

## Local Development

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 2. Setup backend

```bash
cd backend
cp .env.example .env
# Edit .env with your API keys (OpenAI, Resend, etc.)

npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

Backend runs on http://localhost:3001.

### 3. Setup frontend

```bash
cd frontend
cp .env.example .env.local

npm install
npm run dev
```

Frontend runs on http://localhost:3000.

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret (min 32 chars) |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `WHATSAPP_TOKEN` | Yes | Meta WhatsApp Cloud API token |
| `WHATSAPP_VERIFY_TOKEN` | Yes | Webhook verification token |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | WhatsApp business phone number ID |
| `META_APP_SECRET` | Yes | Meta app secret for HMAC validation |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `PORT` | No | Server port (default: 3001) |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_APP_URL` | No | App URL for absolute links |

## WhatsApp Webhook Setup

1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Create or select your WhatsApp Business app
3. Navigate to **WhatsApp > Configuration**
4. Set the callback URL: `https://your-api-domain.com/webhooks/whatsapp`
5. Set the verify token to match your `WHATSAPP_VERIFY_TOKEN` env var
6. Subscribe to the **messages** webhook field
7. Verify the webhook (Meta sends a GET request, your server responds with the challenge)

## Deployment (Railway)

### 1. Create Railway project

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
```

### 2. Add services

In the Railway dashboard:

- **PostgreSQL**: Add a PostgreSQL plugin. Copy the `DATABASE_URL`.
- **Redis**: Add a Redis plugin. Copy the `REDIS_URL`.
- **Backend**: Create a new service linked to your repo's `backend/` directory.
  - Set root directory: `/backend`
  - Add all backend env vars
  - Set build command: `npm run build`
  - Set start command: `npx prisma migrate deploy && npx prisma db seed && npm run start:prod`
- **Frontend**: Create a new service linked to your repo's `frontend/` directory.
  - Set root directory: `/frontend`
  - Add frontend env vars
  - Build and start commands auto-detected by Nixpacks

### 3. Configure domains

- Assign custom domains or use Railway-generated domains
- Update `FRONTEND_URL` in backend and `NEXT_PUBLIC_API_URL` in frontend

### Alternative: Render

1. Create a **Web Service** for the backend (Docker or Node.js)
2. Create a **Static Site** or **Web Service** for the frontend
3. Add **PostgreSQL** and **Redis** from Render's managed services
4. Configure env vars in each service's settings
5. Set build/start commands as above

## Production Hardening Checklist

- [ ] Generate strong random secrets for JWT_SECRET and JWT_REFRESH_SECRET
- [ ] Enable SSL on PostgreSQL connection (`?sslmode=require`)
- [ ] Set up Sentry for error tracking (add `@sentry/nestjs` and `@sentry/nextjs`)
- [ ] Configure rate limiting thresholds for production load
- [ ] Set up database backups (Railway/Render provide automated backups)
- [ ] Add Helmet middleware for security headers
- [ ] Configure CSP headers on the frontend
- [ ] Set up log aggregation (Railway logs or external service)
- [ ] Add health check endpoint (`GET /api/health`)
- [ ] Configure mTLS certificate for WhatsApp webhooks (Meta CA change March 2026)
- [ ] Set up monitoring alerts for queue depth and error rates
- [ ] Review and rotate API keys quarterly

## API Endpoints

### Auth
- `POST /api/auth/login` — Send OTP to email
- `POST /api/auth/verify` — Verify OTP, get tokens
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Revoke refresh token

### Messages
- `POST /api/messages` — Send natural language message (web)
- `GET /api/messages/:id` — Get message parse status

### Transactions
- `GET /api/transactions` — List with filters
- `GET /api/transactions/summary` — Monthly summary
- `GET /api/transactions/categories` — Category breakdown
- `GET /api/transactions/weekly` — Weekly totals
- `POST /api/transactions` — Create
- `PATCH /api/transactions/:id` — Update
- `DELETE /api/transactions/:id` — Delete

### Goals
- `GET /api/goals` — List all
- `POST /api/goals` — Create
- `PATCH /api/goals/:id` — Update
- `POST /api/goals/:id/progress` — Add progress
- `DELETE /api/goals/:id` — Cancel

### Reminders
- `GET /api/reminders` — List all
- `POST /api/reminders` — Create
- `PATCH /api/reminders/:id` — Update
- `DELETE /api/reminders/:id` — Delete

### Insights
- `GET /api/insights` — List (paginated)
- `GET /api/insights/latest` — Latest insight

### Users
- `GET /api/users/me` — Current user profile
- `PATCH /api/users/me` — Update profile

### Webhooks
- `GET /webhooks/whatsapp` — Meta verification
- `POST /webhooks/whatsapp` — Incoming messages

## License

Proprietary. All rights reserved.
