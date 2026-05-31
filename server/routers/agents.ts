import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { agents, agentRuns, agentMemories, toolApprovals } from "../../drizzle/schema";
import { getDb } from "../db";
import { agentRuntime } from "../services/agent-runtime";
import { agentScheduler } from "../services/agent-scheduler";

const agentConfigSchema = z.object({
  triggers: z.array(z.object({
    type: z.enum(["cron", "event", "manual"]),
    schedule: z.string().optional(),
    events: z.array(z.string()).optional(),
  })),
  llm: z.object({
    provider: z.string().optional(),
    model: z.string(),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(1).max(32000).default(2048),
  }),
  memory: z.object({
    contextWindow: z.number().int().default(50),
    persistentMemory: z.boolean().default(true),
  }),
  guardrails: z.object({
    maxSteps: z.number().int().default(10),
    maxRuntimeSec: z.number().int().default(60),
    maxBudgetRun: z.number().default(0.5),
    requireApproval: z.array(z.string()).default([]),
    scope: z.array(z.string()).default([]),
  }),
  systemPrompt: z.string().optional(),
});

export const agentRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      type: z.enum(["chat", "workflow", "monitor", "data", "orchestrator"]),
      description: z.string().optional(),
      systemPrompt: z.string().optional(),
      model: z.string().optional(),
      tools: z.array(z.string()).optional(),
      config: agentConfigSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tenantId = ctx.tenantId || 1;
      const userId = ctx.userId || ctx.user?.id || 1;

      const result = await db.insert(agents).values({
        tenantId,
        name: input.name,
        type: input.type,
        description: input.description || null,
        systemPrompt: input.systemPrompt || null,
        model: input.model || "fast-8b",
        tools: input.tools || [],
        config: JSON.stringify(input.config),
        status: "active",
        createdBy: userId,
        nextRunAt: new Date(),
      }).returning({ id: agents.id, name: agents.name });

      // Schedule first run if cron trigger
      if (input.config.triggers?.some(t => t.type === "cron")) {
        await agentScheduler.scheduleNext(result[0].id, input.config as any);
      }

      return result[0];
    }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().int().default(50), offset: z.number().int().default(0) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const tenantId = ctx.tenantId || 1;
      return db.select().from(agents)
        .where(and(eq(agents.tenantId, tenantId), eq(agents.enabled, 1)))
        .orderBy(desc(agents.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      return db.select().from(agents)
        .where(and(eq(agents.id, input.id), eq(agents.tenantId, ctx.tenantId || 1)))
        .limit(1)
        .then(r => r[0] || null);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      systemPrompt: z.string().optional(),
      model: z.string().optional(),
      tools: z.array(z.string()).optional(),
      config: agentConfigSchema.optional(),
      status: z.enum(["active", "paused", "error", "creating"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.systemPrompt !== undefined) updates.systemPrompt = input.systemPrompt;
      if (input.model) updates.model = input.model;
      if (input.tools) updates.tools = input.tools;
      if (input.config) updates.config = JSON.stringify(input.config);
      if (input.status) updates.status = input.status;

      await db.update(agents).set(updates)
        .where(and(eq(agents.id, input.id), eq(agents.tenantId, ctx.tenantId || 1)));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(agents).where(and(eq(agents.id, input.id), eq(agents.tenantId, ctx.tenantId || 1)));
      return { success: true };
    }),

  trigger: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await agentScheduler.triggerAgent(input.id);
      return { success: true };
    }),

  pause: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(agents).set({ status: "paused" }).where(eq(agents.id, input.id));
      return { success: true };
    }),

  getRuns: protectedProcedure
    .input(z.object({ agentId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(agentRuns)
        .where(eq(agentRuns.agentId, input.agentId))
        .orderBy(desc(agentRuns.startedAt))
        .limit(input.limit).offset(input.offset);
    }),

  getPendingApprovals: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(toolApprovals)
        .where(eq(toolApprovals.status, "pending"))
        .orderBy(desc(toolApprovals.createdAt))
        .limit(input.limit);
    }),

  approveTool: adminProcedure
    .input(z.object({ id: z.number(), approved: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const userId = ctx.userId || ctx.user?.id || 0;
      await db.update(toolApprovals).set({
        status: input.approved ? "approved" : "rejected",
        reviewedBy: userId,
        reviewedAt: new Date(),
      }).where(eq(toolApprovals.id, input.id));
      return { success: true };
    }),
});
