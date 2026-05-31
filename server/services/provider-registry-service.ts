import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { providerRegistry, tenantProviderConfigs, modelBenchmarks } from "../../drizzle/schema";
import { encrypt, decrypt } from "../_core/encryption";
import { forgeBrainService } from "./forge-brain-service";

export class ProviderRegistryService {

  async seedGlobalCatalog(): Promise<void> {
    const db = await getDb();
    if (!db) return;
    const existing = await db.select({ c: sql<number>`count(*)` }).from(providerRegistry);
    if (Number(existing[0]?.c || 0) > 0) return;

    const providers = [
      { name: "OpenAI", slug: "openai", type: "paid", description: "GPT-4o, GPT-4, o1 — state-of-the-art models", authType: "api_key", baseUrl: "https://api.openai.com/v1", modelsEndpoint: "/v1/models", websiteUrl: "https://platform.openai.com", icon: "openai", supportedFeatures: JSON.stringify({ chat: true, vision: true, streaming: true, tools: true, embedding: true, tts: true, images: true }) },
      { name: "Anthropic", slug: "anthropic", type: "paid", description: "Claude 3.5 Sonnet, Claude 3 Opus — safe and capable", authType: "api_key", baseUrl: "https://api.anthropic.com/v1", modelsEndpoint: "/v1/models", websiteUrl: "https://console.anthropic.com", icon: "anthropic", supportedFeatures: JSON.stringify({ chat: true, vision: true, streaming: true, tools: true }) },
      { name: "DeepSeek", slug: "deepseek", type: "paid", description: "DeepSeek V3, R1 — powerful coding and reasoning", authType: "api_key", baseUrl: "https://api.deepseek.com/v1", modelsEndpoint: "/v1/models", websiteUrl: "https://platform.deepseek.com", icon: "deepseek", supportedFeatures: JSON.stringify({ chat: true, streaming: true, tools: true }) },
      { name: "Groq", slug: "groq", type: "freemium", description: "Ultra-fast inference — sub-100ms latency", authType: "api_key", baseUrl: "https://api.groq.com/openai/v1", modelsEndpoint: "/v1/models", websiteUrl: "https://console.groq.com", icon: "groq", supportedFeatures: JSON.stringify({ chat: true, streaming: true, tools: true, fast: true }) },
      { name: "Together AI", slug: "together", type: "freemium", description: "Open-source models at scale", authType: "api_key", baseUrl: "https://api.together.xyz/v1", modelsEndpoint: "/v1/models", websiteUrl: "https://together.ai", icon: "together", supportedFeatures: JSON.stringify({ chat: true, streaming: true, embedding: true, fineTuning: true }) },
      { name: "OpenRouter", slug: "openrouter", type: "freemium", description: "Unified API for 200+ models", authType: "api_key", baseUrl: "https://openrouter.ai/api/v1", modelsEndpoint: "/v1/models", websiteUrl: "https://openrouter.ai", icon: "openrouter", supportedFeatures: JSON.stringify({ chat: true, streaming: true }) },
      { name: "Mistral", slug: "mistral", type: "freemium", description: "Mistral Large, Small — efficient European models", authType: "api_key", baseUrl: "https://api.mistral.ai/v1", modelsEndpoint: "/v1/models", websiteUrl: "https://console.mistral.ai", icon: "mistral", supportedFeatures: JSON.stringify({ chat: true, streaming: true, tools: true, embedding: true }) },
      { name: "Google Gemini", slug: "google", type: "paid", description: "Gemini 2.0, 1.5 Pro — multimodal power", authType: "api_key", baseUrl: "https://generativelanguage.googleapis.com/v1beta", modelsEndpoint: "/models", websiteUrl: "https://aistudio.google.com", icon: "google", supportedFeatures: JSON.stringify({ chat: true, vision: true, streaming: true, audio: true }) },
      { name: "Ollama", slug: "ollama", type: "local", description: "Run models locally — no API keys needed", authType: "none", baseUrl: "http://localhost:11434", modelsEndpoint: "/api/tags", websiteUrl: "https://ollama.ai", icon: "ollama", supportedFeatures: JSON.stringify({ chat: true, streaming: true, embedding: true, local: true }) },
      { name: "LM Studio", slug: "lmstudio", type: "local", description: "Desktop app for local LLMs", authType: "none", baseUrl: "http://localhost:1234/v1", modelsEndpoint: "/v1/models", websiteUrl: "https://lmstudio.ai", icon: "lmstudio", supportedFeatures: JSON.stringify({ chat: true, streaming: true, local: true }) },
      { name: "Perplexity", slug: "perplexity", type: "paid", description: "AI search with citations", authType: "api_key", baseUrl: "https://api.perplexity.ai", modelsEndpoint: "/v1/models", websiteUrl: "https://www.perplexity.ai", icon: "perplexity", supportedFeatures: JSON.stringify({ chat: true, streaming: true, search: true }) },
      { name: "Cohere", slug: "cohere", type: "freemium", description: "Command R+, embedding, and rerank models", authType: "api_key", baseUrl: "https://api.cohere.ai/v1", modelsEndpoint: "/v1/models", websiteUrl: "https://dashboard.cohere.ai", icon: "cohere", supportedFeatures: JSON.stringify({ chat: true, embedding: true, classification: true }) },
      { name: "Fireworks AI", slug: "fireworks", type: "freemium", description: "Fast open-source model inference", authType: "api_key", baseUrl: "https://api.fireworks.ai/inference/v1", modelsEndpoint: "/v1/models", websiteUrl: "https://fireworks.ai", icon: "fireworks", supportedFeatures: JSON.stringify({ chat: true, streaming: true, embedding: true }) },
      { name: "Replicate", slug: "replicate", type: "paid", description: "Run open-source models in the cloud", authType: "api_key", baseUrl: "https://api.replicate.com/v1", modelsEndpoint: "/models", websiteUrl: "https://replicate.com", icon: "replicate", supportedFeatures: JSON.stringify({ chat: true, images: true, audio: true, video: true }) },
      { name: "HuggingFace", slug: "huggingface", type: "freemium", description: "Inference API for HF models", authType: "api_key", baseUrl: "https://api-inference.huggingface.co/models", modelsEndpoint: "", websiteUrl: "https://huggingface.co", icon: "huggingface", supportedFeatures: JSON.stringify({ chat: true, embedding: true, classification: true }) },
    ];

    for (const p of providers) {
      await db.insert(providerRegistry).values(p as any);
    }
  }

  async getGlobalCatalog(): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(providerRegistry).where(eq(providerRegistry.status, "active")).orderBy(providerRegistry.name);
  }

  async getFreeProviders(): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(providerRegistry).where(and(
      eq(providerRegistry.status, "active"),
      sql`${providerRegistry.type} IN ('free', 'freemium', 'local')`
    )).orderBy(providerRegistry.name);
  }

  async addProvider(tenantId: number, providerRegistryId: number, apiKey: string): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const provider = await db.select().from(providerRegistry)
      .where(eq(providerRegistry.id, providerRegistryId)).limit(1).then(r => r[0]);
    if (!provider) throw new Error("Provider not found in registry");

    const encryptedKey = encrypt(apiKey);

    const existing = await db.select().from(tenantProviderConfigs)
      .where(and(eq(tenantProviderConfigs.tenantId, tenantId), eq(tenantProviderConfigs.providerRegistryId, providerRegistryId)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(tenantProviderConfigs).set({
        apiKeyEncrypted: encryptedKey, isActive: true, updatedAt: new Date(),
      }).where(eq(tenantProviderConfigs.id, existing[0].id));
    } else {
      await db.insert(tenantProviderConfigs).values({
        tenantId, providerRegistryId, apiKeyEncrypted: encryptedKey, isActive: true,
      });
    }

    // Auto-create brain node
    await forgeBrainService.createNode(tenantId, "provider", provider.slug, provider.name,
      `# ${provider.name}\n> ${provider.description}\n## Connection\n- **Base URL**: ${provider.baseUrl}\n- **Auth**: API Key (encrypted)\n- **Status**: Active\n`,
      { title: provider.name, type: "provider", slug: provider.slug, status: "active", created: new Date().toISOString() },
      [provider.type, provider.authType === "none" ? "free" : "paid"],
    );

    return { provider, connected: true };
  }

  async getConnectedProviders(tenantId: number): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];
    const configs = await db.select({
      id: tenantProviderConfigs.id,
      providerRegistryId: tenantProviderConfigs.providerRegistryId,
      isActive: tenantProviderConfigs.isActive,
      enabledModelIds: tenantProviderConfigs.enabledModelIds,
      lastHealthCheck: tenantProviderConfigs.lastHealthCheck,
      lastHealthStatus: tenantProviderConfigs.lastHealthStatus,
    }).from(tenantProviderConfigs)
      .where(and(eq(tenantProviderConfigs.tenantId, tenantId), eq(tenantProviderConfigs.isActive, true)));

    if (configs.length === 0) return [];

    const registryIds = configs.map(c => c.providerRegistryId);
    const providers = await db.select().from(providerRegistry)
      .where(sql`${providerRegistry.id} IN ${registryIds}`);

    return configs.map(c => {
      const p = providers.find(pr => pr.id === c.providerRegistryId);
      return { ...c, provider: p || null };
    });
  }

  async removeProvider(tenantId: number, providerRegistryId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db.update(tenantProviderConfigs).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(tenantProviderConfigs.tenantId, tenantId), eq(tenantProviderConfigs.providerRegistryId, providerRegistryId)));

    const provider = await db.select().from(providerRegistry)
      .where(eq(providerRegistry.id, providerRegistryId)).limit(1).then(r => r[0]);
    if (provider) {
      await forgeBrainService.archiveNode(tenantId, "provider", provider.slug);
    }
  }

  async testProvider(tenantId: number, providerRegistryId: number): Promise<{ ok: boolean; latency: number }> {
    const db = await getDb();
    if (!db) return { ok: false, latency: 0 };
    const config = await db.select().from(tenantProviderConfigs)
      .where(and(eq(tenantProviderConfigs.tenantId, tenantId), eq(tenantProviderConfigs.providerRegistryId, providerRegistryId)))
      .limit(1).then(r => r[0]);
    if (!config || !config.apiKeyEncrypted) return { ok: false, latency: 0 };

    const provider = await db.select().from(providerRegistry)
      .where(eq(providerRegistry.id, providerRegistryId)).limit(1).then(r => r[0]);
    if (!provider) return { ok: false, latency: 0 };

    const apiKey = decrypt(config.apiKeyEncrypted);
    const start = Date.now();
    try {
      const resp = await fetch(`${provider.baseUrl}${provider.modelsEndpoint}`, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      const latency = Date.now() - start;
      const ok = resp.ok;
      await db.update(tenantProviderConfigs).set({
        lastHealthCheck: new Date(), lastHealthStatus: ok ? "healthy" : "degraded",
      }).where(eq(tenantProviderConfigs.id, config.id));
      return { ok, latency };
    } catch {
      const latency = Date.now() - start;
      await db.update(tenantProviderConfigs).set({
        lastHealthCheck: new Date(), lastHealthStatus: "down",
      }).where(eq(tenantProviderConfigs.id, config.id));
      return { ok: false, latency };
    }
  }

  async testModel(tenantId: number, modelId: string, prompt?: string): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const testPrompt = prompt || "Say hello in one word.";
    return { modelId, prompt: testPrompt, response: "test-result", tokensUsed: 5, durationMs: 100 };
  }

  async storeBenchmark(tenantId: number, modelId: string, provider: string, prompt: string, response: string, tokensUsed: number, durationMs: number, qualityScore?: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db.insert(modelBenchmarks).values({
      tenantId, modelId, provider, prompt, response, tokensUsed, durationMs,
      qualityScore: qualityScore || null,
    });
  }

  async getBenchmarks(tenantId: number, modelId?: string): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];
    const conditions: any[] = [eq(modelBenchmarks.tenantId, tenantId)];
    if (modelId) conditions.push(eq(modelBenchmarks.modelId, modelId));
    return db.select().from(modelBenchmarks).where(and(...conditions)).orderBy(desc(modelBenchmarks.createdAt)).limit(50);
  }
}

export const providerRegistryService = new ProviderRegistryService();
