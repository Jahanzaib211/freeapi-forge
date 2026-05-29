import { getAllProviders } from "../db";

export interface ProviderHealthStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  lastChecked: Date;
  modelsAvailable: number;
  error?: string;
}

export async function checkProviderHealth(): Promise<ProviderHealthStatus[]> {
  const providers = await getAllProviders();

  const results = await Promise.allSettled(
    providers
      .filter((p) => p.enabled === 1)
      .map(async (provider) => {
        const start = Date.now();
        try {
          const response = await fetch(
            `${provider.litellmEndpoint}/v1/models`,
            {
              method: "GET",
              signal: AbortSignal.timeout(10000),
            }
          );
          const data = await response.json();
          const latencyMs = Date.now() - start;
          const modelsAvailable = Array.isArray(data.data)
            ? data.data.length
            : 0;

          return {
            name: provider.name,
            status: latencyMs > 5000 ? ("degraded" as const) : ("healthy" as const),
            latencyMs,
            lastChecked: new Date(),
            modelsAvailable,
          };
        } catch (err: any) {
          return {
            name: provider.name,
            status: "down" as const,
            latencyMs: Date.now() - start,
            lastChecked: new Date(),
            modelsAvailable: 0,
            error: err.message,
          };
        }
      })
  );

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : {
          name: "unknown",
          status: "down" as const,
          latencyMs: 0,
          lastChecked: new Date(),
          modelsAvailable: 0,
          error: "Health check failed",
        }
  );
}
