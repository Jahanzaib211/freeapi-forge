import crypto from "crypto";
import bcrypt from "bcrypt";
import { eq, and, isNull, or, gt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { virtualKeys } from "../../drizzle/schema";

const KEY_PREFIX = "sk-";
const KEY_LENGTH = 48;
const BCRYPT_ROUNDS = 12;
const MICRO_USD = 1_000_000;

interface CreateKeyInput {
  name: string;
  teamId?: number;
  tenantId?: number;
  budgetLimitUsd?: number;
  rateLimitTPM?: number;
  rateLimitRPM?: number;
  models?: string[];
  metadata?: string;
  expiresAt?: Date;
}

interface VirtualKeyRecord {
  id: number;
  name: string;
  keyHash: string;
  keyPrefix: string;
  teamId: number;
  budgetLimitUsd: number;
  rateLimitTPM: number;
  rateLimitRPM: number;
  models: string[] | null;
  metadata: string | null;
  enabled: number;
  spendUsd: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

interface KeyCreationResult {
  id: number;
  key: string;
  keyPrefix: string;
  name: string;
}

// In-memory rate limit tracker (replace with Redis in production)
const rateLimitStore = new Map<string, { timestamps: number[] }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  if (maxRequests <= 0) return true;
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  if (entry.timestamps.length >= maxRequests) return false;
  entry.timestamps.push(now);
  rateLimitStore.set(key, entry);
  return true;
}

export class VirtualKeyService {
  generateKey(): string {
    const randomBytes = crypto.randomBytes(KEY_LENGTH / 2);
    const hex = randomBytes.toString("hex");
    return `${KEY_PREFIX}${hex}`;
  }

  async hashKey(key: string): Promise<string> {
    return bcrypt.hash(key, BCRYPT_ROUNDS);
  }

  async verifyKey(key: string, hash: string): Promise<boolean> {
    return bcrypt.compare(key, hash);
  }

  async createKey(input: CreateKeyInput): Promise<KeyCreationResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const key = this.generateKey();
    const keyHash = await this.hashKey(key);
    const keyPrefix = key.substring(0, 10) + "...";

    const result = await db
      .insert(virtualKeys)
      .values({
        name: input.name,
        keyHash,
        keyPrefix,
        teamId: input.teamId || 1,
        tenantId: input.tenantId || null,
        budgetLimitUsd: input.budgetLimitUsd || 10,
        rateLimitTPM: input.rateLimitTPM || 100000,
        rateLimitRPM: input.rateLimitRPM || 1000,
        models: input.models || null,
        metadata: input.metadata || null,
        expiresAt: input.expiresAt || null,
      })
      .returning({ id: virtualKeys.id });

    return {
      id: result[0].id,
      key,
      keyPrefix,
      name: input.name,
    };
  }

  async getKeyById(id: number): Promise<VirtualKeyRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(virtualKeys)
      .where(eq(virtualKeys.id, id))
      .limit(1);

    return result.length > 0 ? (result[0] as VirtualKeyRecord) : null;
  }

  async getKeyByHash(keyHash: string): Promise<VirtualKeyRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(virtualKeys)
      .where(eq(virtualKeys.keyHash, keyHash))
      .limit(1);

    return result.length > 0 ? (result[0] as VirtualKeyRecord) : null;
  }

  async listKeys(teamId?: number, tenantId?: number): Promise<VirtualKeyRecord[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const conditions = [];
      if (teamId) conditions.push(eq(virtualKeys.teamId, teamId));
      if (tenantId) conditions.push(eq(virtualKeys.tenantId, tenantId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(virtualKeys)
        .where(where)
        .orderBy(virtualKeys.createdAt);

      return result as VirtualKeyRecord[];
    } catch {
      return [];
    }
  }

  async updateKey(
    id: number,
    updates: Partial<Omit<CreateKeyInput, "name"> & { enabled: number }>
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      await db
        .update(virtualKeys)
        .set(updates)
        .where(eq(virtualKeys.id, id));

      return true;
    } catch {
      return false;
    }
  }

  async deleteKey(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      await db.delete(virtualKeys).where(eq(virtualKeys.id, id));
      return true;
    } catch {
      return false;
    }
  }

  async incrementSpend(id: number, amountUsd: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
      .update(virtualKeys)
      .set({
        spendUsd: sql`${virtualKeys.spendUsd} + ${Math.round(amountUsd * 1000000)}`,
        lastUsedAt: new Date(),
      })
      .where(eq(virtualKeys.id, id));
  }

  async validateKey(
    key: string,
    options?: { model?: string }
  ): Promise<{
    valid: boolean;
    keyRecord?: VirtualKeyRecord;
    error?: string;
  }> {
    const db = await getDb();
    if (!db) return { valid: false, error: "Database not available" };

    const result = await db
      .select()
      .from(virtualKeys)
      .where(
        and(
          eq(virtualKeys.enabled, 1),
          or(isNull(virtualKeys.expiresAt), gt(virtualKeys.expiresAt, new Date()))
        )
      );

    for (const record of result) {
      const match = await this.verifyKey(key, record.keyHash);
      if (match) {
        const keyRecord = record as VirtualKeyRecord;

        if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
          return { valid: false, error: "Key expired" };
        }

        // Fix: spendUsd is stored in micro-USD, budgetLimitUsd is in dollars
        if (keyRecord.budgetLimitUsd > 0 && keyRecord.spendUsd / MICRO_USD >= keyRecord.budgetLimitUsd) {
          return { valid: false, error: "Budget limit exceeded" };
        }

        // Enforce rate limits (TPM / RPM)
        const keyId = `vk:${keyRecord.id}`;
        if (keyRecord.rateLimitTPM > 0 && !checkRateLimit(`${keyId}:tpm`, keyRecord.rateLimitTPM, 60_000)) {
          return { valid: false, error: `TPM rate limit exceeded (max ${keyRecord.rateLimitTPM}/min)` };
        }
        if (keyRecord.rateLimitRPM > 0 && !checkRateLimit(`${keyId}:rpm`, keyRecord.rateLimitRPM, 60_000)) {
          return { valid: false, error: `RPM rate limit exceeded (max ${keyRecord.rateLimitRPM}/min)` };
        }

        // Model access restriction
        if (options?.model && keyRecord.models && keyRecord.models.length > 0) {
          const allowed = keyRecord.models.some(
            (m) => options.model!.toLowerCase() === m.toLowerCase()
          );
          if (!allowed) {
            return { valid: false, error: `Model "${options.model}" not allowed by this key` };
          }
        }

        return { valid: true, keyRecord };
      }
    }

    return { valid: false, error: "Invalid key" };
  }

  async getKeysByTeamId(teamId: number, tenantId?: number): Promise<VirtualKeyRecord[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const conditions = [eq(virtualKeys.teamId, teamId)];
      if (tenantId) conditions.push(eq(virtualKeys.tenantId, tenantId));

      const result = await db
        .select()
        .from(virtualKeys)
        .where(and(...conditions))
        .orderBy(virtualKeys.createdAt);

      return result as VirtualKeyRecord[];
    } catch {
      return [];
    }
  }
}

export const virtualKeyService = new VirtualKeyService();
