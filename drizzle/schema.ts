import { boolean, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

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

// ─── AGENTS (Agent Builder — autonomous agents with ReAct loop) ────────────
export const agentTypeEnum = pgEnum("agentType", ["chat", "workflow", "monitor", "data", "orchestrator"]);
export const agentStatusEnum = pgEnum("agentStatus", ["active", "paused", "error", "creating"]);

export const agents = pgTable("agents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: agentTypeEnum("type").notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt"),
  model: varchar("model", { length: 255 }).default("fast-8b"),
  tools: text("tools").array(),
  mcpServerIds: text("mcpServerIds").array(),
  config: text("config").notNull(),
  status: agentStatusEnum("status").default("creating").notNull(),
  version: integer("version").default(1).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  totalRuns: integer("totalRuns").default(0).notNull(),
  totalCost: integer("totalCost").default(0).notNull(),
  budgetUsd: integer("budgetUsd").default(10).notNull(),
  enabled: integer("enabled").default(1).notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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

// ─── AGENT RUNS ──────────────────────────────────────────────────────────────
export const agentRuns = pgTable("agentRuns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: integer("agentId").notNull(),
  tenantId: integer("tenantId").notNull(),
  trigger: varchar("trigger", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).default("running").notNull(),
  steps: integer("steps").default(0).notNull(),
  toolCalls: text("toolCalls"),
  totalCost: integer("totalCost").default(0).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  error: text("error"),
});

export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = typeof agentRuns.$inferInsert;

// ─── AGENT MEMORIES ──────────────────────────────────────────────────────────
export const agentMemories = pgTable("agentMemories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: integer("agentId").notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  content: text("content").notNull(),
  tokens: integer("tokens").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentMemory = typeof agentMemories.$inferSelect;
export type InsertAgentMemory = typeof agentMemories.$inferInsert;

// ─── TOOL APPROVALS ──────────────────────────────────────────────────────────
export const toolApprovals = pgTable("toolApprovals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentRunId: integer("agentRunId").notNull(),
  toolName: varchar("toolName", { length: 255 }).notNull(),
  params: text("params"),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  reviewedBy: integer("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ToolApproval = typeof toolApprovals.$inferSelect;
export type InsertToolApproval = typeof toolApprovals.$inferInsert;

// ─── MCP REGISTRY (Marketplace Catalog) ──────────────────────────────────────
export const tierEnum = pgEnum("tier", ["free", "pro", "enterprise"]);
export const mcpCategoryEnum = pgEnum("mcpCategory", [
  "developer-tools", "data", "search", "communication", "ai",
  "automation", "security", "productivity", "database", "file-management",
]);

export const mcpRegistry = pgTable("mcpRegistry", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  version: varchar("version", { length: 32 }).default("1.0.0").notNull(),
  author: varchar("author", { length: 255 }),
  category: mcpCategoryEnum("category").default("developer-tools").notNull(),
  icon: varchar("icon", { length: 64 }).default("🔌"),
  tier: tierEnum("tier").default("free").notNull(),
  installCount: integer("installCount").default(0).notNull(),
  rating: integer("rating").default(0).notNull(),
  reviewCount: integer("reviewCount").default(0).notNull(),
  tools: text("tools"),
  resources: text("resources"),
  prompts: text("prompts"),
  configSchema: text("configSchema"),
  officialUrl: varchar("officialUrl", { length: 1024 }),
  githubUrl: varchar("githubUrl", { length: 1024 }),
  npmPackage: varchar("npmPackage", { length: 255 }),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  featured: integer("featured").default(0).notNull(),
  tags: text("tags"),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type McpRegistry = typeof mcpRegistry.$inferSelect;
export type InsertMcpRegistry = typeof mcpRegistry.$inferInsert;

// ─── MCP USAGE LOG ───────────────────────────────────────────────────────────
export const mcpUsageLog = pgTable("mcpUsageLog", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  userId: integer("userId"),
  mcpServerId: integer("mcpServerId").notNull(),
  toolName: varchar("toolName", { length: 255 }).notNull(),
  inputParams: text("inputParams"),
  outputResult: text("outputResult"),
  durationMs: integer("durationMs").default(0).notNull(),
  success: integer("success").default(1).notNull(),
  errorMessage: text("errorMessage"),
  tokensUsed: integer("tokensUsed").default(0).notNull(),
  costUsd: integer("costUsd").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type McpUsageLog = typeof mcpUsageLog.$inferSelect;
export type InsertMcpUsageLog = typeof mcpUsageLog.$inferInsert;

// ─── MCP REVIEWS ──────────────────────────────────────────────────────────────
export const mcpReviews = pgTable("mcpReviews", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  userId: integer("userId"),
  mcpServerId: integer("mcpServerId").notNull(),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  review: text("review"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type McpReview = typeof mcpReviews.$inferSelect;
export type InsertMcpReview = typeof mcpReviews.$inferInsert;

// ─── SUBSCRIPTION PLANS ──────────────────────────────────────────────────────
export const subscriptionPlans = pgTable("subscriptionPlans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  priceMonthlyUsd: integer("priceMonthlyUsd").default(0).notNull(),
  maxMcpServers: integer("maxMcpServers").default(10).notNull(),
  maxToolCallsPerDay: integer("maxToolCallsPerDay").default(100).notNull(),
  features: text("features"),
  stripePriceId: varchar("stripePriceId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

// ─── TENANT SUBSCRIPTIONS ─────────────────────────────────────────────────────
export const tenantSubscriptions = pgTable("tenantSubscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull().unique(),
  planId: integer("planId").notNull(),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  trialEndsAt: timestamp("trialEndsAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type InsertTenantSubscription = typeof tenantSubscriptions.$inferInsert;

// ─── WORKFLOWS ────────────────────────────────────────────────────────────────
export const workflowStatusEnum = pgEnum("workflowStatus", ["draft", "active", "paused", "archived"]);
export const workflowTriggerEnum = pgEnum("workflowTrigger", ["manual", "cron", "webhook", "event", "chat_command", "agent_completion"]);

export const workflows = pgTable("workflows", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: integer("version").default(1).notNull(),
  status: workflowStatusEnum("status").default("draft").notNull(),
  triggerType: workflowTriggerEnum("triggerType").default("manual").notNull(),
  triggerConfig: text("triggerConfig"),
  graph: text("graph"),
  settings: text("settings"),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  totalRuns: integer("totalRuns").default(0).notNull(),
  successCount: integer("successCount").default(0).notNull(),
  errorCount: integer("errorCount").default(0).notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;

// ─── WORKFLOW VERSIONS ────────────────────────────────────────────────────────
export const workflowVersions = pgTable("workflowVersions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  workflowId: integer("workflowId").notNull(),
  version: integer("version").notNull(),
  graph: text("graph"),
  changelog: text("changelog"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkflowVersion = typeof workflowVersions.$inferSelect;
export type InsertWorkflowVersion = typeof workflowVersions.$inferInsert;

// ─── WORKFLOW RUNS ────────────────────────────────────────────────────────────
export const workflowRuns = pgTable("workflowRuns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  workflowId: integer("workflowId").notNull(),
  tenantId: integer("tenantId").notNull(),
  version: integer("version").default(1).notNull(),
  triggerType: varchar("triggerType", { length: 32 }).notNull(),
  triggerData: text("triggerData"),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  currentNodeId: varchar("currentNodeId", { length: 64 }),
  totalNodes: integer("totalNodes").default(0).notNull(),
  completedNodes: integer("completedNodes").default(0).notNull(),
  input: text("input"),
  output: text("output"),
  error: text("error"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  durationMs: integer("durationMs").default(0).notNull(),
  costUsd: integer("costUsd").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type InsertWorkflowRun = typeof workflowRuns.$inferInsert;

// ─── WORKFLOW NODE RUNS ───────────────────────────────────────────────────────
export const workflowNodeRuns = pgTable("workflowNodeRuns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  workflowRunId: integer("workflowRunId").notNull(),
  nodeId: varchar("nodeId", { length: 64 }).notNull(),
  nodeType: varchar("nodeType", { length: 32 }).notNull(),
  nodeName: varchar("nodeName", { length: 255 }),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  input: text("input"),
  output: text("output"),
  error: text("error"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  durationMs: integer("durationMs").default(0).notNull(),
  retryCount: integer("retryCount").default(0).notNull(),
  metadata: text("metadata"),
});

export type WorkflowNodeRun = typeof workflowNodeRuns.$inferSelect;
export type InsertWorkflowNodeRun = typeof workflowNodeRuns.$inferInsert;

// ─── WORKFLOW WEBHOOKS ────────────────────────────────────────────────────────
export const workflowWebhooks = pgTable("workflowWebhooks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  workflowId: integer("workflowId").notNull(),
  tenantId: integer("tenantId").notNull(),
  path: varchar("path", { length: 255 }).notNull().unique(),
  secret: varchar("secret", { length: 255 }),
  lastReceivedAt: timestamp("lastReceivedAt"),
  requestCount: integer("requestCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkflowWebhook = typeof workflowWebhooks.$inferSelect;
export type InsertWorkflowWebhook = typeof workflowWebhooks.$inferInsert;

// ─── GITHUB TOKENS ──────────────────────────────────────────────────────────────
export const githubTokens = pgTable("githubTokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  token: text("token").notNull(),
  scopes: text("scopes"),
  username: varchar("username", { length: 128 }),
  rateLimitRemaining: integer("rateLimitRemaining").default(5000).notNull(),
  rateLimitReset: timestamp("rateLimitReset"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type GithubToken = typeof githubTokens.$inferSelect;
export type InsertGithubToken = typeof githubTokens.$inferInsert;

// ─── GITHUB ACTIONS RUNS ────────────────────────────────────────────────────────
export const githubActionsRuns = pgTable("githubActionsRuns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  repoFullName: varchar("repoFullName", { length: 255 }).notNull(),
  runId: integer("runId").notNull(),
  runNumber: integer("runNumber"),
  workflowName: varchar("workflowName", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  conclusion: varchar("conclusion", { length: 32 }),
  event: varchar("event", { length: 32 }),
  branch: varchar("branch", { length: 255 }),
  commitSha: varchar("commitSha", { length: 40 }),
  commitMessage: text("commitMessage"),
  actor: varchar("actor", { length: 128 }),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  durationMs: integer("durationMs").default(0).notNull(),
  jobsJson: text("jobsJson"),
  annotationsJson: text("annotationsJson"),
  htmlUrl: varchar("htmlUrl", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GithubActionsRun = typeof githubActionsRuns.$inferSelect;
export type InsertGithubActionsRun = typeof githubActionsRuns.$inferInsert;

// ─── DEPLOYMENT ALERTS ──────────────────────────────────────────────────────────
export const deploymentAlerts = pgTable("deploymentAlerts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  runId: integer("runId").notNull(),
  alertType: varchar("alertType", { length: 32 }).notNull(),
  severity: varchar("severity", { length: 16 }).notNull(),
  message: text("message").notNull(),
  isRead: integer("isRead").default(0).notNull(),
  dismissedAt: timestamp("dismissedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeploymentAlert = typeof deploymentAlerts.$inferSelect;
export type InsertDeploymentAlert = typeof deploymentAlerts.$inferInsert;

// ─── PROVIDER REGISTRY (global catalog, no tenantId) ─────────────────────────
export const providerRegistry = pgTable("providerRegistry", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull(),
  description: text("description"),
  websiteUrl: text("websiteUrl"),
  apiDocsUrl: text("apiDocsUrl"),
  authType: text("authType").notNull(),
  baseUrl: text("baseUrl").notNull(),
  modelsEndpoint: text("modelsEndpoint").notNull(),
  icon: text("icon"),
  supportedFeatures: text("supportedFeatures"),
  pricingModel: text("pricingModel"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProviderRegistry = typeof providerRegistry.$inferSelect;
export type InsertProviderRegistry = typeof providerRegistry.$inferInsert;

// ─── TENANT PROVIDER CONFIGS (per-tenant connection to a provider) ────────────
export const tenantProviderConfigs = pgTable("tenantProviderConfigs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  providerRegistryId: integer("providerRegistryId").notNull().references(() => providerRegistry.id),
  apiKeyEncrypted: text("apiKeyEncrypted"),
  isActive: boolean("isActive").notNull().default(true),
  enabledModelIds: text("enabledModelIds"),
  customConfig: text("customConfig"),
  lastHealthCheck: timestamp("lastHealthCheck"),
  lastHealthStatus: text("lastHealthStatus"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TenantProviderConfig = typeof tenantProviderConfigs.$inferSelect;
export type InsertTenantProviderConfig = typeof tenantProviderConfigs.$inferInsert;

// ─── ONBOARDING PROFILES ─────────────────────────────────────────────────────
export const onboardingProfiles = pgTable("onboardingProfiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  useCase: text("useCase"),
  preferredProviders: text("preferredProviders"),
  preferredModels: text("preferredModels"),
  autoConfigApplied: text("autoConfigApplied"),
  questionnaireVersion: integer("questionnaireVersion").notNull().default(1),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OnboardingProfile = typeof onboardingProfiles.$inferSelect;
export type InsertOnboardingProfile = typeof onboardingProfiles.$inferInsert;

// ─── SUGGESTION DISMISSALS ───────────────────────────────────────────────────
export const suggestionDismissals = pgTable("suggestionDismissals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  suggestionType: text("suggestionType").notNull(),
  suggestionKey: text("suggestionKey").notNull(),
  dismissedAt: timestamp("dismissedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type SuggestionDismissal = typeof suggestionDismissals.$inferSelect;
export type InsertSuggestionDismissal = typeof suggestionDismissals.$inferInsert;

// ─── MODEL BENCHMARKS ────────────────────────────────────────────────────────
export const modelBenchmarks = pgTable("modelBenchmarks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  modelId: text("modelId").notNull(),
  provider: text("provider").notNull(),
  prompt: text("prompt").notNull(),
  response: text("response"),
  tokensUsed: integer("tokensUsed"),
  durationMs: integer("durationMs"),
  qualityScore: integer("qualityScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ModelBenchmark = typeof modelBenchmarks.$inferSelect;
export type InsertModelBenchmark = typeof modelBenchmarks.$inferInsert;

// ─── TRACKED REPOS ───────────────────────────────────────────────────────────
export const trackedRepos = pgTable("trackedRepos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  githubRepoId: integer("githubRepoId"),
  fullName: text("fullName").notNull(),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  description: text("description"),
  language: text("language"),
  stars: integer("stars"),
  forks: integer("forks"),
  topics: text("topics"),
  readmeHtml: text("readmeHtml"),
  lastCheckedAt: timestamp("lastCheckedAt"),
  lastCommitAt: timestamp("lastCommitAt"),
  lastReleaseAt: timestamp("lastReleaseAt"),
  trackedBy: text("trackedBy"),
  notificationEnabled: boolean("notificationEnabled").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TrackedRepo = typeof trackedRepos.$inferSelect;
export type InsertTrackedRepo = typeof trackedRepos.$inferInsert;

// ─── MEMORY NODES (Forge Brain) ──────────────────────────────────────────────
export const memoryNodes = pgTable("memoryNodes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  nodeType: text("nodeType").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  filePath: text("filePath").notNull(),
  frontmatter: text("frontmatter"),
  backlinks: text("backlinks"),
  outboundLinks: text("outboundLinks"),
  tags: text("tags"),
  status: text("status").notNull().default("active"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantSlugUnique: uniqueIndex("memoryNodes_tenantId_slug_unique").on(table.tenantId, table.slug),
}));

export type MemoryNode = typeof memoryNodes.$inferSelect;
export type InsertMemoryNode = typeof memoryNodes.$inferInsert;

// ─── MEMORY EVENTS (Forge Brain audit log) ───────────────────────────────────
export const memoryEvents = pgTable("memoryEvents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenantId").notNull(),
  nodeSlug: text("nodeSlug").notNull(),
  eventType: text("eventType").notNull(),
  eventData: text("eventData"),
  source: text("source").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemoryEvent = typeof memoryEvents.$inferSelect;
export type InsertMemoryEvent = typeof memoryEvents.$inferInsert;
