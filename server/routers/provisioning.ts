import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { tenantService } from "../services/tenant-service";

export const provisioningRouter = router({
  createTenant: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      slug: z.string().min(1).max(128).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
      monthlyBudgetUsd: z.number().min(0).optional(),
      maxProviders: z.number().min(1).optional(),
      maxModels: z.number().min(1).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenant = await tenantService.createTenant({
        ...input,
        ownerId: ctx.user?.id || 0,
      });
      return tenant;
    }),

  getTenant: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return tenantService.getTenant(input.id);
    }),

  getTenantBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return tenantService.getTenantBySlug(input.slug);
    }),

  listTenants: adminProcedure.query(async ({ ctx }) => {
    return tenantService.listTenants();
  }),

  updateTenant: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      monthlyBudgetUsd: z.number().min(0).optional(),
      maxProviders: z.number().min(1).optional(),
      maxModels: z.number().min(1).optional(),
      status: z.enum(["active", "provisioning", "terminated", "suspended"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await tenantService.updateTenant(id, updates);
      return { success: true };
    }),

  deleteTenant: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await tenantService.deleteTenant(input.id);
      return { success: true };
    }),

  suspendTenant: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await tenantService.suspendTenant(input.id);
      return { success: true };
    }),

  addUserToTenant: adminProcedure
    .input(z.object({
      tenantId: z.number(),
      userId: z.number(),
      role: z.enum(["owner", "admin", "member", "viewer"]).default("member"),
    }))
    .mutation(async ({ input }) => {
      await tenantService.addUserToTenant(input.tenantId, input.userId, input.role);
      return { success: true };
    }),

  removeUserFromTenant: adminProcedure
    .input(z.object({
      tenantId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await tenantService.removeUserFromTenant(input.tenantId, input.userId);
      return { success: true };
    }),

  getTenantUsers: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      return tenantService.getTenantUsers(input.tenantId);
    }),

  getUserTenants: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Not authenticated");
    return tenantService.getUserTenants(ctx.user.id);
  }),
});
