import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { guardService } from "../services/guard-service";

export const guardRouter = router({
  metrics: protectedProcedure.query(async ({ ctx }) => {
    return guardService.getSystemMetrics();
  }),

  auditTrail: protectedProcedure
    .input(
      z.object({
        action: z.string().optional(),
        userId: z.number().optional(),
        page: z.number().int().default(1),
        perPage: z.number().int().max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return guardService.getAuditTrail(tenantId, input);
    }),

  diagnostics: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId || 1;
    return guardService.runDiagnostics(tenantId);
  }),

  uptimeHistory: protectedProcedure.query(async () => {
    return guardService.getUptimeHistory();
  }),
});
