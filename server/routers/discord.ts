import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { discordService } from "../services/discord-service";

export const discordRouter = router({
  configure: adminProcedure
    .input(z.object({
      botToken: z.string().min(1),
      guildId: z.string().min(1),
      channelId: z.string().min(1),
      model: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await discordService.configure(tenantId, input.botToken, input.guildId, input.channelId, input.model);
      return { success: true };
    }),

  startBot: adminProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.tenantId || 1;
    const started = await discordService.startBot(tenantId);
    return { success: started };
  }),

  stopBot: adminProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.tenantId || 1;
    await discordService.stopBot(tenantId);
    return { success: true };
  }),

  status: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId || 1;
    const running = await discordService.isRunning(tenantId);
    return { running, tenantId };
  }),
});
