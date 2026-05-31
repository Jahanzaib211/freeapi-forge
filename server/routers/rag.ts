import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { ragService } from "../services/rag-service";

export const ragRouter = router({
  uploadDocument: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(500),
      type: z.string().min(1).max(32),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const userId = ctx.userId || ctx.user?.id || 0;
      return ragService.uploadDocument(tenantId, input.name, input.type, input.content, userId);
    }),

  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      topK: z.number().int().min(1).max(20).default(5),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return ragService.similaritySearch(tenantId, input.query, input.topK);
    }),

  listDocuments: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return ragService.listDocuments(tenantId, input.limit, input.offset);
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await ragService.deleteDocument(input.documentId, tenantId);
      return { success: true };
    }),
});
