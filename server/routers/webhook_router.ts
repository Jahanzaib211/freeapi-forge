import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { webhooks } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const webhookRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not connected");

    return db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      const [webhook] = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.id, input.id));

      if (!webhook) throw new Error("Webhook not found");
      return webhook;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        url: z.string().url(),
        secret: z.string().optional(),
        events: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      const [created] = await db
        .insert(webhooks)
        .values({
          name: input.name,
          url: input.url,
          secret: input.secret,
          events: input.events,
        })
        .returning();

      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        url: z.string().url().optional(),
        secret: z.string().optional(),
        events: z.array(z.string()).optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.url !== undefined) updates.url = input.url;
      if (input.secret !== undefined) updates.secret = input.secret;
      if (input.events !== undefined) updates.events = input.events;
      if (input.enabled !== undefined) updates.enabled = input.enabled ? 1 : 0;

      await db.update(webhooks).set(updates).where(eq(webhooks.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      await db.delete(webhooks).where(eq(webhooks.id, input.id));
      return { success: true };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      await db
        .update(webhooks)
        .set({ enabled: input.enabled ? 1 : 0 })
        .where(eq(webhooks.id, input.id));
      return { success: true };
    }),
});
