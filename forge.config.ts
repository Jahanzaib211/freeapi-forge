export interface ForgeConfig {
  studio: {
    name: string;
    version: string;
    environment: "development" | "production";
  };
  features: {
    onboarding: boolean;
    suggestions: boolean;
    forgeBrain: boolean;
    taskSystem: boolean;
    sse: boolean;
    guardMonitor: boolean;
    githubExplorer: boolean;
  };
  defaults: {
    maxAgents: number;
    maxWorkflows: number;
    maxMcpServers: number;
    sessionTimeoutMinutes: number;
    pollIntervalMs: number;
    healthCheckIntervalMs: number;
  };
  security: {
    bcryptRounds: number;
    accessTokenExpiryMinutes: number;
    refreshTokenExpiryDays: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
}

export const DEFAULT_CONFIG: ForgeConfig = {
  studio: {
    name: "Forge Studio",
    version: "3.11.0",
    environment: (process.env.NODE_ENV as "development" | "production") || "development",
  },
  features: {
    onboarding: true,
    suggestions: true,
    forgeBrain: true,
    taskSystem: true,
    sse: true,
    guardMonitor: true,
    githubExplorer: true,
  },
  defaults: {
    maxAgents: 20,
    maxWorkflows: 10,
    maxMcpServers: 30,
    sessionTimeoutMinutes: 60,
    pollIntervalMs: 5000,
    healthCheckIntervalMs: 30000,
  },
  security: {
    bcryptRounds: 12,
    accessTokenExpiryMinutes: 15,
    refreshTokenExpiryDays: 7,
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 100,
  },
};
