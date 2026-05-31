import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { skillManager } from "../services/skill_manager";

export const skillRouter = router({
  list: protectedProcedure.query(async () => {
    const skills = await skillManager.listSkills();
    return skills;
  }),

  get: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const skill = await skillManager.getSkillByName(input.name);
      if (!skill) throw new Error("Skill not found");
      return skill;
    }),

  scan: protectedProcedure.query(async () => {
    const skills = await skillManager.scanSkills();
    return skills;
  }),

  sync: protectedProcedure.mutation(async () => {
    const count = await skillManager.syncToDatabase();
    return { synced: count };
  }),

  execute: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        args: z.record(z.string(), z.string()).default({}),
      })
    )
    .mutation(async ({ input }) => {
      const result = await skillManager.executeSkill(input.name, input.args);
      return result;
    }),

  enable: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      const success = await skillManager.enableSkill(input.name);
      return { success };
    }),

  disable: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      const success = await skillManager.disableSkill(input.name);
      return { success };
    }),

  delete: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      const success = await skillManager.deleteSkill(input.name);
      return { success };
    }),
});
