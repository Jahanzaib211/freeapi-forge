import crypto from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { cacheEntries } from "../../drizzle/schema";

export class SemanticCache {
  private ttlMs: number;

  constructor(ttlMs = 3600000) {
    this.ttlMs = ttlMs;
  }

  getCacheKey(model: string, messages: { role: string; content: string }[], temperature: number): string {
    const normalized = JSON.stringify({ model, messages: messages.map(m => ({ role: m.role, content: m.content })), temperature });
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  async get(cacheKey: string): Promise<string | null> {
    const db = await getDb();
    if (!db) return null;
    try {
      const result = await db.execute(sql`
        SELECT response FROM "cacheEntries"
        WHERE key = ${cacheKey} AND "expiresAt" > NOW()
      `);
      return (result[0] as any)?.response || null;
    } catch {
      return null;
    }
  }

  async set(cacheKey: string, response: string, model: string): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      const expiresAt = new Date(Date.now() + this.ttlMs);
      await db.execute(sql`
        INSERT INTO "cacheEntries" (key, response, model, "expiresAt")
        VALUES (${cacheKey}, ${response}, ${model}, ${expiresAt.toISOString()})
        ON CONFLICT (key) DO UPDATE SET response = ${response}, "expiresAt" = ${expiresAt.toISOString()}
      `);
    } catch {}
  }
}

export const semanticCache = new SemanticCache();
