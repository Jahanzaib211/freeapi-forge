import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { providers, customProviders, tenantProviderConfigs } from "../../drizzle/schema";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
}

const CAPABILITY_PATTERNS: Array<{ regex: RegExp; capability: string }> = [
  { regex: /gpt-4o|vision|gemini.*pro.*vision|claude.*sonnet|claude.*opus/i, capability: "vision" },
  { regex: /embed|text-embedding|bge-|e5-/i, capability: "embedding" },
  { regex: /tool|function.*call/i, capability: "tools" },
  { regex: /turbo|flash|fast/i, capability: "fast" },
  { regex: /o1|reasoning|deep.*think/i, capability: "reasoning" },
  { regex: /audio|whisper|tts/i, capability: "audio" },
  { regex: /image|dall-e|stable.*diffusion/i, capability: "images" },
];

function detectCapabilities(modelName: string): string[] {
  const caps: string[] = ["chat", "streaming"];
  for (const pattern of CAPABILITY_PATTERNS) {
    if (pattern.regex.test(modelName) && !caps.includes(pattern.capability)) {
      caps.push(pattern.capability);
    }
  }
  return caps;
}

function parseModels(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((m: unknown): m is string => typeof m === "string") : [];
  } catch {
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }
}

export async function getModelTaskMap(tenantId?: number): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return { chat: "fast-8b", coding: "fast-8b", fast: "fast-8b", local: "local" };

  const map: Record<string, string> = { chat: "", coding: "", fast: "", local: "" };

  // Collect models from custom providers
  const cpRows = await db.select().from(customProviders);
  const models: string[] = [];
  for (const cp of cpRows) {
    models.push(...parseModels(cp.models));
  }

  // Collect models from tenant provider configs
  if (tenantId) {
    const tpcRows = await db.select().from(tenantProviderConfigs)
      .where(and(eq(tenantProviderConfigs.tenantId, tenantId), eq(tenantProviderConfigs.isActive, true)));
    for (const tpc of tpcRows) {
      models.push(...parseModels(tpc.enabledModelIds));
    }
  }

  for (const modelName of models) {
    const caps = detectCapabilities(modelName);
    if (caps.includes("fast") && !map.fast) map.fast = modelName;
    if ((caps.includes("tools") || caps.includes("reasoning")) && !map.coding) map.coding = modelName;
    if (!map.chat) map.chat = modelName;
  }

  if (!map.chat) map.chat = "fast-8b";
  if (!map.coding) map.coding = map.chat;
  if (!map.fast) map.fast = map.chat;
  if (!map.local) map.local = "local";

  return map;
}

export async function getAvailableModels(tenantId?: number): Promise<ModelInfo[]> {
  const db = await getDb();
  if (!db) return [];

  const models: ModelInfo[] = [];

  const cpRows = await db.select().from(customProviders);
  for (const cp of cpRows) {
    for (const modelName of parseModels(cp.models)) {
      models.push({ id: modelName, name: modelName, provider: cp.name, capabilities: detectCapabilities(modelName) });
    }
  }

  if (tenantId) {
    const tpcRows = await db.select().from(tenantProviderConfigs)
      .where(and(eq(tenantProviderConfigs.tenantId, tenantId), eq(tenantProviderConfigs.isActive, true)));
    for (const tpc of tpcRows) {
      const providerName = `provider_${tpc.providerRegistryId}`;
      for (const modelName of parseModels(tpc.enabledModelIds)) {
        models.push({ id: modelName, name: modelName, provider: providerName, capabilities: detectCapabilities(modelName) });
      }
    }
  }

  return models;
}

export async function getModelForTask(task: string, tenantId?: number): Promise<string> {
  const map = await getModelTaskMap(tenantId);
  return map[task] || map.chat || "fast-8b";
}
