import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const teams = pgTable("teams", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: integer("ownerId").notNull(),
  monthlyBudgetUsd: integer("monthlyBudgetUsd").default(10).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

export const apiKeys = pgTable("apiKeys", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  teamId: integer("teamId").notNull(),
  keyHash: varchar("keyHash", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

export const providers = pgTable("providers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  litellmEndpoint: varchar("litellmEndpoint", { length: 512 }).notNull(),
  enabled: integer("enabled").default(1).notNull(),
  qualityScore: integer("qualityScore").default(50).notNull(),
  latencyMs: integer("latencyMs").default(500).notNull(),
  costPerMToken: integer("costPerMToken").default(100).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Provider = typeof providers.$inferSelect;
export type InsertProvider = typeof providers.$inferInsert;

export const requestHistory = pgTable("requestHistory", {
  id: varchar("id", { length: 64 }).primaryKey(),
  teamId: integer("teamId").notNull(),
  providerId: integer("providerId"),
  taskType: varchar("taskType", { length: 32 }).notNull(),
  inputTokens: integer("inputTokens").default(0).notNull(),
  outputTokens: integer("outputTokens").default(0).notNull(),
  totalTokens: integer("totalTokens").default(0).notNull(),
  costUsd: integer("costUsd").default(0).notNull(),
  status: varchar("status", { length: 32 }).default("success").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RequestHistory = typeof requestHistory.$inferSelect;
export type InsertRequestHistory = typeof requestHistory.$inferInsert;

export const budgetLimits = pgTable("budgetLimits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  teamId: integer("teamId").notNull().unique(),
  monthlyLimitUsd: integer("monthlyLimitUsd").default(10).notNull(),
  currentSpendUsd: integer("currentSpendUsd").default(0).notNull(),
  monthYear: varchar("monthYear", { length: 7 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BudgetLimit = typeof budgetLimits.$inferSelect;
export type InsertBudgetLimit = typeof budgetLimits.$inferInsert;

export const auditLogs = pgTable("auditLogs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId"),
  teamId: integer("teamId"),
  action: varchar("action", { length: 255 }).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Virtual Keys
export const virtualKeys = pgTable("virtualKeys", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  keyHash: varchar("keyHash", { length: 255 }).notNull().unique(),
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(),
  teamId: integer("teamId").default(1).notNull(),
  budgetLimitUsd: integer("budgetLimitUsd").default(10).notNull(),
  rateLimitTPM: integer("rateLimitTPM").default(100000).notNull(),
  rateLimitRPM: integer("rateLimitRPM").default(1000).notNull(),
  models: text("models").array(),
  metadata: text("metadata"),
  enabled: integer("enabled").default(1).notNull(),
  spendUsd: integer("spendUsd").default(0).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VirtualKey = typeof virtualKeys.$inferSelect;
export type InsertVirtualKey = typeof virtualKeys.$inferInsert;

// Organizations
export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: integer("ownerId").notNull(),
  budgetLimitUsd: integer("budgetLimitUsd").default(100).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// Access Groups
export const accessGroups = pgTable("accessGroups", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  models: text("models").array(),
  mcpServers: text("mcpServers").array(),
  agents: text("agents").array(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccessGroup = typeof accessGroups.$inferSelect;
export type InsertAccessGroup = typeof accessGroups.$inferInsert;

// MCP Servers
export const mcpServers = pgTable("mcpServers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  transport: varchar("transport", { length: 32 }).notNull().default("sse"),
  url: varchar("url", { length: 1024 }).notNull(),
  authConfig: text("authConfig"),
  status: varchar("status", { length: 32 }).default("disconnected").notNull(),
  toolCount: integer("toolCount").default(0).notNull(),
  lastSeen: timestamp("lastSeen"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type McpServer = typeof mcpServers.$inferSelect;
export type InsertMcpServer = typeof mcpServers.$inferInsert;

// Skills
export const skills = pgTable("skills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  path: varchar("path", { length: 1024 }).notNull(),
  category: varchar("category", { length: 64 }).default("general").notNull(),
  enabled: integer("enabled").default(1).notNull(),
  lastExecuted: timestamp("lastExecuted"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

// Guardrails
export const guardrails = pgTable("guardrails", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 32 }).notNull().default("pre_call"),
  config: text("config"),
  enabled: integer("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Guardrail = typeof guardrails.$inferSelect;
export type InsertGuardrail = typeof guardrails.$inferInsert;

// Policies
export const policies = pgTable("policies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  guardrailIds: text("guardrailIds").array(),
  teamIds: text("teamIds").array(),
  keyIds: text("keyIds").array(),
  modelPatterns: text("modelPatterns").array(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = typeof policies.$inferInsert;

// Agents
export const agents = pgTable("agents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  systemPrompt: text("systemPrompt"),
  model: varchar("model", { length: 255 }),
  tools: text("tools").array(),
  mcpServerIds: text("mcpServerIds").array(),
  budgetUsd: integer("budgetUsd").default(10).notNull(),
  enabled: integer("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// Usage Logs
export const usageLogs = pgTable("usageLogs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  virtualKeyId: integer("virtualKeyId"),
  teamId: integer("teamId").default(1),
  model: varchar("model", { length: 255 }),
  provider: varchar("provider", { length: 128 }),
  promptTokens: integer("promptTokens").default(0).notNull(),
  completionTokens: integer("completionTokens").default(0).notNull(),
  totalTokens: integer("totalTokens").default(0).notNull(),
  costUsd: integer("costUsd").default(0).notNull(),
  latencyMs: integer("latencyMs").default(0).notNull(),
  status: varchar("status", { length: 32 }).default("success").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UsageLog = typeof usageLogs.$inferSelect;
export type InsertUsageLog = typeof usageLogs.$inferInsert;

// System Events (error logging)
export const systemEvents = pgTable("systemEvents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  level: varchar("level", { length: 16 }).notNull().default("info"),
  source: varchar("source", { length: 128 }).notNull(),
  message: text("message").notNull(),
  stackTrace: text("stackTrace"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SystemEvent = typeof systemEvents.$inferSelect;
export type InsertSystemEvent = typeof systemEvents.$inferInsert;

// Custom Providers (Paste-Any-API)
export const customProviders = pgTable("customProviders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  apiUrl: varchar("apiUrl", { length: 1024 }).notNull(),
  apiKey: varchar("apiKey", { length: 1024 }).notNull(),
  models: text("models").notNull(),
  enabled: integer("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomProvider = typeof customProviders.$inferSelect;
export type InsertCustomProvider = typeof customProviders.$inferInsert;

// Prompt Library
export const promptLibrary = pgTable("promptLibrary", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 64 }).default("general").notNull(),
  tags: text("tags").array(),
  version: integer("version").default(1).notNull(),
  forkedFrom: integer("forkedFrom"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PromptLibrary = typeof promptLibrary.$inferSelect;
export type InsertPromptLibrary = typeof promptLibrary.$inferInsert;

// Webhooks
export const webhooks = pgTable("webhooks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  secret: varchar("secret", { length: 255 }),
  events: text("events").array(),
  enabled: integer("enabled").default(1).notNull(),
  lastTriggered: timestamp("lastTriggered"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

export const cacheEntries = pgTable("cacheEntries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  response: text("response").notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type CacheEntry = typeof cacheEntries.$inferSelect;
