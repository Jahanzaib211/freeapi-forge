import { eq, and, desc, lte, gte, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, teams, apiKeys, providers, requestHistory, budgetLimits, auditLogs } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Team management
export async function createTeam(name: string, ownerId: number, monthlyBudgetUsd: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(teams).values({
    name,
    ownerId,
    monthlyBudgetUsd,
  });
  return result;
}

export async function getTeamsByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(teams).where(eq(teams.ownerId, ownerId));
}

// API Key management
export async function createApiKey(teamId: number, keyHash: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(apiKeys).values({
    teamId,
    keyHash,
    name,
  });
}

export async function getApiKeyByHash(keyHash: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getApiKeysByTeamId(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(apiKeys)
    .where(and(eq(apiKeys.teamId, teamId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
}

export async function updateApiKeyLastUsed(keyId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyId));
}

export async function revokeApiKey(keyId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, keyId));
}

// Provider management
export async function createProvider(name: string, litellmEndpoint: string, qualityScore: number = 50, latencyMs: number = 500, costPerMToken: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(providers).values({
    name,
    litellmEndpoint,
    qualityScore,
    latencyMs,
    costPerMToken,
  });
}

export async function getAllProviders() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(providers).orderBy(providers.name);
}

export async function getEnabledProviders() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(providers).where(eq(providers.enabled, 1));
}

export async function updateProvider(id: number, updates: Partial<typeof providers.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(providers)
    .set(updates)
    .where(eq(providers.id, id));
}

// Request history
export async function createRequestHistory(id: string, teamId: number, providerId: number | null, taskType: string, inputTokens: number, outputTokens: number, costUsd: number, status: string = 'success', errorMessage?: string) {
  const db = await getDb();
  if (!db) return;
  
  const totalTokens = inputTokens + outputTokens;
  
  await db.insert(requestHistory).values({
    id,
    teamId,
    providerId,
    taskType,
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd: Math.round(costUsd * 1000000), // Store as micro-USD
    status,
    errorMessage,
  });
}

export async function getRequestHistory(teamId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(requestHistory)
    .where(eq(requestHistory.teamId, teamId))
    .orderBy(desc(requestHistory.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getRequestHistoryCount(teamId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(requestHistory)
    .where(eq(requestHistory.teamId, teamId));
  
  return result.length > 0 ? Number(result[0].count) : 0;
}

// Budget management
export async function getBudgetLimit(teamId: number, monthYear: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(budgetLimits)
    .where(and(eq(budgetLimits.teamId, teamId), eq(budgetLimits.monthYear, monthYear)))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getOrCreateBudgetLimit(teamId: number, monthYear: string, monthlyLimitUsd: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let budget = await getBudgetLimit(teamId, monthYear);
  
  if (!budget) {
    await db.insert(budgetLimits).values({
      teamId,
      monthYear,
      monthlyLimitUsd,
      currentSpendUsd: 0,
    });
    
    budget = await getBudgetLimit(teamId, monthYear);
  }
  
  return budget;
}

export async function updateBudgetSpend(teamId: number, monthYear: string, additionalSpendUsd: number) {
  const db = await getDb();
  if (!db) return;
  
  const budget = await getOrCreateBudgetLimit(teamId, monthYear);
  if (!budget) return;
  
  const newSpend = budget.currentSpendUsd + Math.round(additionalSpendUsd * 1000000);
  
  await db.update(budgetLimits)
    .set({ currentSpendUsd: newSpend })
    .where(and(eq(budgetLimits.teamId, teamId), eq(budgetLimits.monthYear, monthYear)));
}

export async function updateBudgetLimit(teamId: number, monthYear: string, monthlyLimitUsd: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(budgetLimits)
    .set({ monthlyLimitUsd })
    .where(and(eq(budgetLimits.teamId, teamId), eq(budgetLimits.monthYear, monthYear)));
}

// Audit logging
export async function createAuditLog(userId: number | null, teamId: number | null, action: string, details?: string) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(auditLogs).values({
    userId,
    teamId,
    action,
    details,
  });
}

export async function closeDb() {
  try {
    if (_db) {
      _db = null;
    }
  } catch {}
}
