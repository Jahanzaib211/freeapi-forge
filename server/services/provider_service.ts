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

  async getProviderStatus(): Promise<ProviderStatus[]> {
    const providers = await getAllProviders();
    const statuses: ProviderStatus[] = [];

    for (const provider of providers) {
      try {
        const circuitOpen = await this.redis.get(`circuit:${provider.name}`);
        const failureCountKey = await this.redis.get(`failures:${provider.name}`);
        const rateLimitKey = await this.redis.ttl(`ratelimit:${provider.name}`);

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
        // fail-open: return provider with default status
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

  async recordSuccess(providerName: string): Promise<void> {
    try {
      await this.redis.del(`failures:${providerName}`);
    } catch {} // fail-open
  }

  async recordFailure(providerName: string): Promise<void> {
    try {
      const key = `failures:${providerName}`;
      const count = await this.redis.incr(key);
      await this.redis.expire(key, 300);

      if (count >= this.circuitBreakerThreshold) {
        await this.redis.setex(`circuit:${providerName}`, this.circuitBreakerTimeout / 1000, "open");
      }
    } catch {} // fail-open
  }

  async isCircuitOpen(providerName: string): Promise<boolean> {
    try {
      const state = await this.redis.get(`circuit:${providerName}`);
      return state === "open";
    } catch {
      return false; // fail-open
    }
  }

  async resetCircuitBreaker(providerName: string): Promise<void> {
    await this.redis.del(`circuit:${providerName}`, `failures:${providerName}`);
  }

  async resetProviderHealth(providerName: string): Promise<void> {
    await this.redis.del(
      `circuit:${providerName}`,
      `failures:${providerName}`,
      `ratelimit:${providerName}`
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
