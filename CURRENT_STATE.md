# Forge Studio — Current State (Single Source of Truth)

> Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
> Git commit: $(git rev-parse --short HEAD)
> Branch: main
> Machine: $(hostname)

---

## Architecture Overview

Forge Studio is a self-hosted AI Lab Control Center — a unified proxy layer between applications and LLM providers with routing, fallbacks, budget tracking, monitoring, and a rich web dashboard.

```
CLIENTS (Browser, API Consumers, Browser Extension)
    │
    ▼
FORGE STUDIO (:5051)
    Express + tRPC + WebSocket + MCP SSE + OpenAI Compat API
    │
    ├── PostgreSQL :5434 (56 tables, Drizzle ORM)
    ├── Redis :6379 (caching, pub/sub, event bus)
    └── Providers (Groq, Gemini, Mistral, Cerebras, OpenRouter, Ollama, etc.)
```

---

## Build & Runtime

| Metric | Value |
|--------|-------|
| **Build size** | 18MB (dist/) |
| **Server bundle** | 486.5KB |
| **TypeScript** | Zero errors (@tsc --noEmit) |
| **Version** | 3.11.0 (from forge.config.ts) |
| **Environment** | development (NODE_ENV) |
| **Node.js** | v23.5.0 |
| **Package manager** | pnpm |
| **Runtime** | tsx (TypeScript execution) |

---

## Infrastructure (Reboot Survival)

### Systemd Services (all enabled, active, restart=always)

| Service | Port | Purpose |
|---------|------|---------|
| `forge-postgres` | 5434 | PostgreSQL 17 database |
| `forge-redis` | 6379 | Redis 7 cache + pub/sub |
| `forge-studio` | 5051 | Express + tRPC + Vite dev server |

```
# Restart any service:
systemctl restart forge-studio

# Check status:
systemctl status forge-studio

# View logs:
journalctl -u forge-studio -f
```

### PM2 Process Manager

| Process | Mode | Status | Purpose |
|---------|------|--------|---------|
| `cloudflared` | fork | online | Cloudflare tunnel for remote access |
| `forge-studio` | fork | online | tRPC server (tsx execution) |
| `litellm-proxy` | fork | online | LiteLLM proxy (port 5050) |

```
# PM2 reboot survival:
sudo env PATH=$PATH:/home/jahanzaib/.nvm/versions/node/v23.5.0/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u jahanzaib --hp /home/jahanzaib
pm2 save
```

---

## Database — 56 PostgreSQL Tables

| Table | Purpose |
|-------|---------|
| `accessGroups` | RBAC access control groups |
| `agentMemories` | Agent persistent memory entries |
| `agentRuns` | Agent execution run records |
| `agentTasks` | Task queue for agent/workflow execution |
| `agents` | AI agent definitions (type, model, tools, triggers) |
| `apiKeys` | API key management with hashing |
| `auditLogs` | Immutable action audit trail |
| `budgetLimits` | Monthly spend limits per team |
| `cacheEntries` | Semantic response cache |
| `conversations` | Chat conversation threads |
| `customProviders` | User-added OpenAI-compatible endpoints |
| `deploymentAlerts` | GitHub Actions deployment failure alerts |
| `discordConfigs` | Discord bridge configurations |
| `documentChunks` | RAG document vector chunks |
| `documents` | RAG uploaded documents |
| `githubActionsRuns` | GitHub Actions workflow run history |
| `githubTokens` | GitHub PAT storage for API access |
| `guardrails` | Content safety rule configurations |
| `mcpRegistry` | MCP server marketplace registry |
| `mcpReviews` | MCP server user reviews |
| `mcpServers` | Installed MCP server registrations |
| `mcpUsageLog` | MCP tool call telemetry |
| `memoryEvents` | Forge Brain audit log (created/updated/archived/linked) |
| `memoryNodes` | Forge Brain knowledge graph nodes (MD content) |
| `messages` | Chat message history |
| `modelBenchmarks` | Model comparison benchmark results |
| `onboardingProfiles` | User onboarding questionnaire answers |
| `organizations` | Multi-tenant organization hierarchy |
| `policies` | Guardrail-to-team binding policies |
| `promptLibrary` | Version-controlled prompt templates |
| `providerRegistry` | Global provider catalog (20+ seed entries) |
| `providers` | LLM provider configurations |
| `requestHistory` | Request audit trail with token counts |
| `sessions` | JWT refresh token session storage |
| `skills` | Filesystem-based skill registry |
| `subscriptionPlans` | MCP subscription tier plans |
| `suggestionDismissals` | Dismissed proactive suggestions |
| `systemEvents` | System event logging |
| `teams` | Team organizations with budgets |
| `tenantProviderConfigs` | Per-tenant provider connections (encrypted keys) |
| `tenantSettings` | User-configurable preferences (key-value) |
| `tenantSubscriptions` | Tenant MCP subscription status |
| `tenantUsers` | Tenant membership (user + role) |
| `tenants` | Multi-tenant core table |
| `toolApprovals` | Pending tool execution approvals |
| `trackedRepos` | GitHub repo tracking for explorer |
| `usageLogs` | Per-request usage telemetry |
| `userOverrides` | Per-user settings overrides |
| `users` | User accounts with roles |
| `virtualKeys` | Budget/rate-limited API keys |
| `webhooks` | Outgoing webhook configurations |
| `workflowNodeRuns` | Individual workflow node execution records |
| `workflowRuns` | Workflow execution run records |
| `workflowVersions` | Workflow version history |
| `workflowWebhooks` | Workflow webhook trigger endpoints |
| `workflows` | Agentic workflow definitions |

---

## Backend — 44 Services (9,624 total lines)

| Service | Lines | Purpose |
|---------|-------|---------|
| `agent-runtime.ts` | 294 | ReAct loop agent executor |
| `agent-scheduler.ts` | 132 | Cron + event-driven agent scheduling |
| `analytics_service.ts` | 152 | Usage analytics, top models, hourly volume |
| `auth-service.ts` | 272 | JWT auth, bcrypt, register/login/refresh/logout |
| `budget-service.ts` | 207 | Budget tracking, spend limits, alerts |
| `chat-service.ts` | 399 | Chat message routing, conversation management |
| `cli-tools-service.ts` | 70 | 30 curated CLI/TUI tools registry |
| `custom_provider.ts` | 172 | Paste-Any-API provider management |
| `direct_proxy.ts` | 90 | Direct proxy streaming chat |
| `discord-service.ts` | 208 | Discord bot bridge |
| `error_logger.ts` | 208 | Event-driven error logging + DB persistence |
| `event-bus.ts` | 152 | Redis pub/sub event bus with 25 ForgeEvents |
| `forge-brain-service.ts` | 289 | Obsidian-style memory layer (CRUD, graph, search, export) |
| `github-actions-service.ts` | 302 | GitHub Actions deployment monitor (fetch, sync, alerts) |
| `github-explorer-service.ts` | 60 | GitHub API trending/search/repo details |
| `guardrail_service.ts` | 373 | PII/injection/toxicity regex detection |
| `guard-service.ts` | 143 | System diagnostics (CPU, memory, DB pings) |
| `huggingface_service.ts` | 655 | HuggingFace Hub model browse, pull, hardware detection |
| `llm_detector.ts` | 277 | Provider/model auto-detection from endpoints |
| `llm_router.ts` | 206 | LLM routing with circuit breaker + fallback |
| `local_model_manager.ts` | 306 | Ollama/llama.cpp local model management |
| `mcp-discovery-agent.ts` | 128 | MCP registry seeder + GitHub discovery |
| `mcp-explorer-service.ts` | 166 | MCP marketplace (install, usage, reviews, plans) |
| `mcp_host.ts` | 289 | MCP protocol host implementation |
| `mcp_server.ts` | 275 | MCP server SSE transport |
| `mcp-skill-bridge.ts` | 127 | MCP tool → skill synchronization bridge |
| `model_manager.ts` | 127 | Model CRUD and configuration |
| `onboarding-service.ts` | 196 | 6-section questionnaire + auto-config matrix |
| `process_monitor.ts` | 171 | PM2 process control (list, start, stop, restart) |
| `provider_health.ts` | 66 | Provider health check execution |
| `provider-registry-service.ts` | 184 | Provider catalog, connect/discover/test with encryption |
| `provider_service.ts` | 130 | Provider CRUD and status |
| `rag-service.ts` | 187 | RAG pipeline (chunk, embed, query) |
| `resource_catalog.ts` | 230 | Unified model/resource catalog |
| `sandbox_manager.ts` | 256 | Sandbox environment management |
| `settings-service.ts` | 170 | User-configurable settings with defaults resolution |
| `skill_manager.ts` | 482 | Filesystem skill discovery + 6 built-in LLM skills |
| `stream_handler.ts` | 238 | SSE streaming chat with budget + guardrail checks |
| `suggestion-engine-service.ts` | 53 | Proactive AI usage suggestions |
| `system_monitor.ts` | 286 | CPU, memory, disk, GPU monitoring |
| `task-service.ts` | 80 | Task queue (create, start, progress, complete, cancel) |
| `tenant-service.ts` | 181 | Multi-tenant management |
| `virtual_key_service.ts` | 286 | Virtual API key management with bcrypt |
| `workflow-engine.ts` | 288 | Agentic workflow execution engine |

---

## Backend — 33 tRPC Routers

| Router | File | Purpose |
|--------|------|---------|
| `agentRouter` | `agent_router.ts` | Agent CRUD + execution |
| `agentBuilder` | `agents.ts` | Agent builder (create, list, update, trigger) |
| `aiLab` | `ai-lab.ts` | AI API Explorer (13 procedures) |
| `audit` | `audit_router.ts` | Audit log queries |
| `benchmark` | `benchmark_router.ts` | Model benchmarking |
| `budget` | `budget.ts` | Budget management |
| `catalog` | `catalog_router.ts` | Model catalog queries |
| `chat` | `chat.ts` | Chat completions + conversations |
| `customProviders` | `custom_provider_router.ts` | Custom provider CRUD |
| `discord` | `discord.ts` | Discord bridge |
| `forgeBrain` | `forge-brain.ts` | Memory layer (9 procedures) |
| `githubActions` | `github-actions.ts` | Deployment monitoring (12 procedures) |
| `githubExplorer` | `github-explorer.ts` | GitHub explorer (7 procedures) |
| `guard` | `guard.ts` | System diagnostics (4 procedures) |
| `guardrails` | `guardrail_router.ts` | Content safety management |
| `huggingface` | `huggingface_router.ts` | HuggingFace Hub (10 procedures) |
| `localModels` | `local_model_router.ts` | Local model management |
| `mcp` | `mcp_router.ts` | MCP server management |
| `mcpExplorer` | `mcp-explorer.ts` | MCP marketplace (15 procedures) |
| `organizations` | `organization_router.ts` | Organization management |
| `prompts` | `prompt_router.ts` | Prompt library |
| `providerHealth` | `provider_health_router.ts` | Provider health monitoring |
| `provisioning` | `provisioning.ts` | Tenant provisioning |
| `rag` | `rag.ts` | RAG pipeline |
| `sandbox` | `sandbox_router.ts` | Sandbox + terminal WebSocket |
| `settings` | `settings_router.ts` | System settings |
| `skills` | `skill_router.ts` | Skill execution |
| `system` | `system_router.ts` | System monitoring + PM2 |
| `usage` | `usage_router.ts` | Usage telemetry |
| `userSettings` | `user-settings.ts` | User-configurable settings (10 procedures) |
| `virtualKeys` | `virtual_key_router.ts` | Virtual key management |
| `webhooks` | `webhook_router.ts` | Webhook management |
| `workflowRouter` | `workflows.ts` | Workflow execution |

---

## Frontend — 55 Pages (17,524 total lines)

| Page | Lines | Route | Purpose |
|------|-------|-------|---------|
| `AccessGroups.tsx` | 350 | /access-groups | RBAC access control groups |
| `AdminPanel.tsx` | 268 | /admin | Admin panel |
| `AgentActivity.tsx` | 88 | /agent-activity | Agent run activity viewer |
| `Agentic.tsx` | 282 | /agentic | Legacy agent page |
| `AIHub.tsx` | 143 | /ai-hub | AI Hub dashboard |
| `AILab.tsx` | 456 | /ai-lab | AI API Explorer (4 tabs) |
| `AILabHub.tsx` | 431 | /lab | AI Lab Hub (catalog + testing + scanning) |
| `APIReference.tsx` | 274 | /api-reference | API documentation |
| `AuditLog.tsx` | 114 | /audit-logs | Audit log viewer |
| `Benchmark.tsx` | 178 | /benchmark | Model benchmarking |
| `BlockBuilder.tsx` | 944 | /builder | Visual block-based agent configurator |
| `Budgets.tsx` | 131 | /budgets | Budget tracking |
| `Chat.tsx` | 227 | /chat | Chat with AIChatBox |
| `CustomProviders.tsx` | 508 | /custom-providers | Custom provider management |
| `Dashboard.tsx` | 460 | /dashboard | Main dashboard with live analytics |
| `DeploymentMonitor.tsx` | 611 | /deployment-monitor | GitHub Actions deployment monitor (4 tabs) |
| `ErrorLogs.tsx` | 317 | /error-logs | Error log viewer |
| `ForgeBrain.tsx` | 441 | /forge-brain | Memory layer visualization (4 tabs) |
| `ForgeBuilder.tsx` | 553 | /forge-builder | Tabbed automation hub (3 tabs) |
| `GithubExplorer.tsx` | 394 | /github-explorer | GitHub Explorer (4 tabs) |
| `Guardrails.tsx` | 487 | /guardrails | Guardrail management |
| `GuardrailsMonitor.tsx` | 138 | /guardrails-monitor | Guardrail event monitoring |
| `Home.tsx` | 447 | / | Landing page |
| `HuggingFace.tsx` | 750 | /huggingface | HuggingFace Hub (gold standard) |
| `InferenceLab.tsx` | 1173 | /inference | Inference playground with GPU stats |
| `InternalUsers.tsx` | 232 | /internal-users | Internal user management |
| `LLMDiscoverer.tsx` | 208 | /llm-discoverer | Ollama/llama.cpp model discovery |
| `LocalModelManager.tsx` | 294 | /local-models | Local model management |
| `Login.tsx` | 93 | /login | Login page |
| `Logs.tsx` | 190 | /logs | Log viewer |
| `MCPServers.tsx` | 344 | /mcp-servers | MCP server management |
| `McpExplorer.tsx` | 186 | /mcp-explorer | MCP marketplace |
| `ModelExplorer.tsx` | 175 | /explorer | Model browser |
| `ModelManager.tsx` | 482 | /models | Model CRUD + quick-add |
| `MyMcps.tsx` | 123 | /my-mcps | My installed MCP servers |
| `NotFound.tsx` | 19 | /404 | 404 page |
| `Organizations.tsx` | 158 | /organizations | Organization management |
| `ProcessManager.tsx` | 281 | /process-manager | PM2 process control |
| `PromptLibrary.tsx` | 319 | /prompts | Prompt template library |
| `ProviderHealth.tsx` | 158 | /provider-health | Provider health checks |
| `ProviderMonitor.tsx` | 181 | /providers | Provider monitor (circuit breakers) |
| `Register.tsx` | 93 | /register | Registration page |
| `RequestHistory.tsx` | 154 | /requests | Request history |
| `Settings.tsx` | 414 | /settings | Settings (4 tabs — user-configurable) |
| `SkillsHub.tsx` | 315 | /skills | Skills management + execution |
| `SystemHealth.tsx` | 183 | /health | System health dashboard |
| `SystemMonitor.tsx` | 431 | /system-monitor | System monitoring |
| `Teams.tsx` | 276 | /teams | Team management |
| `TenantDashboard.tsx` | 49 | /tenant-dashboard | Tenant admin |
| `ToolsHub.tsx` | 313 | /tools-hub | Tools hub |
| `Usage.tsx` | 223 | /usage | Usage analytics |
| `VirtualKeys.tsx` | 408 | /virtual-keys | Virtual key management |
| `Webhooks.tsx` | 241 | /webhooks | Webhook management |
| `WorkflowEditor.tsx` | 238 | /workflows/:id | ReactFlow workflow editor |
| `WorkflowMonitor.tsx` | 86 | /workflow-monitor | Workflow monitor |

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check (PG, Redis, version, features, config) |
| GET | `/api/sse` | Server-Sent Events for real-time updates |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login (returns JWT) |
| POST | `/api/auth/refresh` | Token refresh |
| POST | `/api/auth/logout` | Session logout |
| GET | `/api/auth/me` | Current user |
| POST | `/v1/chat/completions` | OpenAI-compatible chat completions |
| GET | `/v1/models` | List available models |
| POST | `/api/stream/chat` | SSE streaming chat |
| `/api/trpc/*` | — | 33 tRPC routers (typed RPC) |
| WS | `/ws` | WebSocket (system monitor + terminal) |
| `/mcp/sse` | — | MCP protocol SSE endpoint |
| GET | `/api-docs` | Interactive API documentation |

---

## Key Features

| # | Feature | Status | Backend |
|---|---------|--------|---------|
| 1 | AI Lab Hub | ✅ Working | catalog_router + resource_catalog |
| 2 | AI API Explorer | ✅ Working (new) | ai-lab.ts router |
| 3 | LLM Proxy | ✅ Working | llm_router.ts |
| 4 | Custom Providers | ✅ Working | custom_provider.ts |
| 5 | Inference Lab | ✅ Working | stream_handler.ts |
| 6 | Model Manager | ✅ Working | model_manager.ts |
| 7 | Provider Monitor | ✅ Working | provider_service.ts |
| 8 | Provider Health | ✅ Working | provider_health.ts |
| 9 | System Monitor | ✅ Working | system_monitor.ts |
| 10 | Process Manager | ✅ Working | process_monitor.ts (PM2) |
| 11 | Virtual Keys | ✅ Working | virtual_key_service.ts |
| 12 | Budget Tracking | ✅ Working | budget-service.ts |
| 13 | Guardrails | ✅ Working | guardrail_service.ts |
| 14 | Guard Monitor | ✅ Working | guard-service.ts |
| 15 | MCP Integration | ✅ Working | mcp_host.ts + mcp_server.ts |
| 16 | MCP Explorer | ✅ Working | mcp-explorer-service.ts |
| 17 | Skills Hub | ✅ Working | skill_manager.ts |
| 18 | Prompt Library | ✅ Working | prompt_router.ts |
| 19 | HuggingFace Hub | ✅ Gold Standard | huggingface_service.ts |
| 20 | LLM Discoverer | ✅ Working | llm_detector.ts |
| 21 | Forge Builder | ✅ Working | agents.ts + workflow-engine.ts |
| 22 | Block Builder | ✅ Working | agents.ts |
| 23 | Forge Brain | ✅ Working | forge-brain-service.ts |
| 24 | Analytics | ✅ Working | analytics_service.ts |
| 25 | Audit Logs | ✅ Working | audit_router.ts |
| 26 | Access Control | ✅ Working | organization_router.ts |
| 27 | Deployment Monitor | ✅ Working | github-actions-service.ts |
| 28 | GitHub Explorer | ⚠️ Partial | github-explorer-service.ts |
| 29 | User Settings | ✅ Working (new) | settings-service.ts |
| 30 | Onboarding | ✅ Working | onboarding-service.ts |
| 31 | Suggestions | ✅ Working | suggestion-engine-service.ts |
| 32 | Task Queue | ✅ Working (new) | task-service.ts |
| 33 | SSE Real-time | ✅ Working (new) | sse.ts |
| 34 | Encryption | ✅ Working | encryption.ts (AES-256-CBC) |
| 35 | Soul Config | ✅ Working | forge.config.ts + forge-config-types.ts |
| 36 | Model Registry | ✅ Working | model-registry.ts |

---

## Forge Brain — Memory Layer

The **Forge Brain** (Phase 4P) is an Obsidian-style knowledge graph that auto-creates Markdown nodes for every Forge-native entity:

| Node Type | Auto-created When |
|-----------|-------------------|
| `provider` | Provider added/connected |
| `model` | Model discovered via provider |
| `agent` | Agent created in Forge Builder |
| `workflow` | Workflow designed |
| `pipeline` | Pipeline built |
| `mcp` | MCP server connected |
| `onboarding` | Questionnaire completed |
| `suggestion` | Suggestion dismissed |

- **Vault**: All nodes stored in `memoryNodes` table, exportable as .zip with .md files + `_graph.json`
- **Graph**: Interactive force-directed visualization at /forge-brain
- **Clean separation**: Only Forge-native types get nodes. GitHub/Discord/external → no memory nodes

---

## Event Bus

25 events defined in `server/_core/event-bus.ts`:

```
PROVIDER_ADDED, PROVIDER_REMOVED, MODELS_DISCOVERED, MODEL_TESTED
AGENT_CREATED, AGENT_UPDATED, AGENT_DELETED
AGENT_RUN_STARTED, AGENT_RUN_PROGRESS, AGENT_RUN_COMPLETED, AGENT_RUN_FAILED
MCP_CONNECTED, MCP_DISCONNECTED, TOOLS_DISCOVERED
WORKFLOW_CREATED, WORKFLOW_RUN_STARTED, WORKFLOW_RUN_COMPLETED
TASK_QUEUED, TASK_STARTED, TASK_PROGRESS, TASK_COMPLETED, TASK_FAILED, TASK_CANCELLED
DEPLOYMENT_STATUS
```

Redis pub/sub on `forge:events` channel. Falls back to local EventEmitter if Redis unavailable.

---

## Reboot Survival Checklist

- [x] `forge-postgres.service` — enabled, active, restart=always
- [x] `forge-redis.service` — enabled, active, restart=always
- [x] `forge-studio.service` — enabled, active, restart=always
- [x] PM2 process list saved (`pm2 save`)
- [ ] PM2 startup script installed (requires sudo — see command above)
- [x] All 3 systemd services survive reboot independently

```
# After any reboot, verify:
systemctl status forge-postgres forge-redis forge-studio
curl http://localhost:5051/health

# If PM2 processes needed:
pm2 resurrect
```

---

## Commands Reference

```bash
# Development
pnpm dev                          # Start dev server (tsx watch + Vite)
pnpm build                        # Production build
npx tsc --noEmit                  # Type check

# Database
npx drizzle-kit generate          # Generate migration from schema changes
npx drizzle-kit migrate           # Apply migrations
psql -h localhost -p 5434 -U litellm_user -d forge_studio

# Service management
systemctl restart forge-studio    # Restart server
systemctl status forge-studio     # Check status
journalctl -u forge-studio -f     # Live logs

# PM2
pm2 list                          # List processes
pm2 logs forge-studio             # View logs
pm2 restart forge-studio          # Restart
pm2 save                          # Save process list
```
