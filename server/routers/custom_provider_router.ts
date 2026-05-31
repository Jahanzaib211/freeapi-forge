import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { customProviderService } from "../services/custom_provider";

export const customProviderRouter = router({
  list: publicProcedure.query(async () => {
    return customProviderService.list();
  }),

  add: protectedProcedure
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

  toggleEnabled: protectedProcedure
    .input(z.object({ id: z.number(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      return customProviderService.toggleEnabled(input.id, input.enabled);
    }),

  test: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return customProviderService.test(input.id);
    }),

  models: publicProcedure
    .input(z.object({ apiUrl: z.string().url(), apiKey: z.string().min(1) }))
    .query(async ({ input }) => {
      return customProviderService.fetchModels(input.apiUrl, input.apiKey);
    }),
});
