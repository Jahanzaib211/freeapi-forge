import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { promptLibrary } from "../../drizzle/schema";
import { eq, like, desc, and, sql } from "drizzle-orm";

export const promptRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      const conditions = [];
      if (input.category) {
        conditions.push(eq(promptLibrary.category, input.category));
      }
      if (input.search) {
        conditions.push(
          sql`(${promptLibrary.name} ILIKE ${"%" + input.search + "%"} OR ${promptLibrary.content} ILIKE ${"%" + input.search + "%"})`
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(promptLibrary)
        .where(where)
        .orderBy(desc(promptLibrary.updatedAt))
        .limit(input.limit)
        .offset(input.offset);

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(promptLibrary)
        .where(where);

      return {
        prompts: results,
        total: total[0]?.count || 0,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      const [prompt] = await db
        .select()
        .from(promptLibrary)
        .where(eq(promptLibrary.id, input.id));

      if (!prompt) throw new Error("Prompt not found");
      return prompt;
    }),

  versions: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      const results = await db
        .select()
        .from(promptLibrary)
        .where(eq(promptLibrary.name, input.name))
        .orderBy(desc(promptLibrary.version));

      return results;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        content: z.string().min(1),
        category: z.string().default("general"),
        tags: z.array(z.string()).optional(),
        forkedFrom: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      const maxVersion = await db
        .select({ max: sql<number>`COALESCE(MAX(${promptLibrary.version}), 0)` })
        .from(promptLibrary)
        .where(eq(promptLibrary.name, input.name));

      const newVersion = (maxVersion[0]?.max || 0) + 1;

      const [created] = await db
        .insert(promptLibrary)
        .values({
          name: input.name,
          content: input.content,
          category: input.category,
          tags: input.tags,
          version: newVersion,
          forkedFrom: input.forkedFrom,
          createdBy: ctx.user?.id,
        })
        .returning();

      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string().min(1).optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      const [existing] = await db
        .select()
        .from(promptLibrary)
        .where(eq(promptLibrary.id, input.id));

      if (!existing) throw new Error("Prompt not found");

      const [created] = await db
        .insert(promptLibrary)
        .values({
          name: existing.name,
          content: input.content ?? existing.content,
          category: input.category ?? existing.category,
          tags: input.tags ?? existing.tags,
          version: existing.version + 1,
          forkedFrom: existing.forkedFrom,
          createdBy: existing.createdBy,
        })
        .returning();

      return created;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      await db.delete(promptLibrary).where(eq(promptLibrary.id, input.id));
      return { success: true };
    }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      const conditions = [
        sql`(${promptLibrary.name} ILIKE ${"%" + input.query + "%"} OR ${promptLibrary.content} ILIKE ${"%" + input.query + "%"} OR ${promptLibrary.tags}::text ILIKE ${"%" + input.query + "%"})`,
      ];

      if (input.category) {
        conditions.push(eq(promptLibrary.category, input.category));
      }

      const results = await db
        .select()
        .from(promptLibrary)
        .where(and(...conditions))
        .orderBy(desc(promptLibrary.updatedAt))
        .limit(20);

      return results;
    }),
});
