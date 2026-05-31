import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId } from "../db";
import { virtualKeyService } from "../services/virtual_key_service";
import { jwtVerify } from "jose";
import type { AuthRequest } from "../middleware/rbac";
import type { TenantRequest } from "../middleware/tenant-resolver";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "forge-studio-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  userId: number | null;
  tenantId: number;
  userRole: string;
  tenantRole: string | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let userId: number | null = null;
  let tenantId = 1;
  let userRole = "user";
  let tenantRole: string | null = null;

  const authReq = opts.req as AuthRequest;
  const tenantReq = opts.req as TenantRequest;

  // 1. Check if middleware already resolved auth
  if (authReq.userId) {
    userId = authReq.userId;
    tenantId = authReq.tenantId || 1;
    userRole = authReq.userRole || "user";
    tenantRole = authReq.tenantRole || null;

    // Load full user from DB
    try {
      const found = await getUserByOpenId(`email:${authReq.userEmail}`);
      if (found) {
        user = found;
      }
    } catch {
      // User not found by email — try by ID pattern
      try {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (db) {
          const { users } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
          if (result.length > 0) user = result[0];
        }
      } catch {}
    }
  }

  // 2. Try JWT Bearer token directly (if middleware didn't resolve)
  if (!user && !userId) {
    try {
      const authHeader = opts.req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const result = await jwtVerify(token, getJwtSecret());
        const payload = result.payload;
        userId = payload.sub as number;
        tenantId = (payload.tenantId as number) || 1;
        userRole = (payload.role as string) || "user";
        tenantRole = (payload.tenantRole as string) || null;

        const found = await getUserByOpenId(`email:${payload.email}`);
        if (found) user = found;
      }
    } catch {}
  }

  // 3. Try API key auth
  if (!user && !userId) {
    try {
      const apiKey = opts.req.headers["x-api-key"];
      if (apiKey) {
        const validation = await virtualKeyService.validateKey(apiKey as string);
        if (validation.valid && validation.keyRecord) {
          if (validation.keyRecord.teamId) {
            const found = await getUserByOpenId(`team:${validation.keyRecord.teamId}`);
            user = found ?? null;
          }
        }
        // Fall back to dev key in non-production
        if (!user && process.env.NODE_ENV !== "production") {
          const found = await getUserByOpenId("local-dev-user");
          user = found ?? null;
          userId = user?.id ?? null;
          userRole = user?.role ?? "admin";
        }
      }
    } catch {}
  }

  // 4. Try session cookie (dev mode only)
  if (!user && !userId && process.env.NODE_ENV !== "production") {
    try {
      const sessionCookie = opts.req.headers.cookie?.split(";").find(c => c.trim().startsWith("session="));
      if (sessionCookie) {
        const found = await getUserByOpenId("local-dev-user");
        user = found ?? null;
        userId = user?.id ?? null;
        userRole = user?.role ?? "admin";
      }
    } catch {}
  }

  // 5. Resolve tenant from request if not set
  if (tenantReq.tenantId) {
    tenantId = tenantReq.tenantId;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    userId,
    tenantId,
    userRole,
    tenantRole,
  };
}
