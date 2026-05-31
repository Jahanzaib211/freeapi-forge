import { relations } from "drizzle-orm";
import {
  users, teams, apiKeys, providers, requestHistory, budgetLimits,
  auditLogs, virtualKeys, organizations, accessGroups, mcpServers,
  skills, guardrails, policies, agents, usageLogs, systemEvents,
  customProviders, promptLibrary, webhooks, cacheEntries,
  tenants, tenantUsers, sessions,
} from "./schema";

// ─── TENANTS ─────────────────────────────────────────────────────────────────
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  owner: one(users, { fields: [tenants.ownerId], references: [users.id] }),
  members: many(tenantUsers),
  teams: many(teams),
  providers: many(providers),
  virtualKeys: many(virtualKeys),
  requestHistory: many(requestHistory),
  budgetLimits: many(budgetLimits),
  auditLogs: many(auditLogs),
  usageLogs: many(usageLogs),
  customProviders: many(customProviders),
  webhooks: many(webhooks),
  skills: many(skills),
  guardrails: many(guardrails),
  agents: many(agents),
  mcpServers: many(mcpServers),
}));

// ─── TENANT USERS ────────────────────────────────────────────────────────────
export const tenantUsersRelations = relations(tenantUsers, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantUsers.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [tenantUsers.userId], references: [users.id] }),
}));

// ─── SESSIONS ────────────────────────────────────────────────────────────────
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [sessions.tenantId], references: [tenants.id] }),
}));

// ─── USERS ───────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams),
  tenantMemberships: many(tenantUsers),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
}));

// ─── TEAMS ───────────────────────────────────────────────────────────────────
export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, { fields: [teams.ownerId], references: [users.id] }),
  tenant: one(tenants, { fields: [teams.tenantId], references: [tenants.id] }),
  apiKeys: many(apiKeys),
  requestHistory: many(requestHistory),
  budgetLimits: many(budgetLimits),
  virtualKeys: many(virtualKeys),
}));

// ─── API KEYS ────────────────────────────────────────────────────────────────
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  team: one(teams, { fields: [apiKeys.teamId], references: [teams.id] }),
  tenant: one(tenants, { fields: [apiKeys.tenantId], references: [tenants.id] }),
}));

// ─── PROVIDERS ───────────────────────────────────────────────────────────────
export const providersRelations = relations(providers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [providers.tenantId], references: [tenants.id] }),
  requestHistory: many(requestHistory),
}));

// ─── REQUEST HISTORY ─────────────────────────────────────────────────────────
export const requestHistoryRelations = relations(requestHistory, ({ one }) => ({
  team: one(teams, { fields: [requestHistory.teamId], references: [teams.id] }),
  provider: one(providers, { fields: [requestHistory.providerId], references: [providers.id] }),
  tenant: one(tenants, { fields: [requestHistory.tenantId], references: [tenants.id] }),
}));

// ─── BUDGET LIMITS ───────────────────────────────────────────────────────────
export const budgetLimitsRelations = relations(budgetLimits, ({ one }) => ({
  team: one(teams, { fields: [budgetLimits.teamId], references: [teams.id] }),
  tenant: one(tenants, { fields: [budgetLimits.tenantId], references: [tenants.id] }),
}));

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
  team: one(teams, { fields: [auditLogs.teamId], references: [teams.id] }),
  tenant: one(tenants, { fields: [auditLogs.tenantId], references: [tenants.id] }),
}));

// ─── VIRTUAL KEYS ────────────────────────────────────────────────────────────
export const virtualKeysRelations = relations(virtualKeys, ({ one }) => ({
  team: one(teams, { fields: [virtualKeys.teamId], references: [teams.id] }),
  tenant: one(tenants, { fields: [virtualKeys.tenantId], references: [tenants.id] }),
}));

// ─── ORGANIZATIONS ───────────────────────────────────────────────────────────
export const organizationsRelations = relations(organizations, ({ one }) => ({
  owner: one(users, { fields: [organizations.ownerId], references: [users.id] }),
  tenant: one(tenants, { fields: [organizations.tenantId], references: [tenants.id] }),
}));

// ─── ACCESS GROUPS ───────────────────────────────────────────────────────────
export const accessGroupsRelations = relations(accessGroups, ({ one }) => ({
  tenant: one(tenants, { fields: [accessGroups.tenantId], references: [tenants.id] }),
}));

// ─── MCP SERVERS ─────────────────────────────────────────────────────────────
export const mcpServersRelations = relations(mcpServers, ({ one }) => ({
  tenant: one(tenants, { fields: [mcpServers.tenantId], references: [tenants.id] }),
}));

// ─── SKILLS ──────────────────────────────────────────────────────────────────
export const skillsRelations = relations(skills, ({ one }) => ({
  tenant: one(tenants, { fields: [skills.tenantId], references: [tenants.id] }),
}));

// ─── GUARDRAILS ──────────────────────────────────────────────────────────────
export const guardrailsRelations = relations(guardrails, ({ one }) => ({
  tenant: one(tenants, { fields: [guardrails.tenantId], references: [tenants.id] }),
}));

// ─── POLICIES ────────────────────────────────────────────────────────────────
export const policiesRelations = relations(policies, ({ one }) => ({
  tenant: one(tenants, { fields: [policies.tenantId], references: [tenants.id] }),
}));

// ─── AGENTS ──────────────────────────────────────────────────────────────────
export const agentsRelations = relations(agents, ({ one }) => ({
  tenant: one(tenants, { fields: [agents.tenantId], references: [tenants.id] }),
}));

// ─── USAGE LOGS ──────────────────────────────────────────────────────────────
export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [usageLogs.tenantId], references: [tenants.id] }),
}));

// ─── SYSTEM EVENTS ───────────────────────────────────────────────────────────
export const systemEventsRelations = relations(systemEvents, ({ one }) => ({
  tenant: one(tenants, { fields: [systemEvents.tenantId], references: [tenants.id] }),
}));

// ─── CUSTOM PROVIDERS ────────────────────────────────────────────────────────
export const customProvidersRelations = relations(customProviders, ({ one }) => ({
  tenant: one(tenants, { fields: [customProviders.tenantId], references: [tenants.id] }),
}));

// ─── PROMPT LIBRARY ──────────────────────────────────────────────────────────
export const promptLibraryRelations = relations(promptLibrary, ({ one }) => ({
  creator: one(users, { fields: [promptLibrary.createdBy], references: [users.id] }),
  tenant: one(tenants, { fields: [promptLibrary.tenantId], references: [tenants.id] }),
}));

// ─── WEBHOOKS ────────────────────────────────────────────────────────────────
export const webhooksRelations = relations(webhooks, ({ one }) => ({
  tenant: one(tenants, { fields: [webhooks.tenantId], references: [tenants.id] }),
}));

// ─── CACHE ENTRIES ───────────────────────────────────────────────────────────
export const cacheEntriesRelations = relations(cacheEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [cacheEntries.tenantId], references: [tenants.id] }),
}));
