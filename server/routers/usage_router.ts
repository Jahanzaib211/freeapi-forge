import { z } from "zod";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { usageLogs, systemEvents } from "../../drizzle/schema";

export const usageRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          model: z.string().optional(),
          status: z.string().optional(),
          virtualKeyId: z.number().optional(),
          teamId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().int().min(1).max(500).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      const conditions = [];

      if (input?.model) {
        conditions.push(eq(usageLogs.model, input.model));
      }
      if (input?.status) {
        conditions.push(eq(usageLogs.status, input.status));
      }
      if (input?.virtualKeyId) {
        conditions.push(eq(usageLogs.virtualKeyId, input.virtualKeyId));
      }
      if (input?.teamId) {
        conditions.push(eq(usageLogs.teamId, input.teamId));
      }
      if (input?.startDate) {
        conditions.push(gte(usageLogs.createdAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(usageLogs.createdAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(usageLogs)
        .where(whereClause);

      const total = countResult[0]?.count ?? 0;

      const logs = await db
        .select()
        .from(usageLogs)
        .where(whereClause)
        .orderBy(usageLogs.createdAt)
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      return { logs, total };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(usageLogs)
        .where(eq(usageLogs.id, input.id))
        .limit(1);

      if (result.length === 0) throw new Error("Usage log not found");
      return result[0];
    }),

  stats: protectedProcedure
    .input(
      z
        .object({
          virtualKeyId: z.number().optional(),
          teamId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { totalRequests: 0, totalTokens: 0, totalCostUsd: 0, avgLatencyMs: 0 };

      const conditions = [];

      if (input?.virtualKeyId) {
        conditions.push(eq(usageLogs.virtualKeyId, input.virtualKeyId));
      }
      if (input?.teamId) {
        conditions.push(eq(usageLogs.teamId, input.teamId));
      }
      if (input?.startDate) {
        conditions.push(gte(usageLogs.createdAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(usageLogs.createdAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({
          totalRequests: sql<number>`count(*)`,
          totalTokens: sql<number>`coalesce(sum(${usageLogs.totalTokens}), 0)`,
          totalCostUsd: sql<number>`coalesce(sum(${usageLogs.costUsd}), 0)`,
          avgLatencyMs: sql<number>`coalesce(avg(${usageLogs.latencyMs}), 0)`,
        })
        .from(usageLogs)
        .where(whereClause);

      return result[0];
    }),

  byModel: protectedProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];

      if (input?.startDate) {
        conditions.push(gte(usageLogs.createdAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(usageLogs.createdAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({
          model: usageLogs.model,
          totalRequests: sql<number>`count(*)`,
          totalTokens: sql<number>`coalesce(sum(${usageLogs.totalTokens}), 0)`,
          totalCostUsd: sql<number>`coalesce(sum(${usageLogs.costUsd}), 0)`,
          avgLatencyMs: sql<number>`coalesce(avg(${usageLogs.latencyMs}), 0)`,
        })
        .from(usageLogs)
        .where(whereClause)
        .groupBy(usageLogs.model);

      return result;
    }),

  systemEvents: publicProcedure
    .input(
      z
        .object({
          level: z.string().optional(),
          source: z.string().optional(),
          limit: z.number().int().min(1).max(500).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { events: [], total: 0 };

      const conditions = [];

      if (input?.level) {
        conditions.push(eq(systemEvents.level, input.level));
      }
      if (input?.source) {
        conditions.push(eq(systemEvents.source, input.source));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(systemEvents)
        .where(whereClause);

      const total = countResult[0]?.count ?? 0;

      const events = await db
        .select()
        .from(systemEvents)
        .where(whereClause)
        .orderBy(desc(systemEvents.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      return { events, total };
    }),

  systemEventSources: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    try {
      const result = await db
        .selectDistinct({ source: systemEvents.source })
        .from(systemEvents);
      return result.map((r) => r.source);
    } catch {
      return [];
    }
  }),

  systemEventCounts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { error: 0, warn: 0, info: 0, debug: 0, total: 0 };

    try {
      const result = await db
        .select({
          level: systemEvents.level,
          count: sql<number>`count(*)::int`,
        })
        .from(systemEvents)
        .groupBy(systemEvents.level);

      const counts = { error: 0, warn: 0, info: 0, debug: 0, total: 0 };
      for (const row of result) {
        const level = row.level as keyof typeof counts;
        if (level in counts) {
          counts[level] = row.count;
        }
        counts.total += row.count;
      }
      return counts;
    } catch {
      return { error: 0, warn: 0, info: 0, debug: 0, total: 0 };
    }
  }),
});
