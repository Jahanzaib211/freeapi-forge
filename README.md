# Forge Studio

**by Jahanzaib Ali** | [github.com/Jahanzaib211](https://github.com/Jahanzaib211) | [alilabsx.com](https://alilabsx.com)

---

## What is Forge Studio?

Forge Studio is a self-hosted AI lab control center. It acts as a proxy layer that sits between your applications and LLM providers (OpenAI, Groq, Gemini, Mistral, Ollama, llama.cpp, and others). You configure your API keys once, and Forge Studio handles routing, fallbacks, budget tracking, and monitoring.

The key idea: you paste any OpenAI-compatible API URL and key into Forge Studio, and it works. No vendor lock-in. No complex configuration. If it speaks the OpenAI API format, Forge Studio can proxy it.

---

## What It Actually Does

### 1. LLM Proxy

Forge Studio receives chat completion requests and routes them to whichever provider has the model you asked for. It supports:

- **Cloud providers**: Groq, Google Gemini, Mistral, Cerebras, SambaNova, Cohere, OpenRouter, NVIDIA NIM, Cloudflare Workers AI, Together, DeepInfra, Anyscale, Fireworks, Perplexity
- **Local models**: Ollama, llama.cpp (any GGUF model)
- **Custom providers**: Any OpenAI-compatible endpoint you paste in

If a provider goes down, Forge Studio automatically falls back to another provider for the same model. This is handled by a circuit breaker system backed by Redis.

### 2. Custom Providers (Paste-Any-API)

Go to the Custom Providers page, paste an API URL and key, and Forge Studio auto-discovers what models are available. This means you can add:

- A self-hosted vLLM instance
- An Azure OpenAI endpoint
- A HuggingFace Inference API
- Any other OpenAI-compatible service

Once added, models from that provider appear in your model list and can be used through the standard `/v1/chat/completions` endpoint.

### 3. Standalone Mode

Forge Studio can run without LiteLLM. The direct proxy service routes requests straight to providers. LiteLLM is optional - it adds more sophisticated routing and load balancing, but Forge Studio works on its own.

### 4. HuggingFace Hub

Search for models on HuggingFace directly from Forge Studio. The system:

- Searches the HuggingFace API
- Shows model details (size, quantization, downloads)
- Checks your hardware (GPU VRAM, RAM, disk) against model requirements
- Estimates whether the model will run on your machine
- Downloads GGUF files directly to your models directory

### 5. Inference Lab

A chat interface that connects directly to your local backends. You can configure:

- GPU layers (ngl) for llama.cpp offloading
- Context size, batch size, threads
- Flash attention, KV cache quantization
- Temperature, max tokens, top-p

Real-time GPU stats (VRAM usage, temperature, tok/s) display during inference.

### 6. Model Manager

Add, remove, and test models in your LiteLLM configuration. Includes:

- Quick-add buttons for common free providers
- One-click test for each model
- Full LiteLLM config viewer
- Standalone mode indicator

### 7. System Monitor

Real-time system monitoring via WebSocket (updates every 2 seconds):

- Per-core CPU usage
- RAM and swap usage
- GPU utilization, VRAM, temperature, power draw (via nvidia-smi)
- Per-process GPU memory attribution
- AI process detection (identifies Ollama, llama-server, Python inference processes)
- Top processes with kill capability

### 8. Process Manager

View and control PM2 processes from the GUI:

- Start, stop, restart, delete processes
- View stdout/stderr logs
- See CPU, memory, uptime, restart count

### 9. LLM Discoverer

Automatically detects locally available models:

- Ollama models (via `ollama list` and `ollama ps`)
- llama.cpp servers (from running processes)
- GGUF files on disk
- HuggingFace cache

### 10. Forge Builder

A workflow builder for creating AI products. You can:

- Add workflow blocks (system prompt, model selection, tool config, code blocks)
- Connect to MCP servers for external tools
- Test the workflow with streaming output
- Deploy as an agent
- Save/load projects from localStorage

### 11. MCP Integration

**As MCP Host**: Connect to external MCP servers to use their tools in your workflows.

**As MCP Server**: Forge Studio exposes its own capabilities (chat completion, model listing, system stats) as MCP tools at `/mcp/sse`.

### 12. Skills

A filesystem-based skill system. Skills are directories with `SKILL.md` files containing instructions and scripts. Built-in skills:

- Web search
- Code executor
- System monitor

### 13. Virtual Keys

Create API keys with:

- Budget limits (monthly spend cap)
- Rate limits (tokens per minute, requests per minute)
- Model restrictions (which models the key can access)
- Expiration dates
- Key rotation

### 14. Guardrails

Content filtering that runs before, during, or after LLM calls:

- PII detection (email, phone, SSN, credit card)
- Prompt injection blocking
- Toxicity keyword filtering

### 15. Budget Tracking

Per-team monthly budget limits with real-time spend tracking. The budget page shows:

- Total budget across all teams
- Current spend
- Remaining budget
- Per-team utilization with inline editing

### 16. Analytics

Usage analytics from LiteLLM SpendLogs:

- Request volume over time
- Top models by usage
- Provider performance (success rate)
- Per-model stats (latency, tokens, cost)

### 17. Error Logging

All errors are captured and displayed in the Error Logs page:

- Filter by level (error, warn, info, debug)
- Filter by source
- Expandable stack traces
- CSV export

### 18. Access Control

- Teams with budget limits
- Internal users with roles (admin, user)
- Organizations for multi-tenant isolation
- Access Groups for reusable resource sets

### 19. Settings

Configure the application:

- App name, branding
- Theme (light/dark mode)
- Page visibility per role

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

```bash
# Clone
git clone https://github.com/Jahanzaib211/freeapi-forge.git
cd freeapi-forge

# Install
pnpm install

# Database
# Make sure PostgreSQL is running on port 5434
pnpm tsx server/seed.ts

# Redis (needed for circuit breaker)
docker run -d --name redis -p 6379:6379 redis:alpine

# Start
pnpm dev
```

Open http://localhost:5051/

---

## Environment Variables

```
DATABASE_URL=postgresql://litellm_user:litellm_password_123@localhost:5434/freeapi_forge
REDIS_URL=redis://localhost:6379/1
LITELLM_URL=http://localhost:5050        # optional - Forge works without it
LITELLM_API_KEY=sk-ai-lab-master-key     # optional
PORT=5051
```

---

## How the Proxy Works

```
Your App
  │
  ▼
Forge Studio (:5051)
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

19 tables covering:

- Users, teams, organizations
- API keys, virtual keys
- Providers, custom providers
- Request history, usage logs
- Budget limits, audit logs
- MCP servers, skills, agents
- Guardrails, policies
- System events (errors)

---

## What Makes It Different

Most LLM tools do one thing: route requests. Forge Studio bundles the full lifecycle:

- **Discovery**: Find and pull models from HuggingFace
- **Configuration**: Add providers, set up routing
- **Proxying**: Route requests with automatic fallback
- **Monitoring**: See what's happening in real-time
- **Budgeting**: Track and limit spending
- **Building**: Create AI products with the Forge Builder
- **Securing**: Guardrails, access control, audit logs

Everything runs on your hardware. No data leaves your machine unless you configure a cloud provider.

---

## License

MIT

---

## Author

Jahanzaib Ali - [alilabsx.com](https://alilabsx.com) - [github.com/Jahanzaib211](https://github.com/Jahanzaib211)
