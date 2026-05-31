import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  searchModels,
  getModelDetails,
  getModelFiles,
  checkHardware,
  checkCompatibility,
  pullModel,
  getPullProgress,
  cancelPull,
  getInstalledModels,
} from "../services/huggingface_service";

export const huggingfaceRouter = router({
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => searchModels(input.query)),

  details: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .query(async ({ input }) => getModelDetails(input.modelId)),

  files: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .query(async ({ input }) => getModelFiles(input.modelId)),

  hardware: publicProcedure.query(async () => checkHardware()),

  compatibility: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        modelSizeBytes: z.number().optional(),
        quantization: z.string().optional(),
      })
    )
    .query(async ({ input }) =>
      checkCompatibility(input.modelId, input.modelSizeBytes, input.quantization)
    ),

  pull: protectedProcedure
    .input(
      z.object({
        modelId: z.string(),
        quantization: z.string().optional(),
        filename: z.string().optional(),
      })
    )
    .mutation(async ({ input }) =>
      pullModel(input.modelId, input.quantization, input.filename)
    ),

  progress: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .query(async ({ input }) => getPullProgress(input.modelId)),

  cancelPull: protectedProcedure
    .input(z.object({ modelId: z.string() }))
    .mutation(async ({ input }) => cancelPull(input.modelId)),

  installed: publicProcedure.query(async () => getInstalledModels()),
});
