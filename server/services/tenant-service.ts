import { eq, and, count } from "drizzle-orm";
import { getDb } from "../db";
import { tenants, tenantUsers, providers, teams } from "../../drizzle/schema";
import type { CreateTenantInput, UpdateTenantInput, TenantWithStats } from "../../shared/types/tenant";

export class TenantService {
  async createTenant(input: CreateTenantInput): Promise<TenantWithStats> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check slug uniqueness
    const existing = await db.select().from(tenants).where(eq(tenants.slug, input.slug)).limit(1);
    if (existing.length > 0) {
      throw new Error(`Tenant slug "${input.slug}" already exists`);
    }

    const result = await db.insert(tenants).values({
      name: input.name,
      slug: input.slug,
      ownerId: input.ownerId,
      status: "active",
      monthlyBudgetUsd: input.monthlyBudgetUsd ?? 100,
      maxProviders: input.maxProviders ?? 10,
      maxModels: input.maxModels ?? 50,
    }).returning();

    const tenant = result[0];

    // Add owner as tenant user
    await db.insert(tenantUsers).values({
      tenantId: tenant.id,
      userId: input.ownerId,
      role: "owner",
    });

    return this.toTenantWithStats(tenant);
  }

  async getTenant(id: number): Promise<TenantWithStats | null> {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (result.length === 0) return null;

    return this.toTenantWithStats(result[0]);
  }

  async getTenantBySlug(slug: string): Promise<TenantWithStats | null> {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (result.length === 0) return null;

    return this.toTenantWithStats(result[0]);
  }

  async updateTenant(id: number, updates: UpdateTenantInput): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.monthlyBudgetUsd !== undefined) updateData.monthlyBudgetUsd = updates.monthlyBudgetUsd;
    if (updates.maxProviders !== undefined) updateData.maxProviders = updates.maxProviders;
    if (updates.maxModels !== undefined) updateData.maxModels = updates.maxModels;
    if (updates.status !== undefined) updateData.status = updates.status;

    await db.update(tenants).set(updateData).where(eq(tenants.id, id));
  }

  async deleteTenant(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Soft delete — set status to terminated
    await db.update(tenants).set({ status: "terminated", updatedAt: new Date() }).where(eq(tenants.id, id));
  }

  async suspendTenant(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(tenants).set({ status: "suspended", updatedAt: new Date() }).where(eq(tenants.id, id));
  }

  async listTenants(ownerId?: number): Promise<TenantWithStats[]> {
    const db = await getDb();
    if (!db) return [];

    let results;
    if (ownerId) {
      results = await db.select().from(tenants).where(eq(tenants.ownerId, ownerId));
    } else {
      results = await db.select().from(tenants);
    }

    const stats = await Promise.all(results.map(t => this.toTenantWithStats(t))); return stats;
  }

  async addUserToTenant(tenantId: number, userId: number, role: string = "member"): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if already a member
    const existing = await db.select().from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      // Update role
      await db.update(tenantUsers)
        .set({ role: role as "owner" | "admin" | "member" | "viewer" })
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)));
    } else {
      await db.insert(tenantUsers).values({ tenantId, userId, role: role as "owner" | "admin" | "member" | "viewer" });
    }
  }

  async removeUserFromTenant(tenantId: number, userId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.delete(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)));
  }

  async getTenantUsers(tenantId: number): Promise<Array<{ userId: number; role: string; joinedAt: Date }>> {
    const db = await getDb();
    if (!db) return [];

    return await db.select({
      userId: tenantUsers.userId,
      role: tenantUsers.role,
      joinedAt: tenantUsers.joinedAt,
    }).from(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));
  }

  async getUserTenants(userId: number): Promise<TenantWithStats[]> {
    const db = await getDb();
    if (!db) return [];

    const memberships = await db.select().from(tenantUsers).where(eq(tenantUsers.userId, userId));
    const tenantIds = memberships.map(m => m.tenantId);

    if (tenantIds.length === 0) return [];

    const results = await db.select().from(tenants);
    const filtered = results.filter(t => tenantIds.includes(t.id));
    const stats = await Promise.all(filtered.map(t => this.toTenantWithStats(t)));
    return stats;
  }

  private async toTenantWithStats(tenant: typeof tenants.$inferSelect): Promise<TenantWithStats> {
    const db = await getDb();
    let memberCount = 0;
    let providerCount = 0;

    if (db) {
      try {
        const memberResult = await db.select({ count: count() }).from(tenantUsers).where(eq(tenantUsers.tenantId, tenant.id));
        memberCount = Number(memberResult[0]?.count ?? 0);

        const providerResult = await db.select({ count: count() }).from(providers).where(eq(providers.tenantId, tenant.id));
        providerCount = Number(providerResult[0]?.count ?? 0);
      } catch {
        // Ignore errors during stats gathering
      }
    }

    return {
      ...tenant,
      memberCount,
      providerCount,
      modelCount: 0,
    };
  }
}

export const tenantService = new TenantService();
