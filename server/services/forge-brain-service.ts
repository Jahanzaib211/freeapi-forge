import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { memoryNodes, memoryEvents } from "../../drizzle/schema";

const FORGE_NATIVE_TYPES = [
  "provider", "model", "agent", "workflow", "pipeline", "mcp",
  "onboarding", "suggestion", "system", "event",
];

export class ForgeBrainService {

  private validateType(nodeType: string): void {
    if (!FORGE_NATIVE_TYPES.includes(nodeType)) return;
  }

  private parseLinks(content: string): string[] {
    const matches = content.matchAll(/\[\[([^\]]+)\]\]/g);
    return Array.from(matches, (m) => m[1]);
  }

  async createNode(tenantId: number, nodeType: string, slug: string, title: string,
    content: string, frontmatter?: Record<string, any>, tags?: string[], links?: string[]): Promise<any> {
    this.validateType(nodeType);
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const filePath = `${nodeType}s/${slug}.md`;
    const outboundLinks = links || this.parseLinks(content);
    const fmStr = frontmatter ? JSON.stringify(frontmatter) : null;
    const tagsStr = tags ? JSON.stringify(tags) : null;
    const backlinks: string[] = [];

    // Insert or update node
    const existing = await db.select({ id: memoryNodes.id }).from(memoryNodes)
      .where(and(eq(memoryNodes.tenantId, tenantId), eq(memoryNodes.slug, slug)))
      .limit(1);

    let nodeId: number;
    if (existing.length > 0) {
      await db.update(memoryNodes).set({
        title, content, filePath, frontmatter: fmStr, outboundLinks: JSON.stringify(outboundLinks),
        tags: tagsStr, updatedAt: new Date(),
      }).where(eq(memoryNodes.id, existing[0].id));
      nodeId = existing[0].id;
    } else {
      const result = await db.insert(memoryNodes).values({
        tenantId, nodeType, slug, title, content, filePath,
        frontmatter: fmStr, outboundLinks: JSON.stringify(outboundLinks),
        backlinks: JSON.stringify(backlinks), tags: tagsStr, status: "active", version: 1,
      }).returning({ id: memoryNodes.id });
      nodeId = result[0].id;
    }

    // Create event
    await db.insert(memoryEvents).values({
      tenantId, nodeSlug: slug, eventType: "created",
      eventData: JSON.stringify({ nodeType, slug, title }),
      source: "system",
    });

    // Update backlinks on referenced nodes
    for (const targetSlug of outboundLinks) {
      const target = await db.select({ id: memoryNodes.id, backlinks: memoryNodes.backlinks })
        .from(memoryNodes)
        .where(and(eq(memoryNodes.tenantId, tenantId), eq(memoryNodes.slug, targetSlug)))
        .limit(1);
      if (target.length > 0) {
        const bls: string[] = JSON.parse(target[0].backlinks || "[]");
        if (!bls.includes(slug)) {
          bls.push(slug);
          await db.update(memoryNodes).set({ backlinks: JSON.stringify(bls) })
            .where(eq(memoryNodes.id, target[0].id));
        }
      }
    }

    return { id: nodeId, slug, title, nodeType, filePath };
  }

  async updateNode(tenantId: number, nodeType: string, slug: string, updates: {
    title?: string; content?: string; frontmatter?: Record<string, any>;
    tags?: string[]; status?: string;
  }): Promise<any> {
    this.validateType(nodeType);
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existing = await db.select().from(memoryNodes)
      .where(and(eq(memoryNodes.tenantId, tenantId), eq(memoryNodes.slug, slug)))
      .limit(1).then(r => r[0] || null);
    if (!existing) throw new Error("Node not found");

    const setData: Record<string, any> = { updatedAt: new Date() };
    if (updates.title) setData.title = updates.title;
    if (updates.content) {
      setData.content = updates.content;
      setData.outboundLinks = JSON.stringify(this.parseLinks(updates.content));
    }
    if (updates.frontmatter) setData.frontmatter = JSON.stringify(updates.frontmatter);
    if (updates.tags) setData.tags = JSON.stringify(updates.tags);
    if (updates.status) setData.status = updates.status;
    setData.version = existing.version + 1;

    await db.update(memoryNodes).set(setData)
      .where(eq(memoryNodes.id, existing.id));

    await db.insert(memoryEvents).values({
      tenantId, nodeSlug: slug, eventType: "updated",
      eventData: JSON.stringify({ fields: Object.keys(updates) }),
      source: "system",
    });

    return { slug, title: updates.title || existing.title, nodeType: existing.nodeType };
  }

  async archiveNode(tenantId: number, nodeType: string, slug: string): Promise<void> {
    this.validateType(nodeType);
    const db = await getDb();
    if (!db) return;
    await db.update(memoryNodes).set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(memoryNodes.tenantId, tenantId), eq(memoryNodes.slug, slug)));

    await db.insert(memoryEvents).values({
      tenantId, nodeSlug: slug, eventType: "archived",
      eventData: JSON.stringify({ reason: "manual" }), source: "system",
    });
  }

  async getNode(tenantId: number, nodeType: string, slug: string): Promise<any> {
    const db = await getDb();
    if (!db) return null;
    return db.select().from(memoryNodes)
      .where(and(eq(memoryNodes.tenantId, tenantId), eq(memoryNodes.slug, slug)))
      .limit(1).then(r => r[0] || null);
  }

  async listNodes(tenantId: number, options?: {
    nodeType?: string; tags?: string[]; status?: string; search?: string;
    page?: number; perPage?: number;
  }): Promise<{ items: any[]; total: number }> {
    const db = await getDb();
    if (!db) return { items: [], total: 0 };
    const conditions: any[] = [eq(memoryNodes.tenantId, tenantId)];
    if (options?.nodeType) conditions.push(eq(memoryNodes.nodeType, options.nodeType));
    if (options?.status) conditions.push(eq(memoryNodes.status, options.status));
    const page = options?.page || 1;
    const perPage = options?.perPage || 50;
    const offset = (page - 1) * perPage;

    const query = db.select().from(memoryNodes).where(and(...conditions))
      .orderBy(desc(memoryNodes.updatedAt)).limit(perPage).offset(offset);
    const countQuery = db.select({ c: sql<number>`count(*)` }).from(memoryNodes).where(and(...conditions));

    const [items, totalResult] = await Promise.all([query, countQuery]);
    return { items, total: Number(totalResult[0]?.c || 0) };
  }

  async searchNodes(tenantId: number, query: string, nodeType?: string): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];
    const conditions: any[] = [eq(memoryNodes.tenantId, tenantId)];
    if (nodeType) conditions.push(eq(memoryNodes.nodeType, nodeType));
    conditions.push(sql`(${memoryNodes.title} ILIKE ${`%${query}%`} OR ${memoryNodes.content} ILIKE ${`%${query}%`} OR ${memoryNodes.tags} ILIKE ${`%${query}%`})`);

    return db.select().from(memoryNodes).where(and(...conditions))
      .orderBy(desc(memoryNodes.updatedAt)).limit(30);
  }

  async getGraphData(tenantId: number): Promise<{ nodes: Array<{ id: string; slug: string; type: string; title: string; tags: string[] }>; edges: Array<{ source: string; target: string }> }> {
    const db = await getDb();
    if (!db) return { nodes: [], edges: [] };
    const allNodes = await db.select().from(memoryNodes)
      .where(and(eq(memoryNodes.tenantId, tenantId), eq(memoryNodes.status, "active")));

    const nodes = allNodes.map(n => ({
      id: n.slug, slug: n.slug, type: n.nodeType, title: n.title,
      tags: JSON.parse(n.tags || "[]"),
    }));

    const edges: Array<{ source: string; target: string }> = [];
    const seen = new Set<string>();
    for (const n of allNodes) {
      const links = JSON.parse(n.outboundLinks || "[]") as string[];
      for (const target of links) {
        const key = `${n.slug}->${target}`;
        if (!seen.has(key) && allNodes.some(on => on.slug === target)) {
          seen.add(key);
          edges.push({ source: n.slug, target });
        }
      }
    }
    return { nodes, edges };
  }

  async getBacklinks(tenantId: number, slug: string): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];
    const node = await db.select({ backlinks: memoryNodes.backlinks }).from(memoryNodes)
      .where(and(eq(memoryNodes.tenantId, tenantId), eq(memoryNodes.slug, slug)))
      .limit(1).then(r => r[0]);
    if (!node) return [];
    const slugs: string[] = JSON.parse(node.backlinks || "[]");
    if (slugs.length === 0) return [];
    return db.select().from(memoryNodes)
      .where(and(eq(memoryNodes.tenantId, tenantId), sql`${memoryNodes.slug} IN ${slugs}`));
  }

  async linkNodes(tenantId: number, sourceSlug: string, targetSlug: string): Promise<void> {
    const db = await getDb();
    if (!db) return;
    const source = await db.select().from(memoryNodes)
      .where(and(eq(memoryNodes.tenantId, tenantId), eq(memoryNodes.slug, sourceSlug)))
      .limit(1).then(r => r[0]);
    if (!source) return;

    const newContent = source.content.includes(`[[${targetSlug}]]`)
      ? source.content
      : source.content + `\n- [[${targetSlug}]]`;

    const outboundLinks: string[] = JSON.parse(source.outboundLinks || "[]");
    if (!outboundLinks.includes(targetSlug)) outboundLinks.push(targetSlug);

    await db.update(memoryNodes).set({
      content: newContent, outboundLinks: JSON.stringify(outboundLinks), updatedAt: new Date(),
    }).where(eq(memoryNodes.id, source.id));

    await db.insert(memoryEvents).values({
      tenantId, nodeSlug: sourceSlug, eventType: "linked",
      eventData: JSON.stringify({ linkedTo: targetSlug }), source: "system",
    });
  }

  async unlinkNodes(tenantId: number, sourceSlug: string, targetSlug: string): Promise<void> {
    const db = await getDb();
    if (!db) return;
    const source = await db.select().from(memoryNodes)
      .where(and(eq(memoryNodes.tenantId, tenantId), eq(memoryNodes.slug, sourceSlug)))
      .limit(1).then(r => r[0]);
    if (!source) return;

    const newContent = source.content.replace(new RegExp(`\\[\\[${targetSlug}\\]\\]`, "g"), "");
    const outboundLinks: string[] = JSON.parse(source.outboundLinks || "[]").filter((l: string) => l !== targetSlug);

    await db.update(memoryNodes).set({
      content: newContent, outboundLinks: JSON.stringify(outboundLinks), updatedAt: new Date(),
    }).where(eq(memoryNodes.id, source.id));
  }

  async getVaultStats(tenantId: number): Promise<any> {
    const db = await getDb();
    if (!db) return { totalNodes: 0, byType: {}, totalLinks: 0, avgConnections: 0, lastUpdated: null };
    const all = await db.select().from(memoryNodes).where(eq(memoryNodes.tenantId, tenantId));
    const byType: Record<string, number> = {};
    let totalLinks = 0;
    for (const n of all) {
      byType[n.nodeType] = (byType[n.nodeType] || 0) + 1;
      totalLinks += JSON.parse(n.outboundLinks || "[]").length;
    }
    return {
      totalNodes: all.length, byType, totalLinks,
      avgConnections: all.length > 0 ? Math.round(totalLinks / all.length) : 0,
      lastUpdated: all.length > 0 ? Math.max(...all.map(n => new Date(n.updatedAt).getTime())) : null,
    };
  }

  async getActivityLog(tenantId: number, options?: { nodeType?: string; slug?: string; page?: number; perPage?: number }): Promise<{ items: any[]; total: number }> {
    const db = await getDb();
    if (!db) return { items: [], total: 0 };
    const conditions: any[] = [eq(memoryEvents.tenantId, tenantId)];
    if (options?.slug) conditions.push(eq(memoryEvents.nodeSlug, options.slug));
    const page = options?.page || 1;
    const perPage = options?.perPage || 50;
    const items = await db.select().from(memoryEvents).where(and(...conditions))
      .orderBy(desc(memoryEvents.createdAt)).limit(perPage).offset((page - 1) * perPage);
    const total = Number((await db.select({ c: sql<number>`count(*)` }).from(memoryEvents).where(and(...conditions)))[0]?.c || 0);
    return { items, total };
  }
}

export const forgeBrainService = new ForgeBrainService();
