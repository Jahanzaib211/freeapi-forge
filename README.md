# Forge Studio

**by Jahanzaib Ali** | [github.com/Jahanzaib211](https://github.com/Jahanzaib211) | [alilabsx.com](https://alilabsx.com)

---

## What is Forge Studio?

Forge Studio is a self-hosted AI lab control center. It acts as a proxy layer that sits between your applications and LLM providers (OpenAI, Groq, Gemini, Mistral, Ollama, llama.cpp, and others). You configure your API keys once, and Forge Studio handles routing, fallbacks, budget tracking, and monitoring.

The key idea: you paste any OpenAI-compatible API URL and key into Forge Studio, and it works. No vendor lock-in. No complex configuration. If it speaks the OpenAI API format, Forge Studio can proxy it.

![Forge Studio Dashboard](docs/screenshot-dashboard.png)

---

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/Jahanzaib211/forge-studio/main/install.sh | bash
```

Open http://localhost:5051/ — done.

---

## What It Actually Does

### 0. AI Lab Hub — Unified Model Catalog

The central command center for all AI models. One page replaces five: Model Manager, Model Explorer, Custom Providers, LLM Discoverer, and Inference Lab. Features:

- **Unified model catalog** — all models from all sources in one searchable grid (cloud APIs, custom providers, local Ollama/llama.cpp/GGUF)
- **Pool system** — Paid, Free, and Local pools with one-click filters
- **Quick Add API Key** — paste any API key (DeepSeek, OpenAI, Groq, etc.), auto-detects provider and discovers models
- **Local LLM scanner** — auto-detects Ollama models, llama.cpp processes, GGUF files, and HuggingFace cache
- **Provider sidebar** — see all providers with status dots, model counts, and enable/disable
- **Live model status** — online/offline/running indicators per model
- **Built-in provider registry** — DeepSeek, OpenAI, Groq, Together, OpenRouter, Mistral, Gemini pre-configured

Navigate to `/lab` or click "AI Lab Hub" in the sidebar.

### 1. LLM Proxy

Forge Studio receives chat completion requests and routes them to whichever provider has the model you asked for. It supports:

- **Cloud providers**: Groq, Google Gemini, Mistral, Cerebras, SambaNova, Cohere, OpenRouter, NVIDIA NIM, Cloudflare Workers AI, Together, DeepInfra, Anyscale, Fireworks, Perplexity
- **Local models**: Ollama, llama.cpp (any GGUF model)
- **Custom providers**: Any OpenAI-compatible endpoint you paste in

If a provider goes down, Forge Studio automatically falls back to another provider for the same model. This is handled by a circuit breaker system backed by Redis.

### 2. Local Model Load Balancer

GPU-aware model switching with one model active at a time:

- **User-selectable** — choose which model to activate from the UI
- **VRAM-aware** — checks available GPU memory before switching
- **Zero-downtime** — stops current model, starts new one, health-checks before going live
- **Real-time GPU stats** — VRAM usage, temperature, utilization

Navigate to `/local-models` in the sidebar.

### 3. Custom Providers (Paste-Any-API)

Go to the Custom Providers page, paste an API URL and key, and Forge Studio auto-discovers what models are available. This means you can add:

- A self-hosted vLLM instance
- An Azure OpenAI endpoint
- A HuggingFace Inference API
- Any other OpenAI-compatible service

Once added, models from that provider appear in your model list and can be used through the standard `/v1/chat/completions` endpoint.

### 4. Standalone Mode

Forge Studio can run without LiteLLM. The direct proxy service routes requests straight to providers. LiteLLM is optional - it adds more sophisticated routing and load balancing, but Forge Studio works on its own.

### 5. HuggingFace Hub

Search for models on HuggingFace directly from Forge Studio. The system:

- Searches the HuggingFace API
- Shows model details (size, quantization, downloads)
- Checks your hardware (GPU VRAM, RAM, disk) against model requirements
- Estimates whether the model will run on your machine
- Downloads GGUF files directly to your models directory

### 6. Inference Lab

A chat interface that connects directly to your local backends. You can configure:

- GPU layers (ngl) for llama.cpp offloading
- Context size, batch size, threads
- Flash attention, KV cache quantization
- Temperature, max tokens, top-p

Real-time GPU stats (VRAM usage, temperature, tok/s) display during inference.

### 7. Model Manager

Add, remove, and test models in your LiteLLM configuration. Includes:

- Quick-add buttons for common free providers
- One-click test for each model
- Full LiteLLM config viewer
- Standalone mode indicator

### 8. System Monitor

Real-time system monitoring via WebSocket (updates every 2 seconds):

- Per-core CPU usage
- RAM and swap usage
- GPU utilization, VRAM, temperature, power draw (via nvidia-smi)
- Per-process GPU memory attribution
- AI process detection (identifies Ollama, llama-server, Python inference processes)
- Top processes with kill capability

### 9. Process Manager

View and control PM2 processes from the GUI:

- Start, stop, restart, delete processes
- View stdout/stderr logs
- See CPU, memory, uptime, restart count

### 10. LLM Discoverer

Automatically detects locally available models:

- Ollama models (via `ollama list` and `ollama ps`)
- llama.cpp servers (from running processes)
- GGUF files on disk
- HuggingFace cache

### 11. Forge Builder

A workflow builder for creating AI products. You can:

- Add workflow blocks (system prompt, model selection, tool config, code blocks)
- Connect to MCP servers for external tools
- Test the workflow with streaming output
- Deploy as an agent
- Save/load projects from localStorage

### 12. MCP Integration

**As MCP Host**: Connect to external MCP servers to use their tools in your workflows.

**As MCP Server**: Forge Studio exposes its own capabilities (chat completion, model listing, system stats) as MCP tools at `/mcp/sse`.

### 13. Skills

A filesystem-based skill system. Skills are directories with `SKILL.md` files containing instructions and scripts. Built-in skills:

- Web search
- Code executor
- System monitor

### 14. Virtual Keys

Create API keys with:

- Budget limits (monthly spend cap)
- Rate limits (tokens per minute, requests per minute)
- Model restrictions (which models the key can access)
- Expiration dates
- Key rotation

### 15. Guardrails

Content filtering that runs before, during, or after LLM calls:

- PII detection (email, phone, SSN, credit card)
- Prompt injection blocking
- Toxicity keyword filtering

### 16. Budget Tracking

Per-team monthly budget limits with real-time spend tracking. The budget page shows:

- Total budget across all teams
- Current spend
- Remaining budget
- Per-team utilization with inline editing

### 17. Analytics

Usage analytics from LiteLLM SpendLogs:

- Request volume over time
- Top models by usage
- Provider performance (success rate)
- Per-model stats (latency, tokens, cost)

### 18. Error Logging

All errors are captured and displayed in the Error Logs page:

- Filter by level (error, warn, info, debug)
- Filter by source
- Expandable stack traces
- CSV export

### 19. Access Control

- Teams with budget limits
- Internal users with roles (admin, user)
- Organizations for multi-tenant isolation
- Access Groups for reusable resource sets

### 20. Settings

Configure the application:

- App name, branding
- Theme (light/dark mode)
- Page visibility per role

### 21. Browser Extension

A Chrome/Edge extension that sends chat completions directly from your browser toolbar. Configure your API key and endpoint, then use `Ctrl+Enter` to send messages from any page. Supports all task types (chat, coding, vision, fast, long context).

See the [extension README](extension/README.md) for installation and usage.

---

## Tech Stack

| Layer | What | Why |
|-------|------|-----|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, Recharts, wouter | Fast, type-safe, good component library |
| Backend | Express 4, tRPC 11, WebSocket (ws) | Type-safe API, real-time updates |
| Database | PostgreSQL (Drizzle ORM) | Reliable, good for structured data |
| Cache | Redis (ioredis) | Circuit breaker state, session cache |
| LLM Proxy | LiteLLM (optional) | Multi-provider routing, fallbacks |
| Process Manager | PM2 | Production process management |

---

## Running It

**Default login**: The seed script creates an admin user at `admin@forge.local`. The app uses a mock session — once you visit the page, you're in. Change this before exposing to others.

### Option A: One-Click Install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/Jahanzaib211/forge-studio/main/install.sh | bash
```

The installer:
- Detects your OS and installs missing dependencies
- Clones the repo, installs and builds
- Sets up PostgreSQL, Redis, Qdrant
- Configures PM2 (reboot-proof)
- Sets up nginx reverse proxy
- Opens the browser

### Option B: Docker

```bash
git clone https://github.com/Jahanzaib211/forge-studio.git
cd forge-studio
docker compose up -d
```

### Option C: Manual

```bash
git clone https://github.com/Jahanzaib211/forge-studio.git
cd forge-studio
pnpm install
pnpm tsx server/seed.ts
pnpm dev
```

Open http://localhost:5051/

---

## Production Deployment

### Reboot-Proof Setup

Forge Studio uses PM2 for process management with systemd integration:

```bash
# Install PM2 globally
npm install -g pm2

# Start forge-studio in production mode
cd forge-studio
pm2 start ecosystem.production.cjs

# Save process list (survives reboots)
pm2 save

# Set up systemd auto-start (needs sudo once)
sudo env PATH=$PATH pm2 startup systemd -u $USER --hp $HOME
```

### Cloudflare Tunnel (Remote Access)

Expose your local Forge Studio to the internet via Cloudflare Tunnel:

```bash
# Install cloudflared
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Authenticate (opens browser)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create forge-studio

# Configure
bash scripts/setup-cloudflare-tunnel.sh

# Start via PM2
pm2 start cloudflared --name cloudflared -- tunnel run forge-studio
```

Then in Cloudflare Dashboard:
- SSL/TLS → Overview → **Full (Strict)**
- SSL/TLS → Edge Certificates → **Always Use HTTPS** → ON
- SSL/TLS → Edge Certificates → **HSTS** → ON
- Security → Bots → **Bot Fight Mode** → ON
- Security → WAF → Enable managed rules
- Security → Settings → Security Level → **High**

### Nginx Reverse Proxy

The included nginx config (`nginx/forge-studio.conf`) handles:

- Rate limiting (100 req/min API, 30 req/min streaming)
- WebSocket upgrade for `/ws`
- SSE proxy for `/api/stream` and `/mcp/sse`
- Security headers (X-Frame-Options, HSTS, CSP)
- Gzip compression

```bash
sudo cp nginx/forge-studio.conf /etc/nginx/sites-available/forge-studio
sudo ln -sf /etc/nginx/sites-available/forge-studio /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## MCP Integration

Forge Studio works as both an MCP client and server.

### As MCP Server

Forge Studio exposes its capabilities as MCP tools. Any MCP-compatible client (Claude Desktop, Cursor, etc.) can connect:

**Endpoint**: `http://localhost:5051/mcp/sse`

**Available tools**:
- `chat_completion` - Send a chat message
- `list_models` - List available models
- `get_system_stats` - Get CPU/GPU/RAM stats

**Connect from Claude Desktop** (claude_desktop_config.json):
```json
{
  "mcpServers": {
    "forge-studio": {
      "url": "http://localhost:5051/mcp/sse"
    }
  }
}
```

### As MCP Host

Connect external MCP servers to Forge Studio:
1. Go to MCP Servers page
2. Add server URL and transport type
3. Forge Studio discovers and lists available tools
4. Use tools in the Forge Builder workflow

---

## Environment Variables

```
DATABASE_URL=postgresql://litellm_user:litellm_password_123@localhost:5434/forge_studio
REDIS_URL=redis://localhost:6379/1
LITELLM_URL=http://localhost:5050        # optional - Forge works without it
LITELLM_API_KEY=sk-ai-lab-master-key     # optional
PORT=5051
JWT_SECRET=your-secure-random-string
NODE_ENV=production
ALLOWED_ORIGINS=https://alilabsx.com,http://localhost:5051
```

---

## How the Proxy Works

```
Your App
  │
  ▼
Forge Studio (:5051)
  │
  ├─ AI Lab Hub (/lab) — unified model catalog
  │   └─ All models from: custom providers + LiteLLM + local scanners
  │
  ├─ /v1/chat/completions (OpenAI-compatible)
  ├─ /api/stream/chat (SSE streaming)
  ├─ /api/trpc/* (tRPC for the UI)
  │
  ├─ Check custom providers first
  │   └─ If model matches a custom provider → route directly
  │
  └─ Fall back to LiteLLM (if configured)
      └─ LiteLLM routes to Groq/Gemini/Mistral/etc.
```

You can use Forge Studio as:
1. **A proxy in front of LiteLLM** - adds UI, monitoring, budget tracking
2. **A standalone proxy** - route directly to providers without LiteLLM
3. **Both** - LiteLLM for complex routing, Forge Studio for the interface

---

## Database

21 tables covering:

- Users, teams, organizations
- API keys, virtual keys
- Providers, custom providers
- Unified resource catalog (model aggregation)
- Request history, usage logs
- Budget limits, audit logs
- MCP servers, skills, agents
- Guardrails, policies
- System events, webhooks, cache

---

## What Makes It Different

Most LLM tools do one thing: route requests. Forge Studio bundles the full lifecycle:

- **AI Lab Hub**: Unified model catalog — one view for all models across cloud APIs, custom providers, local Ollama/llama.cpp, and GGUF files. Quick-add API keys from DeepSeek, OpenAI, Groq, and more.
- **Local Model Switcher**: GPU-aware model switching with one model active at a time. No more running out of VRAM.
- **Discovery**: Find and pull models from HuggingFace. Auto-detect local LLMs (Ollama, llama.cpp, GGUF).
- **Configuration**: Add providers, set up routing. Paste any OpenAI-compatible API key and it works.
- **Proxying**: Route requests with automatic fallback and circuit breaker protection.
- **Monitoring**: See what's happening in real-time with GPU stats, token throughput, and system telemetry.
- **Budgeting**: Track and limit spending with per-team monthly budgets and virtual key rate limits.
- **Building**: Create AI products with the Forge Builder — visual workflow designer with MCP tools.
- **Securing**: Guardrails (PII detection, prompt injection blocking), access control, audit logs.
- **Reboot-proof**: PM2 + systemd ensures all services survive reboots. Zero manual intervention.

Everything runs on your hardware. No data leaves your machine unless you configure a cloud provider.

---

## Powering Forge Studio with Your Own API Key

Forge Studio is a proxy. It doesn't have its own AI models. Instead, it uses whatever API keys you configure to power its features:

**Chat and Inference** — Add an OpenAI, Anthropic, Groq, or any OpenAI-compatible API key in Custom Providers. Every chat completion, inference lab test, and Forge Builder workflow runs through your configured providers. Your data stays between you and your chosen provider.

**System Features (No External API Needed)** — These work entirely locally:
- System Monitor (CPU/GPU/RAM)
- Process Manager (PM2)
- Local Model Switcher (GPU load balancer)
- LLM Discoverer (Ollama, llama.cpp, GGUF detection)
- HuggingFace Hub (model search, hardware check, download)
- Budget tracking, audit logs, access control

**Guardrails** — PII detection, injection blocking, and toxicity filtering run client-side in the browser. No external API call needed.

**Forge Builder** — The workflow builder sends test queries through the same proxy. Use whichever provider you've configured.

The architecture: your API key goes into Forge Studio, Forge Studio routes requests, you see the response. Forge Studio never stores your prompts or responses beyond what's needed for the request log.

---

## License

MIT

---

## Author

Jahanzaib Ali - [alilabsx.com](https://alilabsx.com) - [github.com/Jahanzaib211](https://github.com/Jahanzaib211)
