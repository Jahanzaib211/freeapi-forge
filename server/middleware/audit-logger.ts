import { Request, Response, NextFunction } from "express";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import type { AuthRequest } from "./rbac";

export async function auditMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const startTime = Date.now();

  // Capture response end
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: unknown[]) {
    const duration = Date.now() - startTime;

    // Log the request asynchronously (don't block response)
    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode;
    const userId = req.userId || null;
    const tenantId = req.tenantId || null;

    // Only log non-health-check requests
    if (path !== "/health" && !path.startsWith("/api/health")) {
      logAuditEvent(userId, tenantId, `${method} ${path}`, JSON.stringify({
        statusCode,
        duration,
        ip: req.ip,
        userAgent: req.headers["user-agent"]?.slice(0, 100),
      })).catch(() => {});
    }

    return originalEnd.apply(this, args);
  } as typeof res.end;

  next();
}

export async function logAuditEvent(
  userId: number | null,
  tenantId: number | null,
  action: string,
  details?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(auditLogs).values({
      userId,
      tenantId,
      action,
      details,
    });
  } catch (err) {
    console.error("[AuditLogger] Failed to log event:", err);
  }
}
