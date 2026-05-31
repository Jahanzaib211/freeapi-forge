import Redis from "ioredis";
import { getDb } from "../db";
import { budgetLimits } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { eventBus } from "./event-bus";

const ALERT_THRESHOLDS = [50, 80, 100] as const;

export interface BudgetStatus {
  tenantId: number;
  monthYear: string;
  usedUsd: number;
  limitUsd: number;
  percentUsed: number;
  status: "ok" | "warning" | "critical" | "blocked";
  alertsTriggered: number[];
}

export class BudgetService {
  private redis: Redis | null = null;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        retryStrategy(times) {
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });
      this.redis.connect().catch(() => {
        this.redis = null;
      });
    }
  }

  private spendKey(tenantId: number, monthYear: string): string {
    return `forge:${tenantId}:spend:${monthYear}`;
  }

  private alertKey(tenantId: number, monthYear: string, threshold: number): string {
    return `forge:${tenantId}:alert:${monthYear}:${threshold}`;
  }

  async recordSpend(tenantId: number, monthYear: string, costUsd: number): Promise<BudgetStatus> {
    // Increment Redis counter
    if (this.redis) {
      try {
        const key = this.spendKey(tenantId, monthYear);
        await this.redis.incrbyfloat(key, costUsd);
        await this.redis.expire(key, 60 * 60 * 24 * 35); // 35 days TTL
      } catch {}
    }

    // Get current budget from DB
    const status = await this.getBudgetStatus(tenantId, monthYear);

    // Check thresholds and trigger alerts
    for (const threshold of ALERT_THRESHOLDS) {
      if (status.percentUsed >= threshold) {
        const alreadyTriggered = await this.isAlertTriggered(tenantId, monthYear, threshold);
        if (!alreadyTriggered) {
          await this.triggerAlert(tenantId, monthYear, threshold, status);
        }
      }
    }

    return status;
  }

  async getBudgetStatus(tenantId: number, monthYear: string): Promise<BudgetStatus> {
    let usedUsd = 0;
    let limitUsd = 100; // default

    // Get from Redis (fast path)
    if (this.redis) {
      try {
        const val = await this.redis.get(this.spendKey(tenantId, monthYear));
        if (val) usedUsd = parseFloat(val);
      } catch {}
    }

    // Fallback to DB
    if (usedUsd === 0) {
      const db = await getDb();
      if (db) {
        try {
          const result = await db.select().from(budgetLimits)
            .where(and(eq(budgetLimits.tenantId, tenantId), eq(budgetLimits.monthYear, monthYear)))
            .limit(1);
          if (result.length > 0) {
            usedUsd = result[0].currentSpendUsd / 1_000_000;
            limitUsd = result[0].monthlyLimitUsd;
          }
        } catch {}
      }
    } else {
      // Get limit from DB
      const db = await getDb();
      if (db) {
        try {
          const result = await db.select().from(budgetLimits)
            .where(and(eq(budgetLimits.tenantId, tenantId), eq(budgetLimits.monthYear, monthYear)))
            .limit(1);
          if (result.length > 0) {
            limitUsd = result[0].monthlyLimitUsd;
          }
        } catch {}
      }
    }

    const percentUsed = limitUsd > 0 ? (usedUsd / limitUsd) * 100 : 0;

    let status: BudgetStatus["status"] = "ok";
    if (percentUsed >= 100) status = "blocked";
    else if (percentUsed >= 80) status = "critical";
    else if (percentUsed >= 50) status = "warning";

    const alertsTriggered: number[] = [];
    for (const threshold of ALERT_THRESHOLDS) {
      if (await this.isAlertTriggered(tenantId, monthYear, threshold)) {
        alertsTriggered.push(threshold);
      }
    }

    return {
      tenantId,
      monthYear,
      usedUsd,
      limitUsd,
      percentUsed,
      status,
      alertsTriggered,
    };
  }

  async isBlocked(tenantId: number, monthYear: string): Promise<boolean> {
    const status = await this.getBudgetStatus(tenantId, monthYear);
    return status.status === "blocked";
  }

  private async isAlertTriggered(tenantId: number, monthYear: string, threshold: number): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const val = await this.redis.get(this.alertKey(tenantId, monthYear, threshold));
      return val === "1";
    } catch {
      return false;
    }
  }

  private async triggerAlert(
    tenantId: number, monthYear: string, threshold: number, status: BudgetStatus
  ): Promise<void> {
    // Mark as triggered
    if (this.redis) {
      try {
        await this.redis.setex(this.alertKey(tenantId, monthYear, threshold), 60 * 60 * 24 * 35, "1");
      } catch {}
    }

    // Emit event
    eventBus.emit("budget.alert", {
      tenantId,
      threshold,
      usedUsd: status.usedUsd,
      limitUsd: status.limitUsd,
      percentUsed: status.percentUsed,
      status: status.status,
    }, tenantId);

    console.log(
      `[Budget] ALERT: Tenant ${tenantId} at ${threshold}% — $${status.usedUsd.toFixed(2)} / $${status.limitUsd} (${status.status})`
    );
  }

  async resetMonthlySpend(tenantId: number, monthYear: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(this.spendKey(tenantId, monthYear));
        // Clear alert flags for new month
        for (const threshold of ALERT_THRESHOLDS) {
          await this.redis.del(this.alertKey(tenantId, monthYear, threshold));
        }
      } catch {}
    }

    // Update DB
    const db = await getDb();
    if (db) {
      try {
        await db.update(budgetLimits)
          .set({ currentSpendUsd: 0 })
          .where(and(eq(budgetLimits.tenantId, tenantId), eq(budgetLimits.monthYear, monthYear)));
      } catch {}
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
    }
  }
}

export const budgetService = new BudgetService();
