import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { githubActionsService } from "../services/github-actions-service";

export const githubActionsRouter = router({
  listRuns: protectedProcedure
    .input(z.object({
      repo: z.string().optional(),
      branch: z.string().optional(),
      status: z.enum(["completed", "failed"]).optional(),
      page: z.number().int().default(1),
      perPage: z.number().int().max(50).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return githubActionsService.getRuns(tenantId, {
        repo: input.repo, branch: input.branch, status: input.status,
        page: input.page, perPage: input.perPage,
      });
    }),

  getRunDetail: protectedProcedure
    .input(z.object({ runId: z.number() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return githubActionsService.getRunDetail(tenantId, input.runId);
    }),

  syncRuns: protectedProcedure
    .input(z.object({ repo: z.string(), count: z.number().int().max(50).default(20) }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return githubActionsService.syncRecentRuns(tenantId, input.repo, input.count);
    }),

  syncRunJobs: protectedProcedure
    .input(z.object({ repo: z.string(), runId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await githubActionsService.syncRunJobs(tenantId, input.repo, input.runId);
      return { success: true };
    }),

  getAlerts: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return githubActionsService.getAlerts(tenantId, input.unreadOnly);
    }),

  markAlertRead: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await githubActionsService.markAlertRead(tenantId, input.alertId);
      return { success: true };
    }),

  markAllAlertsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await githubActionsService.markAllAlertsRead(tenantId);
      return { success: true };
    }),

  dismissAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await githubActionsService.dismissAlert(tenantId, input.alertId);
      return { success: true };
    }),

  getDeploymentHealth: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return githubActionsService.getDeploymentHealth(tenantId);
    }),

  getRunTimeline: protectedProcedure
    .input(z.object({ repo: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return githubActionsService.getRunTimeline(tenantId, input.repo);
    }),

  saveToken: protectedProcedure
    .input(z.object({
      token: z.string().min(1),
      username: z.string().optional(),
      scopes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await githubActionsService.saveToken(tenantId, input.token, input.username, input.scopes);
      return { success: true };
    }),

  hasToken: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return githubActionsService.hasToken(tenantId);
    }),
});
