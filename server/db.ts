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

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

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

// ─── TEAM MANAGEMENT (tenant-scoped) ─────────────────────────────────────────

export async function createTeam(name: string, ownerId: number, monthlyBudgetUsd: number = 10, tenantId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(teams).values({
    name,
    ownerId,
    tenantId: tenantId ?? null,
    monthlyBudgetUsd,
  });
}

export async function getTeamsByOwnerId(ownerId: number, tenantId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (tenantId) {
    return await db.select().from(teams).where(and(eq(teams.ownerId, ownerId), eq(teams.tenantId, tenantId)));
  }
  return await db.select().from(teams).where(eq(teams.ownerId, ownerId));
}

export async function getTeamsByTenantId(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(teams).where(eq(teams.tenantId, tenantId));
}

// ─── API KEY MANAGEMENT (tenant-scoped) ──────────────────────────────────────

export async function createApiKey(teamId: number, keyHash: string, name: string, tenantId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(apiKeys).values({
    teamId,
    keyHash,
    name,
    tenantId: tenantId ?? null,
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

export async function getApiKeysByTeamId(teamId: number, tenantId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(apiKeys.teamId, teamId), isNull(apiKeys.revokedAt)];
  if (tenantId) conditions.push(eq(apiKeys.tenantId, tenantId));

  return await db.select().from(apiKeys)
    .where(and(...conditions))
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

// ─── PROVIDER MANAGEMENT (tenant-scoped) ─────────────────────────────────────

export async function createProvider(name: string, litellmEndpoint: string, qualityScore: number = 50, latencyMs: number = 500, costPerMToken: number = 100, tenantId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(providers).values({
    name,
    litellmEndpoint,
    qualityScore,
    latencyMs,
    costPerMToken,
    tenantId: tenantId ?? null,
  });
}

export async function getAllProviders(tenantId?: number) {
  const db = await getDb();
  if (!db) return [];

  // Tenant-scoped: return providers belonging to tenant OR global (NULL tenantId)
  if (tenantId) {
    return await db.select().from(providers)
      .where(sql`(${providers.tenantId} = ${tenantId}) OR (${providers.tenantId} IS NULL)`)
      .orderBy(providers.name);
  }
  return await db.select().from(providers).orderBy(providers.name);
}

export async function getEnabledProviders(tenantId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(providers.enabled, 1)];
  if (tenantId) {
    conditions.push(sql`(${providers.tenantId} = ${tenantId}) OR (${providers.tenantId} IS NULL)`);
  }

  return await db.select().from(providers).where(and(...conditions));
}

export async function updateProvider(id: number, updates: Partial<typeof providers.$inferInsert>) {
  const db = await getDb();
  if (!db) return;

  await db.update(providers)
    .set(updates)
    .where(eq(providers.id, id));
}

// ─── REQUEST HISTORY (tenant-scoped) ────────────────────────────────────────

export async function createRequestHistory(
  id: string, teamId: number, providerId: number | null, taskType: string,
  inputTokens: number, outputTokens: number, costUsd: number,
  status: string = 'success', errorMessage?: string, tenantId?: number
) {
  const db = await getDb();
  if (!db) return;

  const totalTokens = inputTokens + outputTokens;

  await db.insert(requestHistory).values({
    id,
    teamId,
    tenantId: tenantId ?? null,
    providerId,
    taskType,
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd: Math.round(costUsd * 1000000),
    status,
    errorMessage,
  });
}

export async function getRequestHistory(teamId: number, limit: number = 50, offset: number = 0, tenantId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(requestHistory.teamId, teamId)];
  if (tenantId) conditions.push(eq(requestHistory.tenantId, tenantId));

  return await db.select().from(requestHistory)
    .where(and(...conditions))
    .orderBy(desc(requestHistory.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getRequestHistoryCount(teamId: number, tenantId?: number) {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [eq(requestHistory.teamId, teamId)];
  if (tenantId) conditions.push(eq(requestHistory.tenantId, tenantId));

  const result = await db.select({ count: sql<number>`count(*)` })
    .from(requestHistory)
    .where(and(...conditions));

  return result.length > 0 ? Number(result[0].count) : 0;
}

// ─── BUDGET MANAGEMENT (tenant-scoped) ───────────────────────────────────────

export async function getBudgetLimit(teamId: number, monthYear: string, tenantId?: number) {
  const db = await getDb();
  if (!db) return null;

  const conditions = [eq(budgetLimits.teamId, teamId), eq(budgetLimits.monthYear, monthYear)];
  if (tenantId) conditions.push(eq(budgetLimits.tenantId, tenantId));

  const result = await db.select().from(budgetLimits)
    .where(and(...conditions))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getOrCreateBudgetLimit(teamId: number, monthYear: string, monthlyLimitUsd: number = 10, tenantId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let budget = await getBudgetLimit(teamId, monthYear, tenantId);

  if (!budget) {
    await db.insert(budgetLimits).values({
      teamId,
      monthYear,
      monthlyLimitUsd,
      currentSpendUsd: 0,
      tenantId: tenantId ?? null,
    });

    budget = await getBudgetLimit(teamId, monthYear, tenantId);
  }

  return budget;
}

export async function updateBudgetSpend(teamId: number, monthYear: string, additionalSpendUsd: number, tenantId?: number) {
  const db = await getDb();
  if (!db) return;

  const budget = await getOrCreateBudgetLimit(teamId, monthYear, 10, tenantId);
  if (!budget) return;

  const newSpend = budget.currentSpendUsd + Math.round(additionalSpendUsd * 1000000);

  await db.update(budgetLimits)
    .set({ currentSpendUsd: newSpend })
    .where(and(eq(budgetLimits.teamId, teamId), eq(budgetLimits.monthYear, monthYear)));
}

export async function updateBudgetLimit(teamId: number, monthYear: string, monthlyLimitUsd: number, tenantId?: number) {
  const db = await getDb();
  if (!db) return;

  const conditions = [eq(budgetLimits.teamId, teamId), eq(budgetLimits.monthYear, monthYear)];
  if (tenantId) conditions.push(eq(budgetLimits.tenantId, tenantId));

  await db.update(budgetLimits)
    .set({ monthlyLimitUsd })
    .where(and(...conditions));
}

// ─── AUDIT LOGGING (tenant-scoped) ───────────────────────────────────────────

export async function createAuditLog(userId: number | null, teamId: number | null, action: string, details?: string, tenantId?: number) {
  const db = await getDb();
  if (!db) return;

  await db.insert(auditLogs).values({
    userId,
    teamId,
    tenantId: tenantId ?? null,
    action,
    details,
  });
}

// ─── CLEANUP ─────────────────────────────────────────────────────────────────

export async function closeDb() {
  try {
    if (_db) {
      _db = null;
    }
  } catch {}
}
