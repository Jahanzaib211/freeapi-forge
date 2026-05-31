import { Request, Response, NextFunction } from "express";
import { getDb } from "../db";
import { tenants, tenantUsers } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface TenantRequest extends Request {
  tenantId?: number;
  tenantSlug?: string;
  tenantRole?: string;
}

export async function tenantResolver(req: TenantRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Check X-Tenant-Id header
    const tenantIdHeader = req.headers["x-tenant-id"] as string | undefined;
    if (tenantIdHeader) {
      const tenantId = parseInt(tenantIdHeader, 10);
      if (!isNaN(tenantId)) {
        req.tenantId = tenantId;
        return next();
      }
    }

    // 2. Check X-Tenant-Slug header
    const tenantSlugHeader = req.headers["x-tenant-slug"] as string | undefined;
    if (tenantSlugHeader) {
      const db = await getDb();
      if (db) {
        const result = await db.select().from(tenants).where(eq(tenants.slug, tenantSlugHeader)).limit(1);
        if (result.length > 0) {
          req.tenantId = result[0].id;
          req.tenantSlug = result[0].slug;
          return next();
        }
      }
    }

    // 3. Check subdomain pattern
    const host = req.headers.host || "";
    const subdomain = host.split(".")[0];
    if (subdomain && subdomain !== "localhost" && subdomain !== "127" && !subdomain.match(/^\d+$/)) {
      const db = await getDb();
      if (db) {
        const result = await db.select().from(tenants).where(eq(tenants.slug, subdomain)).limit(1);
        if (result.length > 0) {
          req.tenantId = result[0].id;
          req.tenantSlug = result[0].slug;
          return next();
        }
      }
    }

    // 4. No tenant resolved — default to tenant 1 (admin)
    req.tenantId = 1;
    next();
  } catch (err) {
    console.error("[TenantResolver] Error:", err);
    req.tenantId = 1;
    next();
  }
}

export async function resolveTenantRole(tenantId: number, userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(tenantUsers)
    .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0].role : null;
}
