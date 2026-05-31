import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { budgetService } from "../services/budget-service";

export const budgetRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId || 1;
    const monthYear = new Date().toISOString().slice(0, 7);
    return budgetService.getBudgetStatus(tenantId, monthYear);
  }),

  getMonthlySpend: protectedProcedure
    .input(z.object({ teamId: z.string().default("default") }))
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const monthYear = new Date().toISOString().slice(0, 7);
      return budgetService.getBudgetStatus(tenantId, monthYear);
    }),

  updateLimit: adminProcedure
    .input(z.object({
      newLimit: z.number().min(1),
      monthYear: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const monthYear = input.monthYear || new Date().toISOString().slice(0, 7);
      // Update limit in DB
      const { getDb } = await import("../db");
      const { budgetLimits } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.update(budgetLimits)
          .set({ monthlyLimitUsd: input.newLimit })
          .where(and(eq(budgetLimits.tenantId, tenantId), eq(budgetLimits.monthYear, monthYear)));
      }
      return { success: true };
    }),

  resetMonthly: adminProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.tenantId || 1;
    const monthYear = new Date().toISOString().slice(0, 7);
    await budgetService.resetMonthlySpend(tenantId, monthYear);
    return { success: true };
  }),
});
