import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { mcpExplorerService } from "../services/mcp-explorer-service";
import { mcpSkillBridge } from "../services/mcp-skill-bridge";

export const mcpExplorerRouter = router({
  list: protectedProcedure
    .input(z.object({ query: z.string().optional(), category: z.string().optional(), tier: z.string().optional(), sort: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => mcpExplorerService.listMcps(ctx.tenantId || 1, input)),

  featured: protectedProcedure.query(async ({ ctx }) => mcpExplorerService.getFeatured(ctx.tenantId || 1)),

  detail: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input, ctx }) => mcpExplorerService.getDetail(input.slug, ctx.tenantId || 1)),

  install: protectedProcedure
    .input(z.object({ registryId: z.number(), config: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const userId = ctx.userId || ctx.user?.id || 0;
      await mcpExplorerService.installMcp(tenantId, userId, input.registryId, input.config);
      await mcpSkillBridge.syncServerTools(input.registryId, tenantId);
      return { success: true };
    }),

  uninstall: protectedProcedure
    .input(z.object({ serverId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await mcpSkillBridge.unsyncServerTools(input.serverId, ctx.tenantId || 1);
      await mcpExplorerService.uninstallMcp(ctx.tenantId || 1, input.serverId);
      return { success: true };
    }),

  installed: protectedProcedure.query(async ({ ctx }) => mcpExplorerService.getInstalled(ctx.tenantId || 1)),

  testConnection: protectedProcedure
    .input(z.object({ serverId: z.number() }))
    .mutation(async ({ input, ctx }) => mcpExplorerService.testConnection(input.serverId, ctx.tenantId || 1)),

  usage: protectedProcedure
    .input(z.object({ serverId: z.number() }))
    .query(async ({ input, ctx }) => mcpExplorerService.getUsageStats(ctx.tenantId || 1, input.serverId)),

  dailyUsage: protectedProcedure
    .input(z.object({ serverId: z.number() }))
    .query(async ({ input, ctx }) => mcpExplorerService.getDailyUsage(ctx.tenantId || 1, input.serverId)),

  review: protectedProcedure
    .input(z.object({ mcpServerId: z.number(), rating: z.number().min(1).max(5), title: z.string().optional(), review: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const userId = ctx.userId || ctx.user?.id || 0;
      await mcpExplorerService.rateMcp(tenantId, userId, input.mcpServerId, input.rating, input.title, input.review);
      return { success: true };
    }),

  categories: protectedProcedure.query(async () => mcpExplorerService.getCategories()),

  checkLimit: protectedProcedure.query(async ({ ctx }) => mcpExplorerService.checkUsageLimit(ctx.tenantId || 1)),

  upgradePlan: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await mcpExplorerService.upgradePlan(ctx.tenantId || 1, input.planId);
      return { success: true };
    }),

  currentPlan: protectedProcedure.query(async ({ ctx }) => mcpExplorerService.getCurrentPlan(ctx.tenantId || 1)),

  plans: protectedProcedure.query(async () => mcpExplorerService.getPlans()),

  getTools: protectedProcedure.query(async ({ ctx }) => mcpSkillBridge.getToolsForTenant(ctx.tenantId || 1)),

  executeTool: protectedProcedure
    .input(z.object({ serverId: z.number(), toolName: z.string(), params: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      // Check limit
      const limit = await mcpExplorerService.checkUsageLimit(ctx.tenantId || 1);
      if (limit.remaining <= 0) throw new Error("Daily usage limit exceeded");
      return mcpSkillBridge.executeTool(ctx.tenantId || 1, input.serverId, input.toolName, input.params ? JSON.parse(input.params) : {});
    }),
});
