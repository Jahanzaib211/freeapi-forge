import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getDb,
  createRequestHistory,
  getRequestHistory,
  getRequestHistoryCount,
  getApiKeysByTeamId,
  getBudgetLimit,
  getAllProviders,
  updateProvider,
  updateBudgetLimit,
  getOrCreateBudgetLimit,
  createAuditLog,
  updateBudgetSpend,
  getTeamsByOwnerId,
} from "./db";
import { providerService } from "./services/provider_service";
import { llmRouter } from "./services/llm_router";
import {
  addModelToConfig,
  removeModelFromConfig,
  testModel,
  getAllModelsFromConfig,
  loadLitellmConfig,
} from "./services/model_manager";
import {
  getLiveStats,
  getHourlyVolume,
  getTopModels,
  getProviderPerformance,
  getModelStats,
  getModelHistory,
} from "./services/analytics_service";

import { systemRouter as systemMonitorRouter } from "./routers/system_router";
import { virtualKeyRouter } from "./routers/virtual_key_router";
import { mcpRouter } from "./routers/mcp_router";
import { skillRouter } from "./routers/skill_router";
import { guardrailRouter } from "./routers/guardrail_router";
import { organizationRouter } from "./routers/organization_router";
import { agentRouter } from "./routers/agent_router";
import { settingsRouter } from "./routers/settings_router";
import { usageRouter } from "./routers/usage_router";
import { customProviderRouter } from "./routers/custom_provider_router";
import { huggingfaceRouter } from "./routers/huggingface_router";
import { promptRouter } from "./routers/prompt_router";
import { benchmarkRouter } from "./routers/benchmark_router";
import { providerHealthRouter } from "./routers/provider_health_router";
import { webhookRouter } from "./routers/webhook_router";
import { catalogRouter } from "./routers/catalog_router";
import { auditRouter } from "./routers/audit_router";
import { sandboxRouter } from "./routers/sandbox_router";
import { localModelRouter } from "./routers/local_model_router";
import { provisioningRouter } from "./routers/provisioning";
import { chatRouter } from "./routers/chat";
import { budgetRouter } from "./routers/budget";
import { ragRouter } from "./routers/rag";
import { discordRouter } from "./routers/discord";
import { agentRouter as agentBuilderRouter } from "./routers/agents";
import { mcpExplorerRouter } from "./routers/mcp-explorer";
import { workflowRouter } from "./routers/workflows";
import { customProviderService } from "./services/custom_provider";
import { directProxyChat } from "./services/direct_proxy";

async function resolveTeamId(ctx: { user?: { id?: number } | null; tenantId?: number }): Promise<number> {
  if (ctx.user?.id) {
    const teams = await getTeamsByOwnerId(ctx.user.id, ctx.tenantId);
    if (teams.length > 0) return teams[0].id;
  }
  return 1;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Provider management
  providers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const providers = await getAllProviders(ctx.tenantId);
      return providers.map((p) => ({
        id: p.id,
        name: p.name,
        endpoint: p.litellmEndpoint,
        enabled: p.enabled === 1,
        qualityScore: p.qualityScore,
        latencyMs: p.latencyMs,
        costPerMToken: p.costPerMToken,
      }));
    }),

    status: protectedProcedure.query(async ({ ctx }) => {
      const statuses = await providerService.getProviderStatus(ctx.tenantId);
      return statuses.map((s) => ({
        id: s.id,
        name: s.provider,
        litellmEndpoint: s.litellmEndpoint,
        enabled: s.enabled,
        circuitState: s.circuitState,
        qualityScore: s.qualityScore,
        latencyMs: s.latencyMs,
        failureCount: s.failureCount,
        rateLimitCooldown: s.rateLimitCooldown,
      }));
    }),
  }),

  // Budget tracking
  budget: router({
    getMonthlySpend: protectedProcedure
      .input(z.object({ teamId: z.string().default("default") }))
      .query(async ({ input, ctx }) => {
        const teamIdNum = await resolveTeamId(ctx);
        const tenantId = ctx.tenantId || 1;
        const monthYear = new Date().toISOString().slice(0, 7);
        const budget = await getOrCreateBudgetLimit(teamIdNum, monthYear, 10, tenantId);

        return {
          teamId: input.teamId,
          monthYear,
          currentSpend: (budget?.currentSpendUsd || 0) / 1000000,
          monthlyLimit: budget?.monthlyLimitUsd || 10,
          percentageUsed: budget ? ((budget.currentSpendUsd / 1000000) / (budget.monthlyLimitUsd || 10)) * 100 : 0,
        };
      }),

    updateLimit: protectedProcedure
      .input(
        z.object({
          teamId: z.string(),
          newLimit: z.number().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }

        const teamIdNum = await resolveTeamId(ctx);
        const tenantId = ctx.tenantId || 1;
        const monthYear = new Date().toISOString().slice(0, 7);
        await updateBudgetLimit(teamIdNum, monthYear, input.newLimit, tenantId);
        await createAuditLog(ctx.user.id, teamIdNum, "UPDATE_BUDGET_LIMIT", `New limit: $${input.newLimit}`, tenantId);

        return { success: true };
      }),
  }),

  // Request history
  requests: router({
    list: protectedProcedure
      .input(
        z.object({
          teamId: z.string().default("default"),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        const teamIdNum = await resolveTeamId(ctx);
        const tenantId = ctx.tenantId || 1;
        const history = await getRequestHistory(teamIdNum, input.limit, input.offset, tenantId);
        const total = await getRequestHistoryCount(teamIdNum, tenantId);

        return {
          requests: history.map((r) => ({
            id: r.id,
            provider: r.providerId?.toString() || "unknown",
            taskType: r.taskType,
            tokens: r.totalTokens,
            costUsd: (r.costUsd || 0) / 1000000,
            status: r.status,
            timestamp: r.createdAt,
          })),
          total,
          limit: input.limit,
          offset: input.offset,
        };
      }),
  }),

  // Admin panel
  admin: router({
    updateProvider: protectedProcedure
      .input(
        z.object({
          providerId: z.number(),
          enabled: z.boolean().optional(),
          qualityScore: z.number().min(0).max(100).optional(),
          latencyMs: z.number().min(0).optional(),
          costPerMToken: z.number().min(0).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }

        const updates: Record<string, any> = {};
        if (input.enabled !== undefined) updates.enabled = input.enabled ? 1 : 0;
        if (input.qualityScore !== undefined) updates.qualityScore = input.qualityScore;
        if (input.latencyMs !== undefined) updates.latencyMs = input.latencyMs;
        if (input.costPerMToken !== undefined) updates.costPerMToken = input.costPerMToken;

        await updateProvider(input.providerId, updates);
        await createAuditLog(
          ctx.user.id,
          null,
          "UPDATE_PROVIDER",
          `Provider ${input.providerId}: ${JSON.stringify(updates)}`
        );

        return { success: true };
      }),

    getProviders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const providers = await getAllProviders(ctx.tenantId);
      return providers.map((p) => ({
        id: p.id,
        name: p.name,
        endpoint: p.litellmEndpoint,
        enabled: p.enabled === 1,
        qualityScore: p.qualityScore,
        latencyMs: p.latencyMs,
        costPerMToken: p.costPerMToken,
      }));
    }),

    resetCircuitBreaker: protectedProcedure
      .input(z.object({ providerName: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }

        await providerService.resetCircuitBreaker(input.providerName);
        await createAuditLog(
          ctx.user.id,
          null,
          "RESET_CIRCUIT_BREAKER",
          `Provider: ${input.providerName}`
        );

        return { success: true };
      }),

    resetProviderHealth: protectedProcedure
      .input(z.object({ providerName: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }

        await providerService.resetProviderHealth(input.providerName);
        await createAuditLog(
          ctx.user.id,
          null,
          "RESET_PROVIDER_HEALTH",
          `Provider: ${input.providerName}`
        );

        return { success: true };
      }),
  }),

  // System health
  health: router({
    check: publicProcedure.query(async () => {
      return {
        status: "healthy",
        timestamp: new Date(),
      };
    }),

    detailed: publicProcedure.query(async () => {
      let dbStatus = "disconnected";
      let redisStatus = "disconnected";

      try {
        const db = await getDb();
        if (db) {
          dbStatus = "connected";
        }
      } catch (error) {
        console.error("[Health] Database check failed:", error);
      }

      try {
        const status = await providerService.getProviderStatus();
        redisStatus = "connected";
      } catch (error) {
        console.error("[Health] Redis check failed:", error);
      }

      return {
        status: dbStatus === "connected" && redisStatus === "connected" ? "healthy" : "degraded",
        redis: redisStatus,
        database: dbStatus,
        timestamp: new Date(),
      };
    }),
  }),

  // Model Manager
  models: router({
    list: publicProcedure.query(async () => {
      return getAllModelsFromConfig();
    }),

    config: publicProcedure.query(async () => {
      const config = loadLitellmConfig();
      return config.model_list || [];
    }),

    add: protectedProcedure
      .input(
        z.object({
          modelName: z.string().min(1),
          provider: z.string().min(1),
          modelId: z.string().min(1),
          apiKey: z.string().optional(),
          apiBase: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const success = await addModelToConfig(
          input.modelName,
          input.provider,
          input.modelId,
          input.apiKey,
          input.apiBase
        );
        return { success };
      }),

    remove: protectedProcedure
      .input(z.object({ modelName: z.string() }))
      .mutation(async ({ input }) => {
        const success = await removeModelFromConfig(input.modelName);
        return { success };
      }),

    test: publicProcedure
      .input(z.object({ modelName: z.string() }))
      .mutation(async ({ input }) => {
        return await testModel(input.modelName);
      }),
  }),

  // Analytics from LiteLLM SpendLogs
  analytics: router({
    liveStats: publicProcedure.query(async () => {
      return await getLiveStats();
    }),

    hourlyVolume: publicProcedure.query(async () => {
      return await getHourlyVolume();
    }),

    topModels: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(20).default(5) }))
      .query(async ({ input }) => {
        return await getTopModels(input.limit);
      }),

    providerPerformance: publicProcedure.query(async () => {
      return await getProviderPerformance();
    }),

    modelStats: publicProcedure.query(async () => {
      return await getModelStats();
    }),

    modelHistory: publicProcedure
      .input(z.object({ model: z.string(), limit: z.number().int().min(1).max(100).default(20) }))
      .query(async ({ input }) => {
        return await getModelHistory(input.model, input.limit);
      }),
  }),

  // System Monitor (GPU, LLMs, PM2)
  systemMonitor: systemMonitorRouter,

  // Virtual Keys
  virtualKeys: virtualKeyRouter,

  // MCP Servers
  mcp: mcpRouter,

  // Skills
  skills: skillRouter,

  // Guardrails & Policies
  guardrails: guardrailRouter,

  // Organizations & Access Groups
  organizations: organizationRouter,

  // Agents
  agents: agentRouter,

  // Settings
  settings: settingsRouter,

  // Usage Logs
  usage: usageRouter,

  // Custom Providers (Paste-Any-API)
  customProviders: customProviderRouter,

  // HuggingFace Model Hub
  huggingface: huggingfaceRouter,

  // Prompt Library
  prompts: promptRouter,

  // Model Benchmarking
  benchmark: benchmarkRouter,

  // Provider Health
  providerHealth: providerHealthRouter,

  // Webhooks
  webhooks: webhookRouter,

  // Unified Catalog (AI Lab Hub)
  catalog: catalogRouter,

  // Audit Logs
  audit: auditRouter,

  // Sandbox & Terminal
  sandbox: sandboxRouter,

  // Local Model Load Balancer
  localModels: localModelRouter,

  // Multi-tenant provisioning
  provisioning: provisioningRouter,

  // Chat engine
  chat: chatRouter,

  // Budget management
  budgetManager: budgetRouter,

  // RAG document intelligence
  rag: ragRouter,

  // Discord bridge
  discord: discordRouter,

  // Agent Builder
  agentBuilder: agentBuilderRouter,

  // MCP Explorer
  mcpExplorer: mcpExplorerRouter,

  // Agentic Workflows
  workflowRouter: workflowRouter,
});

export type AppRouter = typeof appRouter;
