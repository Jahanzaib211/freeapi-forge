import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getResourceCatalog } from "../services/resource_catalog";
import { customProviderService } from "../services/custom_provider";
import { detectAllLLMs } from "../services/llm_detector";

const KNOWN_PROVIDERS: Record<string, { name: string; url: string }> = {
  deepseek: { name: "DeepSeek", url: "https://api.deepseek.com" },
  openai: { name: "OpenAI", url: "https://api.openai.com/v1" },
  groq: { name: "Groq", url: "https://api.groq.com/openai/v1" },
  together: { name: "Together", url: "https://api.together.xyz/v1" },
  openrouter: { name: "OpenRouter", url: "https://openrouter.ai/api/v1" },
  mistral: { name: "Mistral", url: "https://api.mistral.ai/v1" },
  gemini: { name: "Google Gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai" },
};

export const catalogRouter = router({
  getAll: publicProcedure.query(async () => {
    return getResourceCatalog();
  }),

  providers: router({
    listKnown: publicProcedure.query(() => {
      return Object.entries(KNOWN_PROVIDERS).map(([key, val]) => ({
        key,
        name: val.name,
        url: val.url,
      }));
    }),

    addQuick: protectedProcedure
      .input(
        z.object({
          providerKey: z.string(),
          apiKey: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const known = KNOWN_PROVIDERS[input.providerKey];
        if (!known) throw new Error(`Unknown provider: ${input.providerKey}`);

        const result = await customProviderService.add({
          name: known.name,
          apiUrl: known.url,
          apiKey: input.apiKey,
        });

        return { provider: result.provider, models: result.models };
      }),

    addCustom: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          apiUrl: z.string().url(),
          apiKey: z.string().min(1),
          models: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return customProviderService.add(input);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return customProviderService.delete(input.id);
      }),

    toggle: protectedProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        return customProviderService.toggleEnabled(input.id, input.enabled);
      }),

    test: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return customProviderService.test(input.id);
      }),
  }),

  local: router({
    scan: publicProcedure.query(async () => {
      return detectAllLLMs();
    }),
  }),

  models: router({
    test: publicProcedure
      .input(z.object({ modelName: z.string() }))
      .mutation(async ({ input }) => {
        const { testModel } = await import("../services/model_manager");
        return testModel(input.modelName);
      }),
  }),
});
