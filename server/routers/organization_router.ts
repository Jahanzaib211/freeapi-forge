import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, updateBudgetLimit } from "../db";
import { organizations, accessGroups, teams, users, budgetLimits } from "../../drizzle/schema";

export const organizationRouter = router({
  organizations: {
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const result = await db.select().from(organizations);
      return result;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, input.id))
          .limit(1);

        if (result.length === 0) throw new Error("Organization not found");
        return result[0];
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          ownerId: z.number(),
          budgetLimitUsd: z.number().min(0).default(100),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .insert(organizations)
          .values(input)
          .returning({ id: organizations.id });

        return { id: result[0].id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          ownerId: z.number().optional(),
          budgetLimitUsd: z.number().min(0).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, ...updates } = input;
        await db.update(organizations).set(updates).where(eq(organizations.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.delete(organizations).where(eq(organizations.id, input.id));
        return { success: true };
      }),
  },

  accessGroups: {
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const result = await db.select().from(accessGroups);
      return result;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .select()
          .from(accessGroups)
          .where(eq(accessGroups.id, input.id))
          .limit(1);

        if (result.length === 0) throw new Error("Access group not found");
        return result[0];
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          models: z.array(z.string()).optional(),
          mcpServers: z.array(z.string()).optional(),
          agents: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .insert(accessGroups)
          .values(input)
          .returning({ id: accessGroups.id });

        return { id: result[0].id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          models: z.array(z.string()).optional(),
          mcpServers: z.array(z.string()).optional(),
          agents: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, ...updates } = input;
        await db.update(accessGroups).set(updates).where(eq(accessGroups.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.delete(accessGroups).where(eq(accessGroups.id, input.id));
        return { success: true };
      }),
  },

  teams: {
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(teams);
    }),

    listWithBudget: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const monthYear = new Date().toISOString().slice(0, 7);
      const allTeams = await db.select().from(teams);
      const budgets = await db.select().from(budgetLimits).where(eq(budgetLimits.monthYear, monthYear));
      const allUsers = await db.select().from(users);

      return allTeams.map((team) => {
        const budget = budgets.find((b) => b.teamId === team.id);
        const owner = allUsers.find((u) => u.id === team.ownerId);
        return {
          ...team,
          ownerName: owner?.name || owner?.email || "Unknown",
          monthlyLimitUsd: budget?.monthlyLimitUsd ?? team.monthlyBudgetUsd,
          currentSpendUsd: budget ? budget.currentSpendUsd / 1000000 : 0,
        };
      });
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          monthlyBudgetUsd: z.number().min(0).default(10),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .insert(teams)
          .values({
            name: input.name,
            ownerId: ctx.user?.id ?? 1,
            monthlyBudgetUsd: input.monthlyBudgetUsd,
          })
          .returning({ id: teams.id });

        return { id: result[0].id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.delete(teams).where(eq(teams.id, input.id));
        return { success: true };
      }),
  },

  users: {
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(users);
    }),
  },

  budgets: {
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const monthYear = new Date().toISOString().slice(0, 7);
      const allTeams = await db.select().from(teams);
      const budgets = await db.select().from(budgetLimits).where(eq(budgetLimits.monthYear, monthYear));

      return allTeams.map((team) => {
        const budget = budgets.find((b) => b.teamId === team.id);
        return {
          teamId: team.id,
          teamName: team.name,
          monthlyLimitUsd: budget?.monthlyLimitUsd ?? team.monthlyBudgetUsd,
          currentSpendUsd: budget ? budget.currentSpendUsd / 1000000 : 0,
          monthYear,
        };
      });
    }),

    updateLimit: protectedProcedure
      .input(
        z.object({
          teamId: z.number(),
          monthlyLimitUsd: z.number().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const monthYear = new Date().toISOString().slice(0, 7);
        await updateBudgetLimit(input.teamId, monthYear, input.monthlyLimitUsd);
        return { success: true };
      }),
  },
});
