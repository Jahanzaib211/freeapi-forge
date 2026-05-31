import { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import type { Role, TenantRole, Resource, Action } from "../../shared/permissions";
import { hasPermission } from "../../shared/permissions";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "forge-studio-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userName?: string;
  userRole?: Role;
  tenantId?: number;
  tenantRole?: TenantRole;
}

export async function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.slice(7);
    const result = await jwtVerify(token, getJwtSecret());
    const payload = result.payload;

    req.userId = payload.sub as number;
    req.userEmail = payload.email as string;
    req.userName = payload.name as string;
    req.userRole = (payload.role as Role) || "user";
    req.tenantId = (payload.tenantId as number) || 1;
    req.tenantRole = (payload.tenantRole as TenantRole) || "member";

    next();
  } catch {
    // Invalid token — continue without auth context
    next();
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requirePermission(resource: Resource, action: Action) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const allowed = hasPermission(
      req.userRole || "viewer",
      req.tenantRole,
      resource,
      action
    );

    if (!allowed) {
      res.status(403).json({
        error: "Permission denied",
        required: { resource, action },
        yourRole: req.userRole,
        tenantRole: req.tenantRole,
      });
      return;
    }

    next();
  };
}
