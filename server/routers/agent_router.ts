import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { agents } from "../../drizzle/schema";
import { llmRouter } from "../services/llm_router";

export const agentRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const result = await db.select().from(agents);
    return result;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id))
        .limit(1);

      if (result.length === 0) throw new Error("Agent not found");
      return result[0];
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        systemPrompt: z.string().optional(),
        model: z.string().optional(),
        tools: z.array(z.string()).optional(),
        mcpServerIds: z.array(z.string()).optional(),
        budgetUsd: z.number().min(0).default(10),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .insert(agents)
        .values({
          ...input,
          tenantId: 1,
          type: "chat",
          config: JSON.stringify({
            triggers: [{ type: "manual" }],
            llm: { model: input.model || "fast-8b", temperature: 0.7, maxTokens: 2048 },
            memory: { contextWindow: 50, persistentMemory: true },
            guardrails: { maxSteps: 10, maxRuntimeSec: 60, maxBudgetRun: 0.5, requireApproval: [], scope: [] },
          }),
        })
        .returning({ id: agents.id });

      return { id: result[0].id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        systemPrompt: z.string().optional(),
        model: z.string().optional(),
        tools: z.array(z.string()).optional(),
        mcpServerIds: z.array(z.string()).optional(),
        budgetUsd: z.number().min(0).optional(),
        enabled: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      await db.update(agents).set(updates).where(eq(agents.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(agents).where(eq(agents.id, input.id));
      return { success: true };
    }),

  test: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
        maxTokens: z.number().int().min(1).max(8192).default(1024),
        temperature: z.number().min(0).max(2).default(0.7),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id))
        .limit(1);

      if (result.length === 0) throw new Error("Agent not found");

      const agent = result[0];
      if (agent.enabled !== 1) throw new Error("Agent is disabled");

      const systemMessage = agent.systemPrompt
        ? [{ role: "system" as const, content: agent.systemPrompt }]
        : [];

      const allMessages = [...systemMessage, ...input.messages];

      const response = await llmRouter.complete({
        messages: allMessages,
        taskType: "chat",
        maxTokens: input.maxTokens,
        temperature: input.temperature,
      });

      return response;
    }),
});
