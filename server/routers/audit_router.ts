import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { auditLogs, users, teams } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";

export const auditRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        action: z.string().optional(),
        teamId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      const limit = input?.limit || 50;
      const offset = input?.offset || 0;

      let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
      
      const result = await query;
      const countResult = await db.select({ count: auditLogs.id }).from(auditLogs);

      const enriched = await Promise.all(
        result.map(async (log) => {
          let userName: string | null = null;
          let teamName: string | null = null;

          if (log.userId) {
            try {
              const userResult = await db.select({ name: users.name }).from(users).where(eq(users.id, log.userId)).limit(1);
              if (userResult[0]) userName = userResult[0].name;
            } catch {}
          }

          if (log.teamId) {
            try {
              const teamResult = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, log.teamId)).limit(1);
              if (teamResult[0]) teamName = teamResult[0].name;
            } catch {}
          }

          return {
            id: log.id,
            userId: log.userId,
            userName,
            teamId: log.teamId,
            teamName,
            action: log.action,
            details: log.details,
            createdAt: log.createdAt,
          };
        })
      );

      return {
        logs: enriched,
        total: countResult.length,
        limit,
        offset,
      };
    }),

  deleteOld: protectedProcedure
    .input(z.object({ olderThanDays: z.number().min(1).default(30) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { deleted: 0 };
      return { deleted: 0, message: "Manual cleanup not implemented" };
    }),
});
