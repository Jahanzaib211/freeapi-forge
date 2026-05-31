# Forge Studio v3.0

**Self-hosted AI Lab Control Center** — A unified proxy layer between your applications and LLM providers with routing, fallbacks, budget tracking, monitoring, and a rich web dashboard.

Built by [Jahanzaib Ali](https://alilabsx.com)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                     │
│  Web Dashboard (React 19) · API Consumers · Browser Extension       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP/WebSocket
┌───────────────────────────────▼─────────────────────────────────────┐
│                      FORGE STUDIO (:5051)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Express  │ │  tRPC    │ │WebSocket │ │OpenAI API│ │  MCP SSE │ │
│  │  Server  │ │ Router   │ │  Server  │ │ Compat   │ │ Endpoint │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │            │            │            │            │         │
│  ┌────▼────────────▼────────────▼────────────▼────────────▼─────┐  │
│  │                    REQUEST PIPELINE                          │  │
│  │  Auth → Rate Limit → Budget Check → Guardrails → Route      │  │
│  └────────────────────────────┬─────────────────────────────────┘  │
│                               │                                    │
│  ┌───────────┐  ┌─────────────▼──────────────┐  ┌──────────────┐  │
│  │ 27 Service│  │      LLM ROUTER            │  │  21 DB Table │  │
│  │  Modules  │  │  Circuit Breaker + Fallback │  │   (Drizzle)  │  │
│  └───────────┘  └─────────────┬──────────────┘  └──────────────┘  │
└───────────────────────────────┼────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────┐
│                    PROVIDER LAYER                                   │
│  Groq · Gemini · Mistral · Cerebras · SambaNova · Cohere          │
│  OpenRouter · Cloudflare · Ollama · llama.cpp · Custom APIs        │
└────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, wouter, tRPC Client, TanStack Query, Recharts, shadcn/ui |
| Backend | Express 4, tRPC 11, WebSocket (ws), esbuild |
| Database | PostgreSQL 17 (Drizzle ORM), Redis 7 (ioredis) |
| AI/LLM | 9 providers, 49 models, circuit breaker, semantic cache |
| MCP | Model Context Protocol host + server |
| Security | Helmet, CORS, JWT auth, virtual keys, guardrails |
| Process | systemd (reboot-proof), healthcheck cron |

## Quick Start

### Prerequisites

- Node.js 22+ 
- PostgreSQL 17 (running on port 5434)
- Redis 7 (running on port 6379)

### 1. Clone & Install

```bash
git clone https://github.com/Jahanzaib211/forge-studio.git
cd forge-studio
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

Key variables:
```
DATABASE_URL=postgresql://user:pass@localhost:5434/forge_studio
REDIS_URL=redis://localhost:6379/1
PORT=5051
JWT_SECRET=your-secret-key
```

### 3. Setup Database

```bash
npx drizzle-kit push      # Create/update all 21 tables
npx tsx server/seed.ts    # Seed admin user + 11 providers + team
```

### 4. Start Development Server

```bash
pnpm dev
```

Open **http://localhost:5051** — the dashboard loads immediately.

### Default Login

- **Email**: `admin@forge.local`
- **Role**: Admin (full access)

## Features (21 total)

| # | Feature | Description |
|---|---------|-------------|
| 1 | AI Lab Hub | Unified model catalog across all providers |
| 2 | LLM Proxy | OpenAI-compatible /v1/chat/completions with circuit breaker |
| 3 | Custom Providers | Paste-Any-API — connect any OpenAI-compatible endpoint |
| 4 | Inference Lab | Chat UI with real-time GPU stats |
| 5 | Model Manager | Add/remove/test models across providers |
| 6 | Provider Monitor | Health tracking, latency, cost per provider |
| 7 | System Monitor | CPU, GPU, RAM, disk via WebSocket |
| 8 | Process Manager | PM2-style process control |
| 9 | Virtual Keys | Budget/rate limits per API key |
| 10 | Budget Tracking | Per-team monthly spend limits |
| 11 | Guardrails | PII detection, injection prevention, toxicity filtering |
| 12 | MCP Integration | Model Context Protocol host + server |
| 13 | Skills Hub | Filesystem-based skill management |
| 14 | Prompt Library | Version-controlled prompt templates |
| 15 | HuggingFace Hub | Browse and pull GGUF models |
| 16 | LLM Discoverer | Auto-detect Ollama, llama.cpp, GGUF models |
| 17 | Forge Builder | Visual workflow designer |
| 18 | Analytics | Request history, cost tracking, usage graphs |
| 19 | Audit Logs | Immutable action audit trail |
| 20 | Access Control | Teams, organizations, roles |
| 21 | Browser Extension | Chrome/Edge extension for quick access |

## Providers & Models

| Provider | Models | Type |
|----------|--------|------|
| Groq | Llama 3.3 70B, Llama 3.1 8B, Llama 4 Scout, Qwen3-32B | Cloud (free) |
| Google Gemini | Gemini 2.5 Flash, Gemini 2.5 Flash Lite | Cloud (free) |
| Mistral | Mistral Large, Open Mistral Nemo, Codestral | Cloud |
| Cerebras | GPT-OSS-120B, ZAI GLM-4.7 | Cloud (free) |
| SambaNova | Meta-Llama-3.3-70B-Instruct | Cloud (free) |
| Cohere | Command A, Command R7B, Aya Expanse 32B | Cloud |
| OpenRouter | Nemotron, DeepSeek V4 Flash, GPT-OSS-120B | Cloud (free) |
| Cloudflare | Llama 3.1 8B, Llama 3.3 70B | Cloud (free) |
| Local (Ollama/llama.cpp) | Qwopus, Hermes, Gemma 4, DeepSeek Coder | Local (free) |

**Total: 49 models** across 9 providers.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (PostgreSQL, Redis status) |
| `POST /v1/chat/completions` | OpenAI-compatible chat completions |
| `GET /v1/models` | List all available models |
| `/api/trpc/*` | tRPC API (typed RPC for dashboard) |
| `/api/stream/chat` | SSE streaming chat |
| `/mcp/sse` | MCP protocol endpoint |
| `WS /ws` | WebSocket (system monitor + terminal) |
| `/api-docs` | Interactive API documentation |

## Database

21 PostgreSQL tables managed by Drizzle ORM:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles (admin/user) |
| `teams` | Team organizations with budgets |
| `apiKeys` | API key management with hashing |
| `providers` | LLM provider configurations |
| `requestHistory` | Request audit trail with token counts |
| `budgetLimits` | Monthly spend limits per team |
| `auditLogs` | Immutable action audit trail |
| `virtualKeys` | Budget/rate-limited API keys |
| `organizations` | Multi-tenant organization hierarchy |
| `accessGroups` | Role-based access control groups |
| `mcpServers` | MCP server registrations |
| `skills` | Filesystem-based skill registry |
| `guardrails` | Content safety rule configurations |
| `policies` | Guardrail-to-team binding policies |
| `agents` | AI agent definitions with tools |
| `usageLogs` | Per-request usage telemetry |
| `systemEvents` | System event logging |
| `customProviders` | User-added API endpoints |
| `promptLibrary` | Version-controlled prompt templates |
| `webhooks` | Outgoing webhook configurations |
| `cacheEntries` | Semantic response cache |

## Project Structure

```
forge-studio/
├── client/src/              # Vite + React SPA (42 pages)
│   ├── pages/               # Route pages (Dashboard, InferenceLab, etc.)
│   ├── components/          # Reusable components (53 UI + 5 hub)
│   └── lib/                 # tRPC client, utilities
├── server/                  # Express + tRPC backend
│   ├── _core/               # Server entry, auth, tRPC setup
│   ├── routers/             # 19 tRPC routers
│   ├── services/            # 27 service modules
│   ├── db.ts                # Drizzle ORM data access
│   ├── routers.ts           # Master tRPC router
│   └── seed.ts              # Database seeder
├── shared/                  # Shared types & constants
├── drizzle/                 # Database schema & migrations
├── extension/               # Chrome/Edge browser extension
├── scripts/                 # Deployment & utility scripts
├── nginx/                   # Reverse proxy configs
├── docker-compose.yml       # Container orchestration
├── Dockerfile               # Multi-stage production build
├── ecosystem.config.cjs     # PM2 process manager
├── vite.config.ts           # Vite build configuration
└── drizzle.config.ts        # Drizzle Kit configuration
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes | — | Redis connection string |
| `PORT` | No | `5051` | Server listen port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `JWT_SECRET` | Yes | — | Secret for session tokens |
| `ALLOWED_ORIGINS` | No | `localhost:5051` | CORS whitelist |
| `LITELLM_URL` | No | — | Optional LiteLLM proxy URL |
| `LITELLM_API_KEY` | No | — | LiteLLM API key |
| `CLOUDFLARE_TUNNEL_TOKEN` | No | — | Remote access tunnel |

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full production deployment guide.

### Quick Production Deploy

```bash
# Build
pnpm build

# Start with systemd (reboot-proof)
sudo bash scripts/install-systemd.sh
sudo systemctl start forge-postgres forge-redis forge-studio
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture, data flow, port map
- [CONTRIBUTING.md](CONTRIBUTING.md) — Development setup, code style, PR process
- [DEPLOYMENT.md](DEPLOYMENT.md) — Production deployment, systemd, nginx, SSL
- [CHANGELOG.md](CHANGELOG.md) — Version history from v1.0 to v3.0

## License

MIT

## Author

[Jahanzaib Ali](https://alilabsx.com)
