import { eq, and, desc, sql, ilike, or, count } from "drizzle-orm";
import { getDb } from "../db";
import { mcpRegistry, mcpUsageLog, mcpReviews, subscriptionPlans, tenantSubscriptions, mcpServers } from "../../drizzle/schema";
import { eventBus } from "./event-bus";

const TIER_MAP: Record<string, number> = { free: 10, pro: 30, enterprise: 999 };
const CALL_LIMIT_MAP: Record<string, number> = { free: 100, pro: 10000, enterprise: 100000 };

export class McpExplorerService {
  // ─── DISCOVER / BROWSE ─────────────────────────────────────────────────────
  async listMcps(tenantId: number, options?: {
    query?: string; category?: string; tier?: string; sort?: string; limit?: number; offset?: number;
  }): Promise<{ items: any[]; total: number }> {
    const db = await getDb();
    if (!db) return { items: [], total: 0 };
    const conditions = [eq(mcpRegistry.status, "active")];
    if (options?.query) conditions.push(sql`${mcpRegistry.name} ILIKE ${`%${options.query}%`} OR ${mcpRegistry.description} ILIKE ${`%${options.query}%`}`);
    if (options?.category) conditions.push(eq(mcpRegistry.category, options.category as any));
    if (options?.tier) conditions.push(eq(mcpRegistry.tier, options.tier as any));
    const items = await db.select().from(mcpRegistry).where(and(...conditions))
      .orderBy(options?.sort === "rating" ? desc(mcpRegistry.rating) : desc(mcpRegistry.installCount))
      .limit(options?.limit || 50).offset(options?.offset || 0);
    const total = (await db.select({ c: count() }).from(mcpRegistry).where(and(...conditions)))[0]?.c || 0;
    const installed = await db.select({ id: mcpServers.id, registryId: mcpServers.id }).from(mcpServers).where(eq(mcpServers.tenantId, tenantId));
    return { items: items.map(m => ({ ...m, installed: installed.some(i => i.registryId === m.id) })), total };
  }

  async getFeatured(tenantId: number): Promise<any[]> {
    const db = await getDb(); if (!db) return [];
    const items = await db.select().from(mcpRegistry).where(and(eq(mcpRegistry.featured, 1), eq(mcpRegistry.status, "active"))).limit(4);
    const installed = await db.select().from(mcpServers).where(eq(mcpServers.tenantId, tenantId));
    return items.map(m => ({ ...m, installed: installed.some(i => i.id === m.id) }));
  }

  async getDetail(slug: string, tenantId: number): Promise<any> {
    const db = await getDb(); if (!db) return null;
    const item = await db.select().from(mcpRegistry).where(eq(mcpRegistry.slug, slug)).limit(1).then(r => r[0] || null);
    if (!item) return null;
    const installed = await db.select().from(mcpServers).where(and(eq(mcpServers.tenantId, tenantId), eq(mcpServers.id, item.id))).limit(1);
    const reviews = await db.select({ rating: mcpReviews.rating, title: mcpReviews.title, review: mcpReviews.review, createdAt: mcpReviews.createdAt })
      .from(mcpReviews).where(eq(mcpReviews.mcpServerId, item.id)).orderBy(desc(mcpReviews.createdAt)).limit(10);
    const usage = await db.select({ c: count(), s: sql<number>`SUM(CASE WHEN success=1 THEN 1 ELSE 0 END)` })
      .from(mcpUsageLog).where(eq(mcpUsageLog.mcpServerId, item.id)).then(r => r[0]);
    return { ...item, installed: installed.length > 0, installRecord: installed[0] || null, reviews, usageStats: { totalCalls: Number(usage?.c || 0), successRate: usage?.c ? (Number(usage.s || 0) / Number(usage.c) * 100) : 0 } };
  }

  // ─── INSTALL / UNINSTALL ──────────────────────────────────────────────────
  async installMcp(tenantId: number, userId: number, registryId: number, config?: string): Promise<void> {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    // Check subscription limit
    const plan = await this.getCurrentPlan(tenantId);
    const installed = await db.select({ c: count() }).from(mcpServers).where(eq(mcpServers.tenantId, tenantId));
    if (Number(installed[0]?.c || 0) >= plan.maxMcpServers) throw new Error(`Plan limit reached: max ${plan.maxMcpServers} MCP servers`);
    const registry = await db.select().from(mcpRegistry).where(eq(mcpRegistry.id, registryId)).limit(1).then(r => r[0]);
    if (!registry) throw new Error("MCP server not found in registry");
    const exists = await db.select().from(mcpServers).where(and(eq(mcpServers.tenantId, tenantId), eq(mcpServers.name, registry.name))).limit(1);
    if (exists.length > 0) throw new Error("Already installed");
    await db.insert(mcpServers).values({ name: registry.name, transport: "sse", url: "", tenantId, authConfig: config || null, toolCount: registry.tools ? JSON.parse(registry.tools).length : 0, status: "disconnected" });
    await db.update(mcpRegistry).set({ installCount: sql`${mcpRegistry.installCount} + 1` }).where(eq(mcpRegistry.id, registryId));
    eventBus.publish("mcp.installed" as any, { tenantId, registryId, name: registry.name }, tenantId, userId);
  }

  async uninstallMcp(tenantId: number, serverId: number): Promise<void> {
    const db = await getDb(); if (!db) return;
    await db.delete(mcpServers).where(and(eq(mcpServers.id, serverId), eq(mcpServers.tenantId, tenantId)));
  }

  async getInstalled(tenantId: number): Promise<any[]> {
    const db = await getDb(); if (!db) return [];
    return db.select().from(mcpServers).where(eq(mcpServers.tenantId, tenantId)).orderBy(mcpServers.name);
  }

  async testConnection(serverId: number, tenantId: number): Promise<{ ok: boolean; tools: number; latency: number }> {
    const db = await getDb(); if (!db) return { ok: false, tools: 0, latency: 0 };
    const start = Date.now();
    try {
      const server = await db.select().from(mcpServers).where(and(eq(mcpServers.id, serverId), eq(mcpServers.tenantId, tenantId))).limit(1).then(r => r[0]);
      if (!server || !server.url) return { ok: false, tools: 0, latency: 0 };
      const resp = await fetch(`${server.url}/tools`, { signal: AbortSignal.timeout(5000) });
      const tools = resp.ok ? (await resp.json()).tools?.length || 0 : 0;
      await db.update(mcpServers).set({ status: "connected", toolCount: tools, lastSeen: new Date() }).where(eq(mcpServers.id, serverId));
      return { ok: true, tools, latency: Date.now() - start };
    } catch { return { ok: false, tools: 0, latency: Date.now() - start }; }
  }

  // ─── USAGE TRACKING ────────────────────────────────────────────────────────
  async logUsage(tenantId: number, userId: number | null, serverId: number, toolName: string, input: any, output: any, duration: number, success: boolean, error?: string, tokens?: number, cost?: number): Promise<void> {
    const db = await getDb(); if (!db) return;
    await db.insert(mcpUsageLog).values({ tenantId, userId, mcpServerId: serverId, toolName, inputParams: JSON.stringify(input), outputResult: JSON.stringify(output), durationMs: duration, success: success ? 1 : 0, errorMessage: error, tokensUsed: tokens || 0, costUsd: Math.round((cost || 0) * 1_000_000) });
  }

  async getUsageStats(tenantId: number, serverId: number): Promise<any> {
    const db = await getDb(); if (!db) return { calls: 0, successRate: 0, avgLatency: 0 };
    const result = await db.select({ c: count(), successCount: sql<number>`SUM(CASE WHEN success=1 THEN 1 ELSE 0 END)`, avgLat: sql<number>`AVG(durationMs)` })
      .from(mcpUsageLog).where(and(eq(mcpUsageLog.tenantId, tenantId), eq(mcpUsageLog.mcpServerId, serverId)));
    const r = result[0];
    return { calls: Number(r.c || 0), successRate: r.c ? (Number(r.successCount || 0) / Number(r.c) * 100) : 0, avgLatency: Math.round(Number(r.avgLat || 0)) };
  }

  async getDailyUsage(tenantId: number, serverId: number): Promise<number> {
    const db = await getDb(); if (!db) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const result = await db.select({ c: count() }).from(mcpUsageLog)
      .where(and(eq(mcpUsageLog.tenantId, tenantId), eq(mcpUsageLog.mcpServerId, serverId), sql`"createdAt" >= ${today.toISOString()}`));
    return Number(result[0]?.c || 0);
  }

  // ─── REVIEWS ──────────────────────────────────────────────────────────────
  async rateMcp(tenantId: number, userId: number, mcpServerId: number, rating: number, title?: string, review?: string): Promise<void> {
    const db = await getDb(); if (!db) return;
    await db.insert(mcpReviews).values({ tenantId, userId, mcpServerId, rating, title, review });
    const avg = await db.select({ a: sql<number>`AVG(rating)` }).from(mcpReviews).where(eq(mcpReviews.mcpServerId, mcpServerId)).then(r => Math.round(Number(r[0]?.a || 0)));
    const cnt = await db.select({ c: count() }).from(mcpReviews).where(eq(mcpReviews.mcpServerId, mcpServerId)).then(r => Number(r[0]?.c || 0));
    await db.update(mcpRegistry).set({ rating: avg, reviewCount: cnt }).where(eq(mcpRegistry.id, mcpServerId));
  }

  // ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────
  async getCurrentPlan(tenantId: number): Promise<{ name: string; price: number; maxMcpServers: number; maxToolCallsPerDay: number }> {
    const db = await getDb(); if (!db) return { name: "free", price: 0, maxMcpServers: 10, maxToolCallsPerDay: 100 };
    const sub = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, tenantId)).limit(1).then(r => r[0]);
    if (sub) {
      const plan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, sub.planId)).limit(1).then(r => r[0]);
      if (plan) return { name: plan.name, price: plan.priceMonthlyUsd, maxMcpServers: plan.maxMcpServers, maxToolCallsPerDay: plan.maxToolCallsPerDay };
    }
    // Default free plan
    const freePlan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, "free")).limit(1).then(r => r[0]);
    if (freePlan) return { name: freePlan.name, price: freePlan.priceMonthlyUsd, maxMcpServers: freePlan.maxMcpServers, maxToolCallsPerDay: freePlan.maxToolCallsPerDay };
    return { name: "free", price: 0, maxMcpServers: 10, maxToolCallsPerDay: 100 };
  }

  async upgradePlan(tenantId: number, planId: number): Promise<void> {
    const db = await getDb(); if (!db) return;
    const plan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1).then(r => r[0]);
    if (!plan) throw new Error("Plan not found");
    const existing = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, tenantId)).limit(1);
    if (existing.length > 0) {
      await db.update(tenantSubscriptions).set({ planId, status: "active", updatedAt: new Date() }).where(eq(tenantSubscriptions.tenantId, tenantId));
    } else {
      await db.insert(tenantSubscriptions).values({ tenantId, planId, status: "active", currentPeriodStart: new Date() });
    }
  }

  async checkUsageLimit(tenantId: number): Promise<{ used: number; limit: number; remaining: number }> {
    const plan = await this.getCurrentPlan(tenantId);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const db = await getDb(); if (!db) return { used: 0, limit: plan.maxToolCallsPerDay, remaining: plan.maxToolCallsPerDay };
    const result = await db.select({ c: count() }).from(mcpUsageLog).where(and(eq(mcpUsageLog.tenantId, tenantId), sql`"createdAt" >= ${today.toISOString()}`));
    const used = Number(result[0]?.c || 0);
    return { used, limit: plan.maxToolCallsPerDay, remaining: Math.max(0, plan.maxToolCallsPerDay - used) };
  }

  // ─── CATEGORIES ──────────────────────────────────────────────────────────
  async getCategories(): Promise<{ category: string; count: number }[]> {
    const db = await getDb(); if (!db) return [];
    const cats = await db.select({ category: mcpRegistry.category, count: count() }).from(mcpRegistry)
      .where(eq(mcpRegistry.status, "active")).groupBy(mcpRegistry.category).orderBy(mcpRegistry.category);
    return cats as any[];
  }

  async getPlans(): Promise<any[]> {
    const db = await getDb(); if (!db) return [];
    return db.select().from(subscriptionPlans).orderBy(subscriptionPlans.priceMonthlyUsd);
  }
}

export const mcpExplorerService = new McpExplorerService();
