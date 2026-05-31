import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { workflows, workflowRuns, workflowNodeRuns, workflowVersions, workflowWebhooks } from "../../drizzle/schema";
import { getDb } from "../db";
import { workflowEngine } from "../services/workflow-engine";

const WORKFLOW_TEMPLATES = [
  { name: "Customer Support Triage", description: "Classify incoming support requests and route to appropriate agents", trigger: "webhook", icon: "🎫", nodes: [{ id: "1", type: "webhook-trigger", position: { x: 50, y: 200 }, data: { label: "Webhook" } }, { id: "2", type: "llm-branch", position: { x: 300, y: 200 }, data: { label: "Classify Intent", categories: ["technical", "billing", "feature", "other"] } }, { id: "3", type: "agent-node", position: { x: 550, y: 50 }, data: { label: "Tech Support" } }, { id: "4", type: "chat-send", position: { x: 800, y: 50 }, data: { label: "Reply to User" } }], edges: [{ source: "1", target: "2" }, { source: "2", target: "3", label: "condition", condition: "classification contains technical" }, { source: "3", target: "4" }] },
  { name: "Code Review Pipeline", description: "Auto-review code on GitHub push", trigger: "webhook", icon: "🔍", nodes: [], edges: [] },
  { name: "Daily Report Generator", description: "Generate and email daily usage reports", trigger: "cron", icon: "📊", nodes: [], edges: [] },
  { name: "Document Processing", description: "Auto-chunk and index uploaded documents", trigger: "event", icon: "📄", nodes: [], edges: [] },
  { name: "Budget Guardian", description: "Monitor spend and alert at thresholds", trigger: "cron", icon: "💰", nodes: [], edges: [] },
  { name: "Multi-Model Router", description: "Route queries to optimal model size", trigger: "chat_command", icon: "🔀", nodes: [], edges: [] },
  { name: "Security Scanner", description: "Monitor for threats every 30s", trigger: "cron", icon: "🛡️", nodes: [], edges: [] },
  { name: "Onboarding Sequence", description: "Guide new users through setup", trigger: "event", icon: "👋", nodes: [], edges: [] },
  { name: "Content Pipeline", description: "Fetch RSS, summarize, post to channels", trigger: "cron", icon: "📰", nodes: [], edges: [] },
  { name: "Database Maintenance", description: "Weekly cleanup and optimization", trigger: "cron", icon: "🗃️", nodes: [], edges: [] },
  { name: "Model Health Monitor", description: "Check all model health every 2min", trigger: "cron", icon: "❤️", nodes: [], edges: [] },
  { name: "Agent Fleet Manager", description: "Coordinate multi-agent task execution", trigger: "agent_completion", icon: "🧠", nodes: [], edges: [] },
];

export const workflowRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) return [];
    return db.select().from(workflows).where(eq(workflows.tenantId, ctx.tenantId || 1)).orderBy(desc(workflows.updatedAt));
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) return null;
    return db.select().from(workflows).where(and(eq(workflows.id, input.id), eq(workflows.tenantId, ctx.tenantId || 1))).limit(1).then(r => r[0] || null);
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional(), triggerType: z.string().default("manual"), graph: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb(); if (!db) throw new Error("DB not available");
      const result = await db.insert(workflows).values({
        tenantId: ctx.tenantId || 1, name: input.name, description: input.description || null,
        triggerType: input.triggerType as any, graph: input.graph || JSON.stringify({ nodes: [], edges: [] }),
        settings: JSON.stringify({ timeout: 300000, maxBudget: 1.0, errorHandling: "stop", retryPolicy: { max: 3, backoff: "exponential" } }),
        status: "draft", createdBy: ctx.userId || ctx.user?.id || 0,
      }).returning({ id: workflows.id, name: workflows.name });
      return result[0];
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), graph: z.string().optional(), status: z.string().optional(), triggerType: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb(); if (!db) throw new Error("DB not available");
      const updates: Record<string, any> = {};
      if (input.name) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.graph) { updates.graph = input.graph; updates.version = sql`${workflows.version} + 1`; }
      if (input.status) updates.status = input.status;
      if (input.triggerType) updates.triggerType = input.triggerType;
      await db.update(workflows).set(updates).where(and(eq(workflows.id, input.id), eq(workflows.tenantId, ctx.tenantId || 1)));
      return { success: true };
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.update(workflows).set({ status: "archived" }).where(and(eq(workflows.id, input.id), eq(workflows.tenantId, ctx.tenantId || 1)));
    return { success: true };
  }),

  execute: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    workflowEngine.execute(input.id, "manual").catch(err => console.error("[Workflow] Execute error:", err.message));
    return { success: true };
  }),

  pause: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.update(workflows).set({ status: "paused" }).where(eq(workflows.id, input.id));
    return { success: true };
  }),

  resume: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.update(workflows).set({ status: "active" }).where(eq(workflows.id, input.id));
    return { success: true };
  }),

  runs: protectedProcedure.input(z.object({ workflowId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb(); if (!db) return [];
      return db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, input.workflowId))
        .orderBy(desc(workflowRuns.startedAt)).limit(input.limit).offset(input.offset);
    }),

  runDetail: protectedProcedure.input(z.object({ runId: z.number() })).query(async ({ input }) => {
    const db = await getDb(); if (!db) return null;
    const run = await db.select().from(workflowRuns).where(eq(workflowRuns.id, input.runId)).limit(1).then(r => r[0]);
    const nodes = await db.select().from(workflowNodeRuns).where(eq(workflowNodeRuns.workflowRunId, input.runId)).orderBy(workflowNodeRuns.startedAt);
    return { run, nodes };
  }),

  templates: protectedProcedure.query(async () => WORKFLOW_TEMPLATES.map((t, i) => ({ ...t, id: i + 1 }))),

  fromTemplate: protectedProcedure
    .input(z.object({ templateIndex: z.number().min(0).max(11), name: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb(); if (!db) throw new Error("DB not available");
      const tpl = WORKFLOW_TEMPLATES[input.templateIndex];
      if (!tpl) throw new Error("Template not found");
      const result = await db.insert(workflows).values({
        tenantId: ctx.tenantId || 1, name: input.name || tpl.name, description: tpl.description,
        triggerType: tpl.trigger as any,
        graph: JSON.stringify({ nodes: tpl.nodes || [], edges: tpl.edges || [] }),
        settings: JSON.stringify({ timeout: 300000, maxBudget: 1.0, errorHandling: "stop", retryPolicy: { max: 3, backoff: "exponential" } }),
        status: "draft", createdBy: ctx.userId || ctx.user?.id || 0,
      }).returning({ id: workflows.id });
      return result[0];
    }),
});
