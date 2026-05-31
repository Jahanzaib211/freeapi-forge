# Architecture — Forge Studio v3.0

## Overview

Forge Studio is a self-hosted AI lab control center that acts as a unified proxy layer between applications and LLM providers. It handles routing, fallbacks, budget tracking, monitoring, and provides a rich web dashboard.

## System Layers

```
Layer 9: Clients          Web Dashboard · API Consumers · Browser Extension
Layer 8: Proxy            Express :5051 · tRPC · WebSocket · OpenAI API · MCP SSE
Layer 7: Pipeline         Auth → Rate Limit → Budget → Guardrails → Route
Layer 6: Services         27 Service Modules (analytics, cache, monitoring, etc.)
Layer 5: Routing          LLM Router · Circuit Breaker · Fallback Chain
Layer 4: Data             PostgreSQL 17 (Drizzle ORM) · Redis 7 (ioredis)
Layer 3: Providers        9 Cloud Providers · Local Models (Ollama/llama.cpp)
Layer 2: MCP Fabric       MCP Host · MCP Server · /mcp/sse
Layer 1: Infrastructure   Docker · systemd · nginx · Caddy
```

## Port Map

| Service | Internal Port | External Port | Protocol |
|---------|--------------|---------------|----------|
| Forge Studio | 5051 | 5051 | HTTP |
| PostgreSQL | 5432 | 5434 | TCP |
| Redis | 6379 | 6379 | TCP |
| LiteLLM (optional) | 5050 | 5050 | HTTP |
| Ollama (optional) | 11434 | 11434 | HTTP |

## Data Flow — Request Lifecycle

```
1. Client → POST /v1/chat/completions
2. Express parses request body
3. Auth middleware validates API key or session
4. Rate limiter checks TPM/RPM limits
5. Budget checker verifies team spend < monthly limit
6. Guardrails scan prompt (PII, injection, toxicity)
7. LLM Router selects provider:
   a. Check custom providers first (exact model match)
   b. Fall back to LiteLLM routing
   c. Circuit breaker skips failed providers
   d. Fallback chain tries next provider
8. Request forwarded to provider
9. Response streamed back to client
10. Usage logged to requestHistory + usageLogs tables
11. Budget updated (costUsd micro-cents)
12. Audit log entry created
```

## WebSocket Channels

| Channel | Purpose |
|---------|---------|
| `/ws` | Real-time system stats (CPU, GPU, RAM, disk) |
| `/ws` | Virtual terminal (xterm.js, Docker exec) |

## MCP Endpoints

| Endpoint | Protocol | Description |
|----------|----------|-------------|
| `/mcp/sse` | SSE | MCP server for external tool integration |

## tRPC API

19 routers providing typed RPC for the dashboard:

| Router | Purpose |
|--------|---------|
| `system` | System info, health, stats |
| `auth` | Login, session, logout |
| `chat.complete` | Chat completions with budget checks |
| `providers` | Provider CRUD and management |
| `budget` | Budget limit management |
| `requests` | Request history queries |
| `admin` | Provider management, circuit breaker |
| `health` | Service health checks |
| `models` | Model catalog management |
| `analytics` | Usage analytics and graphs |
| `systemMonitor` | Real-time system monitoring |
| `virtualKeys` | API key management |
| `mcp` | MCP server management |
| `skills` | Skill registry and execution |
| `guardrails` | Guardrail rule management |
| `organizations` | Multi-tenant org hierarchy |
| `agents` | AI agent configuration |
| `settings` | Application settings |
| `usage` | Usage telemetry queries |
| `customProviders` | Custom API endpoint management |
| `huggingface` | HuggingFace model browsing |
| `prompts` | Prompt library management |
| `benchmark` | Model benchmarking |
| `providerHealth` | Provider health monitoring |
| `webhooks` | Webhook management |
| `catalog` | Resource catalog |
| `audit` | Audit log queries |
| `sandbox` | Sandbox/terminal management |
| `localModels` | Local model discovery |

## Service Modules (27)

| Service | Purpose |
|---------|---------|
| `analytics_service` | Usage analytics aggregation |
| `cost_forecaster` | Projected cost calculations |
| `custom_provider` | Custom API endpoint routing |
| `direct_proxy` | Direct passthrough to providers |
| `error_logger` | Error capture and logging |
| `guardrail_service` | Content safety enforcement |
| `huggingface_service` | HuggingFace API integration |
| `llm_detector` | Auto-detect available LLMs |
| `llm_router` | Intelligent model routing |
| `local_model_manager` | Local model lifecycle |
| `mcp_host` | MCP protocol host |
| `mcp_server` | MCP protocol server |
| `model_manager` | Model catalog management |
| `process_monitor` | System process tracking |
| `provider_health` | Provider health monitoring |
| `provider_service` | Provider CRUD operations |
| `rate_limiter` | TPM/RPM rate limiting |
| `request_pipeline` | Request processing pipeline |
| `resource_catalog` | Resource discovery and catalog |
| `sandbox_manager` | Docker sandbox management |
| `semantic_cache` | Response caching by similarity |
| `skill_manager` | Skill execution engine |
| `stream_handler` | SSE stream management |
| `system_monitor` | CPU/GPU/RAM monitoring |
| `token_estimator` | Token count estimation |
| `virtual_key_service` | Virtual key lifecycle |
| `webhook_service` | Outgoing webhook dispatch |

## Database Schema (21 tables)

See [README.md](README.md#database) for the complete table list.

## Client Pages (42)

Dashboard, InferenceLab, ModelExplorer, ModelManager, ProviderMonitor, ProviderHealth, RequestHistory, Usage, Logs, ErrorLogs, SystemHealth, SystemMonitor, ProcessManager, AdminPanel, VirtualKeys, Teams, InternalUsers, Organizations, AccessGroups, Budgets, MCPServers, SkillsHub, Guardrails, GuardrailsMonitor, ToolsHub, ForgeBuilder, CustomProviders, HuggingFace, AILabHub, AIHub, PromptLibrary, Benchmark, LLMDiscoverer, LocalModelManager, Agentic, APIReference, Webhooks, AuditLogs, Settings, Home, ComponentShowcase, NotFound

## UI Components (53)

Full shadcn/ui component library (New York style, Tailwind CSS 4):
accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, button-group, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, empty, field, form, hover-card, input, input-group, input-otp, item, kbd, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, tabs, table, textarea, toggle, toggle-group, tooltip
