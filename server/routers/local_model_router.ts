import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { localModelManager } from "../services/local_model_manager";

export const localModelRouter = router({
  list: publicProcedure.query(() => {
    return localModelManager.listModels();
  }),

  active: publicProcedure.query(() => {
    const active = localModelManager.getActiveModel();
    const switching = localModelManager.isSwitching();
    return { active, switching };
  }),

  switch: publicProcedure
    .input(z.object({ model: z.string() }))
    .mutation(async ({ input }) => {
      return localModelManager.switchModel(input.model);
    }),

  gpu: publicProcedure.query(() => {
    const status = localModelManager.getGpuStatus();
    const processes = localModelManager.getGpuProcesses();
    return { status, processes };
  }),
});
