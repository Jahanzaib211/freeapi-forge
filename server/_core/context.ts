import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId } from "../db";
import { virtualKeyService } from "../services/virtual_key_service";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // 1. Try API key auth first (used by /v1/chat/completions fallback)
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
      }
    }

    // 2. Try session cookie (dev mode only)
    if (!user && process.env.NODE_ENV !== "production") {
      const sessionCookie = opts.req.headers.cookie?.split(";").find(c => c.trim().startsWith("session="));
      if (sessionCookie) {
        const found = await getUserByOpenId("local-dev-user");
        user = found ?? null;
      }
    }
  } catch (error) {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
