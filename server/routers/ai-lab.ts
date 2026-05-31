import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { providerRegistryService } from "../services/provider-registry-service";
import { onboardingService } from "../services/onboarding-service";
import { suggestionEngineService } from "../services/suggestion-engine-service";

export const aiLabRouter = router({
  listProviders: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return providerRegistryService.getGlobalCatalog();
    }),

  getConnectedProviders: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return providerRegistryService.getConnectedProviders(tenantId);
    }),

  addProvider: protectedProcedure
    .input(z.object({ providerRegistryId: z.number(), apiKey: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return providerRegistryService.addProvider(tenantId, input.providerRegistryId, input.apiKey);
    }),

  removeProvider: protectedProcedure
    .input(z.object({ providerRegistryId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await providerRegistryService.removeProvider(tenantId, input.providerRegistryId);
      return { success: true };
    }),

  testProvider: protectedProcedure
    .input(z.object({ providerRegistryId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return providerRegistryService.testProvider(tenantId, input.providerRegistryId);
    }),

  testModel: protectedProcedure
    .input(z.object({ modelId: z.string(), prompt: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return providerRegistryService.testModel(tenantId, input.modelId, input.prompt);
    }),

  freeProviders: protectedProcedure
    .query(async () => {
      return providerRegistryService.getFreeProviders();
    }),

  getBenchmarks: protectedProcedure
    .input(z.object({ modelId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return providerRegistryService.getBenchmarks(tenantId, input.modelId);
    }),

  getQuestionnaire: protectedProcedure
    .query(async () => {
      return onboardingService.getQuestionnaire();
    }),

  processQuestionnaire: protectedProcedure
    .input(z.object({}).passthrough())
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return onboardingService.processQuestionnaire(tenantId, input);
    }),

  getOnboardingProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return onboardingService.getProfile(tenantId);
    }),

  getSuggestions: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return suggestionEngineService.getActiveSuggestions(tenantId);
    }),

  dismissSuggestion: protectedProcedure
    .input(z.object({ type: z.string(), key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await suggestionEngineService.dismissSuggestion(tenantId, input.type, input.key);
      return { success: true };
    }),
});
