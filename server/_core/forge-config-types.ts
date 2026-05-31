import { ForgeConfig, DEFAULT_CONFIG } from "../../forge.config";

let _config: ForgeConfig | null = null;

export function loadConfig(): ForgeConfig {
  if (_config) return _config;

  const env = process.env.NODE_ENV || "development";

  _config = {
    ...DEFAULT_CONFIG,
    studio: {
      ...DEFAULT_CONFIG.studio,
      environment: env as "development" | "production",
    },
    features: {
      ...DEFAULT_CONFIG.features,
      onboarding: env !== "production" || process.env.FEATURE_ONBOARDING !== "false",
      suggestions: process.env.FEATURE_SUGGESTIONS !== "false",
      forgeBrain: process.env.FEATURE_BRAIN !== "false",
      taskSystem: process.env.FEATURE_TASKS !== "false",
      sse: process.env.FEATURE_SSE !== "false",
      guardMonitor: process.env.FEATURE_GUARD !== "false",
      githubExplorer: process.env.FEATURE_GITHUB !== "false",
    },
    defaults: {
      ...DEFAULT_CONFIG.defaults,
      maxAgents: parseInt(process.env.MAX_AGENTS || String(DEFAULT_CONFIG.defaults.maxAgents), 10),
      maxWorkflows: parseInt(process.env.MAX_WORKFLOWS || String(DEFAULT_CONFIG.defaults.maxWorkflows), 10),
      maxMcpServers: parseInt(process.env.MAX_MCP_SERVERS || String(DEFAULT_CONFIG.defaults.maxMcpServers), 10),
      pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || String(DEFAULT_CONFIG.defaults.pollIntervalMs), 10),
    },
    security: {
      ...DEFAULT_CONFIG.security,
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || String(DEFAULT_CONFIG.security.bcryptRounds), 10),
      accessTokenExpiryMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRY_MINUTES || String(DEFAULT_CONFIG.security.accessTokenExpiryMinutes), 10),
    },
  };

  console.log(`[Config] Loaded — ${_config.studio.name} v${_config.studio.version} (${_config.studio.environment})`);
  return _config;
}

export function getConfig(): ForgeConfig {
  if (!_config) return loadConfig();
  return _config;
}

export function isFeatureEnabled(feature: keyof ForgeConfig["features"]): boolean {
  return getConfig().features[feature];
}
