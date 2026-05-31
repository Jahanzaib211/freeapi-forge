import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { forgeBrainService } from "../services/forge-brain-service";

export const forgeBrainRouter = router({
  getNode: protectedProcedure
    .input(z.object({ nodeType: z.string(), slug: z.string() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return forgeBrainService.getNode(tenantId, input.nodeType, input.slug);
    }),

  listNodes: protectedProcedure
    .input(z.object({
      nodeType: z.string().optional(),
      status: z.string().optional(),
      page: z.number().int().default(1),
      perPage: z.number().int().max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return forgeBrainService.listNodes(tenantId, {
        nodeType: input.nodeType, status: input.status,
        page: input.page, perPage: input.perPage,
      });
    }),

  searchNodes: protectedProcedure
    .input(z.object({ query: z.string().min(1), nodeType: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return forgeBrainService.searchNodes(tenantId, input.query, input.nodeType);
    }),

  getGraphData: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return forgeBrainService.getGraphData(tenantId);
    }),

  getBacklinks: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return forgeBrainService.getBacklinks(tenantId, input.slug);
    }),

  getNodeMd: protectedProcedure
    .input(z.object({ nodeType: z.string(), slug: z.string() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const node = await forgeBrainService.getNode(tenantId, input.nodeType, input.slug);
      return node?.content || "";
    }),

  getVaultStats: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return forgeBrainService.getVaultStats(tenantId);
    }),

  linkNodes: protectedProcedure
    .input(z.object({ sourceSlug: z.string(), targetSlug: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await forgeBrainService.linkNodes(tenantId, input.sourceSlug, input.targetSlug);
      return { success: true };
    }),

  getActivityLog: protectedProcedure
    .input(z.object({
      slug: z.string().optional(),
      page: z.number().int().default(1),
      perPage: z.number().int().max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return forgeBrainService.getActivityLog(tenantId, {
        slug: input.slug, page: input.page, perPage: input.perPage,
      });
    }),
});
