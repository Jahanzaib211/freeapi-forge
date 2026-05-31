import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { virtualKeys } from "../../drizzle/schema";
import { virtualKeyService } from "../services/virtual_key_service";

export const virtualKeyRouter = router({
  list: protectedProcedure
    .input(z.object({ teamId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const keys = await virtualKeyService.listKeys(input?.teamId);
      return keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        teamId: k.teamId,
        budgetLimitUsd: k.budgetLimitUsd,
        rateLimitTPM: k.rateLimitTPM,
        rateLimitRPM: k.rateLimitRPM,
        models: k.models,
        metadata: k.metadata,
        enabled: k.enabled,
        spendUsd: k.spendUsd,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt,
      }));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const key = await virtualKeyService.getKeyById(input.id);
      if (!key) throw new Error("Virtual key not found");
      return {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        teamId: key.teamId,
        budgetLimitUsd: key.budgetLimitUsd,
        rateLimitTPM: key.rateLimitTPM,
        rateLimitRPM: key.rateLimitRPM,
        models: key.models,
        metadata: key.metadata,
        enabled: key.enabled,
        spendUsd: key.spendUsd,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        teamId: z.number().default(1),
        budgetLimitUsd: z.number().min(0).default(10),
        rateLimitTPM: z.number().min(0).default(100000),
        rateLimitRPM: z.number().min(0).default(1000),
        models: z.array(z.string()).optional(),
        metadata: z.string().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await virtualKeyService.createKey(input);
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        budgetLimitUsd: z.number().min(0).optional(),
        rateLimitTPM: z.number().min(0).optional(),
        rateLimitRPM: z.number().min(0).optional(),
        models: z.array(z.string()).optional(),
        metadata: z.string().optional(),
        enabled: z.number().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const success = await virtualKeyService.updateKey(id, updates);
      return { success };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await virtualKeyService.deleteKey(input.id);
      return { success };
    }),
});
