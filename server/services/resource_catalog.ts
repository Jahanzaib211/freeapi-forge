import { customProviderService } from "./custom_provider";
import { getAllModelsFromConfig } from "./model_manager";
import { detectAllLLMs } from "./llm_detector";

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

export interface CatalogModel {
  id: string;
  displayName: string;
  provider: string;
  providerName: string;
  source: "cloud" | "custom" | "local_ollama" | "local_llamacpp" | "local_gguf" | "hf_cache";
  pool: "paid" | "free" | "local";
  status: "online" | "offline" | "available" | "running" | "cached";
  contextWindow?: number;
  size?: string;
  quantization?: string;
  estimatedVRAM?: string;
  format?: string;
  gpuUsage?: string;
  tokensPerSec?: number;
  addedAt?: string;
}

export interface CatalogProvider {
  name: string;
  displayName: string;
  type: "builtin" | "custom" | "local";
  pool: "paid" | "free" | "local";
  modelCount: number;
  enabled: boolean;
  status: "healthy" | "degraded" | "offline";
  apiUrl?: string;
}

export interface ResourceCatalog {
  models: CatalogModel[];
  providers: CatalogProvider[];
  pools: {
    paid: { providers: number; models: number };
    free: { providers: number; models: number };
    local: { providers: number; models: number };
  };
}

async function getCustomProviderCatalog(): Promise<{
  models: CatalogModel[];
  providers: CatalogProvider[];
}> {
  try {
    const providers = await customProviderService.list();
    const models: CatalogModel[] = [];
    const providerList: CatalogProvider[] = [];

    for (const p of providers) {
      const modelNames = p.models.split(",").map((m) => m.trim()).filter(Boolean);

      providerList.push({
        name: p.name.toLowerCase().replace(/\s+/g, "-"),
        displayName: p.name,
        type: "custom",
        pool: "paid",
        modelCount: modelNames.length,
        enabled: p.enabled === 1,
        status: p.enabled === 1 ? "healthy" : "offline",
        apiUrl: p.apiUrl,
      });

      for (const modelName of modelNames) {
        models.push({
          id: modelName,
          displayName: modelName,
          provider: p.name.toLowerCase().replace(/\s+/g, "-"),
          providerName: p.name,
          source: "custom",
          pool: "paid",
          status: p.enabled === 1 ? "online" : "offline",
          addedAt: p.createdAt?.toISOString(),
        });
      }
    }

    return { models, providers: providerList };
  } catch {
    return { models: [], providers: [] };
  }
}

function getLiteLLMCatalog(): {
  models: CatalogModel[];
  providers: CatalogProvider[];
} {
  try {
    const configModels = getAllModelsFromConfig();
    const models: CatalogModel[] = [];
    const providerSet = new Set<string>();

    for (const m of configModels) {
      const providerName = m.provider || "unknown";
      providerSet.add(providerName);

      models.push({
        id: m.model || m.name,
        displayName: m.name,
        provider: providerName,
        providerName: providerName.charAt(0).toUpperCase() + providerName.slice(1),
        source: "cloud",
        pool: "free",
        status: "online",
      });
    }

    const providers: CatalogProvider[] = Array.from(providerSet).map(
      (name) => ({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        type: "builtin" as const,
        pool: "free" as const,
        modelCount: models.filter((m) => m.provider === name).length,
        enabled: true,
        status: "healthy" as const,
      })
    );

    return { models, providers };
  } catch {
    return { models: [], providers: [] };
  }
}

async function getLocalCatalog(): Promise<{
  models: CatalogModel[];
  providers: CatalogProvider[];
}> {
  try {
    const detected = await detectAllLLMs();
    const models: CatalogModel[] = [];
    const providerMap = new Map<string, { count: number; displayName: string }>();

    for (const m of detected) {
      let source: CatalogModel["source"] = "local_gguf";
      let providerName = "Local GGUF";

      if (m.source === "ollama") {
        source = "local_ollama";
        providerName = "Ollama";
      } else if (m.source === "llama-cpp") {
        source = "local_llamacpp";
        providerName = "llama.cpp";
      } else if (m.source === "huggingface") {
        source = "hf_cache";
        providerName = "HuggingFace Cache";
      }

      const existing = providerMap.get(providerName) || {
        count: 0,
        displayName: providerName,
      };
      existing.count++;
      providerMap.set(providerName, existing);

      models.push({
        id: m.name,
        displayName: m.name,
        provider: providerName.toLowerCase().replace(/\s+/g, "-"),
        providerName,
        source,
        pool: "local",
        status: m.status === "running" ? "running" : "available",
        size: m.size ? formatBytes(m.size) : undefined,
        format: m.format,
      });
    }

    const providers: CatalogProvider[] = Array.from(providerMap.entries()).map(
      ([name, info]) => ({
        name: name.toLowerCase().replace(/\s+/g, "-"),
        displayName: name,
        type: "local" as const,
        pool: "local" as const,
        modelCount: info.count,
        enabled: true,
        status: "healthy" as const,
      })
    );

    return { models, providers };
  } catch {
    return { models: [], providers: [] };
  }
}

export async function getResourceCatalog(): Promise<ResourceCatalog> {
  const [custom, liteLLM, local] = await Promise.all([
    getCustomProviderCatalog(),
    Promise.resolve(getLiteLLMCatalog()),
    getLocalCatalog(),
  ]);

  const allModels = [...custom.models, ...liteLLM.models, ...local.models];
  const allProviders = [
    ...custom.providers,
    ...liteLLM.providers,
    ...local.providers,
  ];

  return {
    models: allModels,
    providers: allProviders,
    pools: {
      paid: {
        providers: allProviders.filter((p) => p.pool === "paid").length,
        models: allModels.filter((m) => m.pool === "paid").length,
      },
      free: {
        providers: allProviders.filter((p) => p.pool === "free").length,
        models: allModels.filter((m) => m.pool === "free").length,
      },
      local: {
        providers: allProviders.filter((p) => p.pool === "local").length,
        models: allModels.filter((m) => m.pool === "local").length,
      },
    },
  };
}
