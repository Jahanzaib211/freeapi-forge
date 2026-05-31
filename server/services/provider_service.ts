import Redis from "ioredis";
import { getAllProviders } from "../db";

export interface ProviderStatus {
  id: number;
  provider: string;
  litellmEndpoint: string;
  enabled: boolean;
  circuitState: "open" | "closed";
  qualityScore: number;
  latencyMs: number;
  failureCount: number;
  rateLimitCooldown: number | null;
  lastChecked: Date;
}

export class ProviderService {
  private redis: Redis;
  private circuitBreakerThreshold = 3;
  private circuitBreakerTimeout = 60000;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/1", {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      enableReadyCheck: true,
      lazyConnect: true,
    });
    this.redis.connect().catch(err => {
      console.error("[Redis] Connection failed, running fail-open:", err.message);
    });
  }

  private key(tenantId: number | undefined, name: string): string {
    return tenantId ? `forge:${tenantId}:${name}` : name;
  }

  async getProviderStatus(tenantId?: number): Promise<ProviderStatus[]> {
    const providers = await getAllProviders(tenantId);
    const statuses: ProviderStatus[] = [];

    for (const provider of providers) {
      try {
        const circuitOpen = await this.redis.get(this.key(tenantId, `circuit:${provider.name}`));
        const failureCountKey = await this.redis.get(this.key(tenantId, `failures:${provider.name}`));
        const rateLimitKey = await this.redis.ttl(this.key(tenantId, `ratelimit:${provider.name}`));

        statuses.push({
          id: provider.id,
          provider: provider.name,
          litellmEndpoint: provider.litellmEndpoint,
          enabled: provider.enabled === 1,
          circuitState: circuitOpen === "open" ? "open" : "closed",
          qualityScore: provider.qualityScore,
          latencyMs: provider.latencyMs,
          failureCount: failureCountKey ? parseInt(failureCountKey, 10) : 0,
          rateLimitCooldown: rateLimitKey > 0 ? rateLimitKey : null,
          lastChecked: new Date(),
        });
      } catch {
        statuses.push({
          id: provider.id,
          provider: provider.name,
          litellmEndpoint: provider.litellmEndpoint,
          enabled: provider.enabled === 1,
          circuitState: "closed",
          qualityScore: provider.qualityScore,
          latencyMs: provider.latencyMs,
          failureCount: 0,
          rateLimitCooldown: null,
          lastChecked: new Date(),
        });
      }
    }

    return statuses;
  }

  async recordSuccess(providerName: string, tenantId?: number): Promise<void> {
    try {
      await this.redis.del(this.key(tenantId, `failures:${providerName}`));
    } catch {} // fail-open
  }

  async recordFailure(providerName: string, tenantId?: number): Promise<void> {
    try {
      const key = this.key(tenantId, `failures:${providerName}`);
      const count = await this.redis.incr(key);
      await this.redis.expire(key, 300);

      if (count >= this.circuitBreakerThreshold) {
        await this.redis.setex(this.key(tenantId, `circuit:${providerName}`), this.circuitBreakerTimeout / 1000, "open");
      }
    } catch {} // fail-open
  }

  async isCircuitOpen(providerName: string, tenantId?: number): Promise<boolean> {
    try {
      const state = await this.redis.get(this.key(tenantId, `circuit:${providerName}`));
      return state === "open";
    } catch {
      return false; // fail-open
    }
  }

  async resetCircuitBreaker(providerName: string, tenantId?: number): Promise<void> {
    await this.redis.del(this.key(tenantId, `circuit:${providerName}`), this.key(tenantId, `failures:${providerName}`));
  }

  async resetProviderHealth(providerName: string, tenantId?: number): Promise<void> {
    await this.redis.del(
      this.key(tenantId, `circuit:${providerName}`),
      this.key(tenantId, `failures:${providerName}`),
      this.key(tenantId, `ratelimit:${providerName}`)
    );
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  async closeRedis(): Promise<void> {
    try { await this.redis.quit(); } catch {}
  }
}

export const providerService = new ProviderService();
