import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { chatService } from "../services/chat-service";
import { llmRouter } from "../services/llm_router";
import { directProxyChat } from "../services/direct_proxy";
import { customProviderService } from "../services/custom_provider";
import { budgetService } from "../services/budget-service";
import { getDb, getOrCreateBudgetLimit, createRequestHistory, updateBudgetSpend, createAuditLog, getAllProviders } from "../db";

export const chatRouter = router({
  complete: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string(),
          })
        ),
        taskType: z.enum(["chat", "coding", "vision", "fast", "long_context", "local"]).default("chat"),
        maxTokens: z.number().int().min(1).max(8192).default(1024),
        temperature: z.number().min(0).max(2).default(0.7),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const monthYear = new Date().toISOString().slice(0, 7);

      const isBlocked = await budgetService.isBlocked(tenantId, monthYear);
      if (isBlocked) throw new Error("Budget limit exceeded");

      const taskModelMap: Record<string, string> = {
        chat: "fast-70b", coding: "coder", vision: "gemini-flash",
        fast: "fast-8b", long_context: "smart", local: "qwen-moe",
      };
      const candidateModel = taskModelMap[input.taskType || "chat"] || "fast-70b";

      let response;
      const customProvider = await customProviderService.findProviderForModel(candidateModel);
      if (customProvider) {
        try {
          const result = await directProxyChat({
            messages: input.messages, model: candidateModel,
            apiUrl: customProvider.apiUrl, apiKey: customProvider.apiKey,
            maxTokens: input.maxTokens, temperature: input.temperature, stream: false,
          });
          response = {
            id: result.id || `msg_${Date.now()}`, object: "chat.completion",
            created: Math.floor(Date.now() / 1000), model: candidateModel,
            provider: `custom:${customProvider.name}`, choices: result.choices || [],
            usage: result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          };
        } catch {}
      }

      if (!response) {
        response = await llmRouter.complete({
          messages: input.messages, taskType: input.taskType,
          maxTokens: input.maxTokens, temperature: input.temperature, tenantId,
        });
      }

      const costUsd = (response.usage.total_tokens / 1_000_000) * 0.0001;
      await budgetService.recordSpend(tenantId, monthYear, costUsd);

      return response;
    }),
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
