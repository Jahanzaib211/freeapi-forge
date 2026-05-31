import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { tenantSettings, userOverrides } from "../../drizzle/schema";
import { getConfig } from "../_core/forge-config-types";
import type { ForgeConfig } from "../../forge.config";

type SettingsCategory = keyof ForgeConfig extends infer K ? K : string;

export class SettingsService {

  async getSetting(tenantId: number, key: string): Promise<any> {
    const db = await getDb();
    if (!db) return this.getDefault(key);

    const row = await db.select({ settingValue: tenantSettings.settingValue })
      .from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.settingKey, key)))
      .limit(1);

    if (row.length > 0) {
      try { return JSON.parse(row[0].settingValue); } catch { return row[0].settingValue; }
    }
    return this.getDefault(key);
  }

  async getSettingsByCategory(tenantId: number, category: string): Promise<Record<string, any>> {
    const db = await getDb();
    if (!db) return this.getCategoryDefaults(category);

    const rows = await db.select({ settingKey: tenantSettings.settingKey, settingValue: tenantSettings.settingValue })
      .from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.category, category)));

    const result = this.getCategoryDefaults(category);
    for (const row of rows) {
      try { result[row.settingKey] = JSON.parse(row.settingValue); } catch { result[row.settingKey] = row.settingValue; }
    }
    return result;
  }

  async getAllSettings(tenantId: number): Promise<Record<string, Record<string, any>>> {
    const db = await getDb();
    if (!db) return this.getAllDefaults();

    const rows = await db.select().from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));

    const result = this.getAllDefaults();
    for (const row of rows) {
      if (!result[row.category]) result[row.category] = {};
      try { result[row.category][row.settingKey] = JSON.parse(row.settingValue); } catch { result[row.category][row.settingKey] = row.settingValue; }
    }
    return result;
  }

  async setSetting(tenantId: number, key: string, value: any, category?: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const valueStr = typeof value === "string" ? value : JSON.stringify(value);
    const cat = category || this.inferCategory(key);

    await db.insert(tenantSettings).values({
      tenantId, category: cat, settingKey: key, settingValue: valueStr,
    }).onConflictDoUpdate({
      target: [tenantSettings.tenantId, tenantSettings.settingKey],
      set: { settingValue: valueStr, category: cat, updatedAt: new Date() },
    });
  }

  async setSettingsBulk(tenantId: number, settings: Array<{ key: string; value: any; category?: string }>): Promise<void> {
    for (const s of settings) {
      await this.setSetting(tenantId, s.key, s.value, s.category);
    }
  }

  async resetSetting(tenantId: number, key: string): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db.delete(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.settingKey, key)));
  }

  async resetCategory(tenantId: number, category: string): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db.delete(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.category, category)));
  }

  async resetAllSettings(tenantId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db.delete(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));
  }

  async getUserSetting(tenantId: number, userId: number, key: string): Promise<any> {
    const db = await getDb();
    if (!db) return this.getDefault(key);

    const row = await db.select({ settingValue: userOverrides.settingValue })
      .from(userOverrides)
      .where(and(
        eq(userOverrides.tenantId, tenantId),
        eq(userOverrides.userId, userId),
        eq(userOverrides.settingKey, key),
      ))
      .limit(1);

    if (row.length > 0) {
      try { return JSON.parse(row[0].settingValue); } catch { return row[0].settingValue; }
    }

    return this.getSetting(tenantId, key);
  }

  async setUserOverride(tenantId: number, userId: number, key: string, value: any): Promise<void> {
    const db = await getDb();
    if (!db) return;
    const valueStr = typeof value === "string" ? value : JSON.stringify(value);

    await db.insert(userOverrides).values({
      tenantId, userId, settingKey: key, settingValue: valueStr,
    }).onConflictDoUpdate({
      target: [userOverrides.tenantId, userOverrides.userId, userOverrides.settingKey],
      set: { settingValue: valueStr, updatedAt: new Date() },
    });
  }

  getDefaults(): Record<string, Record<string, any>> {
    return this.getAllDefaults();
  }

  private getDefault(key: string): any {
    const parts = key.split(".");
    const config = getConfig() as any;
    let current = config;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }

  private getCategoryDefaults(category: string): Record<string, any> {
    const config = getConfig() as any;
    if (category in config) return { ...config[category] };
    return {};
  }

  private getAllDefaults(): Record<string, Record<string, any>> {
    const config = getConfig();
    return {
      general: { language: "en", timezone: "UTC", theme: "dark", sidebarCollapsed: false, compactMode: false, enableAnimations: true },
      ai: { defaultProvider: null, defaultModel: null, temperature: 0.7, maxTokensPerRequest: 4096, streamingEnabled: true, autoRetryOnFail: true, maxRetries: 3 },
      providers: { autoDiscoverModels: true, healthCheckIntervalMs: 300000, autoDisableUnhealthy: true, unhealthyThreshold: 3 },
      agents: { maxConcurrentRuns: 10, taskTimeoutMs: 300000, autoSaveDrafts: true, keepHistoryDays: 30 },
      workflows: { maxConcurrentRuns: 5, maxStepsPerWorkflow: 20, autoRetryOnStepFail: false },
      gui: {
        sidebarItems: ["dashboard", "chat", "forge-builder", "ai-lab", "brain", "mcp", "huggingface", "github-explorer", "deployment-monitor", "guard", "budgets", "settings"],
        defaultPageSize: 20, taskPanePosition: "right", taskPaneAutoOpen: true, showTokenCount: true, showLatencyMs: true,
      },
      guard: { enabled: true, alertRetentionDays: 7, autoDiagnosticsOnAlert: true, quietHoursEnabled: false, alertThresholds: { cpuPercent: 90, memoryPercent: 85, diskPercent: 90, postgresConnections: 90, redisMemoryPercent: 80, responseTimeMs: 5000, errorRatePercent: 5 } },
      brain: { enabled: true, autoSync: true, archiveAfterDays: 90, maxNodesPerTenant: 10000, exportFormat: "obsidian", categories: { provider: true, model: true, agent: true, workflow: true, pipeline: true, mcp: true, onboarding: true, suggestion: false, system: true, event: false } },
      notifications: { providerDown: true, providerRecovered: true, agentCompleted: true, agentFailed: true, workflowFailed: true, deploymentFailed: true, budgetAlert: true, guardAlert: true },
      mcp: { autoDiscoverTools: true, timeoutMs: 30000, maxServersPerTenant: 20 },
      budget: { alertThresholdPercent: 80, currency: "USD", trackByProvider: true, trackByAgent: true, trackByModel: true },
      onboarding: { completed: false },
    };
  }

  private inferCategory(key: string): string {
    const firstPart = key.split(".")[0];
    const knownCategories = ["general", "ai", "providers", "agents", "workflows", "gui", "guard", "brain", "notifications", "mcp", "budget", "onboarding"];
    return knownCategories.includes(firstPart) ? firstPart : "general";
  }
}

export const settingsService = new SettingsService();
