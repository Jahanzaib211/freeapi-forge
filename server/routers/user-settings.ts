import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { settingsService } from "../services/settings-service";

export const settingsRouter = router({
  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return settingsService.getSetting(tenantId, input.key);
    }),

  getByCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return settingsService.getSettingsByCategory(tenantId, input.category);
    }),

  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return settingsService.getAllSettings(tenantId);
    }),

  set: protectedProcedure
    .input(z.object({ key: z.string(), value: z.any(), category: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await settingsService.setSetting(tenantId, input.key, input.value, input.category);
      return { success: true };
    }),

  setBulk: protectedProcedure
    .input(z.object({ settings: z.array(z.object({ key: z.string(), value: z.any(), category: z.string().optional() })) }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await settingsService.setSettingsBulk(tenantId, input.settings);
      return { success: true };
    }),

  reset: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await settingsService.resetSetting(tenantId, input.key);
      return { success: true };
    }),

  resetCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await settingsService.resetCategory(tenantId, input.category);
      return { success: true };
    }),

  resetAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await settingsService.resetAllSettings(tenantId);
      return { success: true };
    }),

  getDefaults: protectedProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(async () => {
      return settingsService.getDefaults();
    }),

  exportConfig: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return settingsService.getAllSettings(tenantId);
    }),
});
