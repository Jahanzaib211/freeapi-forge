# Changelog — Forge Studio

All notable changes to Forge Studio are documented here.

## v3.0.0 — Production Infrastructure (2025-05-31)

### Added
- 15-feature production infrastructure
- systemd services (reboot-proof deployment)
- Healthcheck cron (auto-restart on failure)
- 19 tRPC routers for typed API
- 27 service modules
- 42 dashboard pages
- 53 shadcn/ui components
- Circuit breaker for provider failover
- Semantic response caching
- Virtual key budget/rate limiting
- Guardrails (PII, injection, toxicity)
- MCP host + server integration
- HuggingFace model browsing
- LLM auto-discovery (Ollama, llama.cpp, GGUF)
- Visual workflow builder (Forge Builder)
- Audit logging with immutable trail
- Multi-tenant organizations
- Browser extension (Chrome/Edge)
- Docker Compose for containerized deployment
- GitHub Actions CI/CD pipeline
- Dockerfile (multi-stage production build)
- 49 models across 9 providers

### Fixed
- Database connection URL in ecosystem config
- Auth flow verification
- Blank frontend CSP issue
- Dashboard screenshot (production build)

## v2.0.0 — AI Lab Monster Upgrade (2025-05-28)

### Added
- AI Lab Hub with unified model catalog
- Inference Lab with chat UI
- Provider health monitoring
- System monitor (CPU/GPU/RAM)
- Process manager
- Virtual keys with budget limits
- Prompt library
- Benchmark tools
- Custom providers (paste-any-API)
- Standalone proxy mode (no LiteLLM required)
- Real CRUD operations for all entities

### Changed
- Migrated from SQLite to PostgreSQL
- Migrated from Prisma to Drizzle ORM
- Migrated from Next.js to Vite + React SPA
- Migrated from REST to tRPC

## v1.0.0 — Initial Release (2025-05-15)

### Added
- Basic LLM proxy with OpenAI-compatible API
- Provider routing (Groq, Gemini, Mistral)
- Simple request logging
- Basic dashboard
- Docker deployment
- README documentation
