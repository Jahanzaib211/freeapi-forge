import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// ─── ENUMS ──────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin", "developer", "viewer", "api_user"]);
export const tenantRoleEnum = pgEnum("tenantRole", ["owner", "admin", "member", "viewer"]);
export const tenantStatusEnum = pgEnum("tenantStatus", ["active", "provisioning", "terminated", "suspended"]);

// ─── TENANTS (multi-tenant core) ─────────────────────────────────────────────
export const tenants = pgTable("tenants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  ownerId: integer("ownerId").notNull(),
  status: tenantStatusEnum("status").default("active").notNull(),
  monthlyBudgetUsd: integer("monthlyBudgetUsd").default(100).notNull(),
  maxProviders: integer("maxProviders").default(10).notNull(),
  maxModels: integer("maxModels").default(50).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ─── TENANT USERS (membership) ───────────────────────────────────────────────
export const tenantUsers = pgTable("tenantUsers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  userId: integer("userId").notNull(),
  role: tenantRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TenantUser = typeof tenantUsers.$inferSelect;
export type InsertTenantUser = typeof tenantUsers.$inferInsert;

// ─── SESSIONS (JWT refresh token storage) ────────────────────────────────────
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: integer("userId").notNull(),
  tenantId: integer("tenantId"),
  roles: text("roles").array().notNull().default(["user"]),
  refreshToken: varchar("refreshToken", { length: 512 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

// ─── USERS ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── TEAMS ───────────────────────────────────────────────────────────────────
export const teams = pgTable("teams", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: integer("ownerId").notNull(),
  tenantId: integer("tenantId"),
  monthlyBudgetUsd: integer("monthlyBudgetUsd").default(10).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// ─── API KEYS ────────────────────────────────────────────────────────────────
export const apiKeys = pgTable("apiKeys", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  teamId: integer("teamId").notNull(),
  tenantId: integer("tenantId"),
  keyHash: varchar("keyHash", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ─── PROVIDERS ───────────────────────────────────────────────────────────────
export const providers = pgTable("providers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  litellmEndpoint: varchar("litellmEndpoint", { length: 512 }).notNull(),
  tenantId: integer("tenantId"),
  enabled: integer("enabled").default(1).notNull(),
  qualityScore: integer("qualityScore").default(50).notNull(),
  latencyMs: integer("latencyMs").default(500).notNull(),
  costPerMToken: integer("costPerMToken").default(100).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Provider = typeof providers.$inferSelect;
export type InsertProvider = typeof providers.$inferInsert;

// ─── REQUEST HISTORY ─────────────────────────────────────────────────────────
export const requestHistory = pgTable("requestHistory", {
  id: varchar("id", { length: 64 }).primaryKey(),
  teamId: integer("teamId").notNull(),
  tenantId: integer("tenantId"),
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

// ─── BUDGET LIMITS ───────────────────────────────────────────────────────────
export const budgetLimits = pgTable("budgetLimits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  teamId: integer("teamId").notNull().unique(),
  tenantId: integer("tenantId"),
  monthlyLimitUsd: integer("monthlyLimitUsd").default(10).notNull(),
  currentSpendUsd: integer("currentSpendUsd").default(0).notNull(),
  monthYear: varchar("monthYear", { length: 7 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BudgetLimit = typeof budgetLimits.$inferSelect;
export type InsertBudgetLimit = typeof budgetLimits.$inferInsert;

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
export const auditLogs = pgTable("auditLogs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId"),
  teamId: integer("teamId"),
  tenantId: integer("tenantId"),
  action: varchar("action", { length: 255 }).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── VIRTUAL KEYS ────────────────────────────────────────────────────────────
export const virtualKeys = pgTable("virtualKeys", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  keyHash: varchar("keyHash", { length: 255 }).notNull().unique(),
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(),
  teamId: integer("teamId").default(1).notNull(),
  tenantId: integer("tenantId"),
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

// ─── ORGANIZATIONS ───────────────────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: integer("ownerId").notNull(),
  tenantId: integer("tenantId"),
  budgetLimitUsd: integer("budgetLimitUsd").default(100).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── ACCESS GROUPS ───────────────────────────────────────────────────────────
export const accessGroups = pgTable("accessGroups", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  tenantId: integer("tenantId"),
  models: text("models").array(),
  mcpServers: text("mcpServers").array(),
  agents: text("agents").array(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccessGroup = typeof accessGroups.$inferSelect;
export type InsertAccessGroup = typeof accessGroups.$inferInsert;

// ─── MCP SERVERS ─────────────────────────────────────────────────────────────
export const mcpServers = pgTable("mcpServers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  transport: varchar("transport", { length: 32 }).notNull().default("sse"),
  url: varchar("url", { length: 1024 }).notNull(),
  tenantId: integer("tenantId"),
  authConfig: text("authConfig"),
  status: varchar("status", { length: 32 }).default("disconnected").notNull(),
  toolCount: integer("toolCount").default(0).notNull(),
  lastSeen: timestamp("lastSeen"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type McpServer = typeof mcpServers.$inferSelect;
export type InsertMcpServer = typeof mcpServers.$inferInsert;

// ─── SKILLS ──────────────────────────────────────────────────────────────────
export const skills = pgTable("skills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  path: varchar("path", { length: 1024 }).notNull(),
  category: varchar("category", { length: 64 }).default("general").notNull(),
  tenantId: integer("tenantId"),
  enabled: integer("enabled").default(1).notNull(),
  lastExecuted: timestamp("lastExecuted"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

// ─── GUARDRAILS ──────────────────────────────────────────────────────────────
export const guardrails = pgTable("guardrails", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 32 }).notNull().default("pre_call"),
  config: text("config"),
  tenantId: integer("tenantId"),
  enabled: integer("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Guardrail = typeof guardrails.$inferSelect;
export type InsertGuardrail = typeof guardrails.$inferInsert;

// ─── POLICIES ────────────────────────────────────────────────────────────────
export const policies = pgTable("policies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  tenantId: integer("tenantId"),
  guardrailIds: text("guardrailIds").array(),
  teamIds: text("teamIds").array(),
  keyIds: text("keyIds").array(),
  modelPatterns: text("modelPatterns").array(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = typeof policies.$inferInsert;

// ─── AGENTS ──────────────────────────────────────────────────────────────────
export const agents = pgTable("agents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  systemPrompt: text("systemPrompt"),
  model: varchar("model", { length: 255 }),
  tools: text("tools").array(),
  mcpServerIds: text("mcpServerIds").array(),
  tenantId: integer("tenantId"),
  budgetUsd: integer("budgetUsd").default(10).notNull(),
  enabled: integer("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ─── USAGE LOGS ──────────────────────────────────────────────────────────────
export const usageLogs = pgTable("usageLogs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  virtualKeyId: integer("virtualKeyId"),
  teamId: integer("teamId").default(1),
  tenantId: integer("tenantId"),
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

// ─── SYSTEM EVENTS ───────────────────────────────────────────────────────────
export const systemEvents = pgTable("systemEvents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  level: varchar("level", { length: 16 }).notNull().default("info"),
  source: varchar("source", { length: 128 }).notNull(),
  message: text("message").notNull(),
  tenantId: integer("tenantId"),
  stackTrace: text("stackTrace"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SystemEvent = typeof systemEvents.$inferSelect;
export type InsertSystemEvent = typeof systemEvents.$inferInsert;

// ─── CUSTOM PROVIDERS ────────────────────────────────────────────────────────
export const customProviders = pgTable("customProviders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  apiUrl: varchar("apiUrl", { length: 1024 }).notNull(),
  apiKey: varchar("apiKey", { length: 1024 }).notNull(),
  models: text("models").notNull(),
  tenantId: integer("tenantId"),
  enabled: integer("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomProvider = typeof customProviders.$inferSelect;
export type InsertCustomProvider = typeof customProviders.$inferInsert;

// ─── PROMPT LIBRARY ──────────────────────────────────────────────────────────
export const promptLibrary = pgTable("promptLibrary", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 64 }).default("general").notNull(),
  tags: text("tags").array(),
  version: integer("version").default(1).notNull(),
  forkedFrom: integer("forkedFrom"),
  createdBy: integer("createdBy"),
  tenantId: integer("tenantId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PromptLibrary = typeof promptLibrary.$inferSelect;
export type InsertPromptLibrary = typeof promptLibrary.$inferInsert;

// ─── WEBHOOKS ────────────────────────────────────────────────────────────────
export const webhooks = pgTable("webhooks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  secret: varchar("secret", { length: 255 }),
  events: text("events").array(),
  tenantId: integer("tenantId"),
  enabled: integer("enabled").default(1).notNull(),
  lastTriggered: timestamp("lastTriggered"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

// ─── CACHE ENTRIES ───────────────────────────────────────────────────────────
export const cacheEntries = pgTable("cacheEntries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  response: text("response").notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  tenantId: integer("tenantId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type CacheEntry = typeof cacheEntries.$inferSelect;

// ─── CONVERSATIONS ───────────────────────────────────────────────────────────
export const conversations = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 500 }).default("New Chat").notNull(),
  systemPrompt: text("systemPrompt"),
  model: varchar("model", { length: 255 }),
  messageCount: integer("messageCount").default(0).notNull(),
  totalTokens: integer("totalTokens").default(0).notNull(),
  totalCostUsd: integer("totalCostUsd").default(0).notNull(),
  forkedFrom: integer("forkedFrom"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ─── MESSAGES ────────────────────────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversationId").notNull(),
  tenantId: integer("tenantId").notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  content: text("content").notNull(),
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

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── DOCUMENTS (RAG) ─────────────────────────────────────────────────────────
export const documents = pgTable("documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  chunkCount: integer("chunkCount").default(0).notNull(),
  totalTokens: integer("totalTokens").default(0).notNull(),
  uploadedBy: integer("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── DOCUMENT CHUNKS (RAG) ───────────────────────────────────────────────────
export const documentChunks = pgTable("documentChunks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  documentId: integer("documentId").notNull(),
  tenantId: integer("tenantId").notNull(),
  chunkIndex: integer("chunkIndex").notNull(),
  content: text("content").notNull(),
  tokenCount: integer("tokenCount").default(0).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = typeof documentChunks.$inferInsert;

// ─── DISCORD CONFIGS ─────────────────────────────────────────────────────────
export const discordConfigs = pgTable("discordConfigs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  botToken: varchar("botToken", { length: 512 }),
  guildId: varchar("guildId", { length: 64 }),
  channelId: varchar("channelId", { length: 64 }),
  enabled: integer("enabled").default(0).notNull(),
  model: varchar("model", { length: 255 }).default("fast-8b"),
  systemPrompt: text("systemPrompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DiscordConfig = typeof discordConfigs.$inferSelect;
export type InsertDiscordConfig = typeof discordConfigs.$inferInsert;
