import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { chatService } from "../services/chat-service";

export const chatRouter = router({
  createConversation: protectedProcedure
    .input(z.object({
      title: z.string().max(500).optional(),
      systemPrompt: z.string().optional(),
      model: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const userId = ctx.userId || ctx.user?.id || 0;
      return chatService.createConversation(tenantId, userId, input);
    }),

  listConversations: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const userId = ctx.userId || ctx.user?.id || 0;
      return chatService.getConversations(tenantId, userId, input.limit, input.offset);
    }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return chatService.getMessages(input.conversationId, tenantId);
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string().min(1).max(100000),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(1).max(32000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const userId = ctx.userId || ctx.user?.id || 0;
      return chatService.sendMessage(tenantId, userId, input.conversationId, input.content, {
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      });
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await chatService.deleteConversation(input.conversationId, tenantId);
      return { success: true };
    }),

  forkConversation: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      fromMessageId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const userId = ctx.userId || ctx.user?.id || 0;
      return chatService.forkConversation(input.conversationId, tenantId, userId, input.fromMessageId);
    }),

  exportConversation: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      format: z.enum(["json", "markdown"]).default("json"),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return chatService.exportConversation(input.conversationId, tenantId, input.format);
    }),
});
