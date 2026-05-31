import os from "os";
import { getDb } from "../db";
import { systemEvents } from "../../drizzle/schema";
import { eq, and, desc, sql, like, count } from "drizzle-orm";

export class GuardService {
  async getSystemMetrics(): Promise<any> {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpu: {
        loadAvg: os.loadavg(),
        cores: os.cpus().length,
      },
      memory: {
        total: totalMem,
        free: freeMem,
        usedPercent: totalMem > 0 ? Math.round((usedMem / totalMem) * 10000) / 100 : 0,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      pid: process.pid,
    };
  }

  async getAuditTrail(
    tenantId: number,
    options?: { action?: string; userId?: number; page?: number; perPage?: number }
  ): Promise<{ items: any[]; total: number }> {
    const db = await getDb();
    if (!db) return { items: [], total: 0 };

    const page = options?.page || 1;
    const perPage = options?.perPage || 50;
    const offset = (page - 1) * perPage;

    const conditions = [eq(systemEvents.tenantId, tenantId)];

    if (options?.action) {
      conditions.push(eq(systemEvents.source, options.action));
    }

    if (options?.userId) {
      conditions.push(like(systemEvents.message, `%userId:${options.userId}%`));
    }

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(systemEvents)
        .where(and(...conditions))
        .orderBy(desc(systemEvents.createdAt))
        .limit(perPage)
        .offset(offset),
      db
        .select({ total: count() })
        .from(systemEvents)
        .where(and(...conditions)),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        timestamp: e.createdAt,
        action: e.source,
        level: e.level,
        message: e.message,
        details: e.metadata,
        stackTrace: e.stackTrace,
      })),
      total: totalResult[0]?.total ?? 0,
    };
  }

  async runDiagnostics(tenantId: number): Promise<any> {
    const services: { name: string; status: string; latencyMs: number }[] = [];
    let postgresOk = false;
    let postgresLatency = 0;
    let redisOk = false;
    let redisLatency = 0;

    try {
      const db = await getDb();
      if (db) {
        const start = Date.now();
        await db.execute(sql`SELECT 1`);
        postgresLatency = Date.now() - start;
        postgresOk = true;
      }
    } catch {
      postgresOk = false;
    }

    try {
      const { Redis } = await import("ioredis");
      const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379/1";
      const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 5000 });
      const start = Date.now();
      await redis.ping();
      redisLatency = Date.now() - start;
      redisOk = true;
      redis.disconnect();
    } catch {
      redisOk = false;
    }

    try {
      const start = Date.now();
      await getDb();
      const apiLatency = Date.now() - start;
      services.push({ name: "API Server", status: "ok", latencyMs: apiLatency });
    } catch {
      services.push({ name: "API Server", status: "down", latencyMs: 0 });
    }

    return {
      postgres: { ok: postgresOk, latencyMs: postgresLatency },
      redis: { ok: redisOk, latencyMs: redisLatency },
      services,
    };
  }

  async getUptimeHistory(): Promise<any[]> {
    return [
      {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    ];
  }
}

export const guardService = new GuardService();
