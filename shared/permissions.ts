export type Role = "admin" | "developer" | "viewer" | "api_user";
export type TenantRole = "owner" | "admin" | "member" | "viewer";
export type Action = "create" | "read" | "update" | "delete" | "execute";
export type Resource =
  | "tenants"
  | "users"
  | "providers"
  | "models"
  | "chat"
  | "virtualKeys"
  | "budget"
  | "audit"
  | "guardrails"
  | "skills"
  | "agents"
  | "mcpServers"
  | "webhooks"
  | "customProviders"
  | "prompts"
  | "settings"
  | "admin";

export interface Permission {
  resource: Resource;
  action: Action;
}

// Permission matrix: role → resource → allowed actions
export const PERMISSIONS: Record<Role, Record<Resource, Action[]>> = {
  admin: {
    tenants: ["create", "read", "update", "delete"],
    users: ["create", "read", "update", "delete"],
    providers: ["create", "read", "update", "delete"],
    models: ["create", "read", "update", "delete"],
    chat: ["create", "read", "update", "delete"],
    virtualKeys: ["create", "read", "update", "delete"],
    budget: ["create", "read", "update"],
    audit: ["read"],
    guardrails: ["create", "read", "update", "delete"],
    skills: ["create", "read", "update", "delete", "execute"],
    agents: ["create", "read", "update", "delete"],
    mcpServers: ["create", "read", "update", "delete"],
    webhooks: ["create", "read", "update", "delete"],
    customProviders: ["create", "read", "update", "delete"],
    prompts: ["create", "read", "update", "delete"],
    settings: ["read", "update"],
    admin: ["create", "read", "update", "delete"],
  },
  developer: {
    tenants: ["read"],
    users: ["read"],
    providers: ["create", "read", "update"],
    models: ["create", "read", "update"],
    chat: ["create", "read", "update", "delete"],
    virtualKeys: ["create", "read", "update"],
    budget: ["read"],
    audit: [],
    guardrails: ["create", "read", "update"],
    skills: ["create", "read", "update", "execute"],
    agents: ["create", "read", "update", "delete"],
    mcpServers: ["create", "read", "update"],
    webhooks: ["create", "read", "update"],
    customProviders: ["create", "read", "update"],
    prompts: ["create", "read", "update", "delete"],
    settings: ["read"],
    admin: [],
  },
  viewer: {
    tenants: ["read"],
    users: ["read"],
    providers: ["read"],
    models: ["read"],
    chat: ["create", "read"],
    virtualKeys: ["read"],
    budget: ["read"],
    audit: [],
    guardrails: ["read"],
    skills: ["read", "execute"],
    agents: ["read"],
    mcpServers: ["read"],
    webhooks: ["read"],
    customProviders: ["read"],
    prompts: ["read"],
    settings: ["read"],
    admin: [],
  },
  api_user: {
    tenants: [],
    users: [],
    providers: ["read"],
    models: ["read"],
    chat: ["create", "read"],
    virtualKeys: ["read"],
    budget: [],
    audit: [],
    guardrails: [],
    skills: [],
    agents: [],
    mcpServers: [],
    webhooks: [],
    customProviders: [],
    prompts: [],
    settings: [],
    admin: [],
  },
};

// Tenant-level overrides (owner gets everything in their tenant)
export const TENANT_ROLE_PERMISSIONS: Record<TenantRole, Record<Resource, Action[]>> = {
  owner: {
    tenants: ["read", "update"],
    users: ["create", "read", "update", "delete"],
    providers: ["create", "read", "update", "delete"],
    models: ["create", "read", "update", "delete"],
    chat: ["create", "read", "update", "delete"],
    virtualKeys: ["create", "read", "update", "delete"],
    budget: ["create", "read", "update"],
    audit: ["read"],
    guardrails: ["create", "read", "update", "delete"],
    skills: ["create", "read", "update", "delete", "execute"],
    agents: ["create", "read", "update", "delete"],
    mcpServers: ["create", "read", "update", "delete"],
    webhooks: ["create", "read", "update", "delete"],
    customProviders: ["create", "read", "update", "delete"],
    prompts: ["create", "read", "update", "delete"],
    settings: ["read", "update"],
    admin: [],
  },
  admin: {
    tenants: ["read"],
    users: ["create", "read", "update"],
    providers: ["create", "read", "update"],
    models: ["create", "read", "update"],
    chat: ["create", "read", "update", "delete"],
    virtualKeys: ["create", "read", "update"],
    budget: ["read", "update"],
    audit: ["read"],
    guardrails: ["create", "read", "update"],
    skills: ["create", "read", "update", "execute"],
    agents: ["create", "read", "update"],
    mcpServers: ["create", "read", "update"],
    webhooks: ["create", "read", "update"],
    customProviders: ["create", "read", "update"],
    prompts: ["create", "read", "update"],
    settings: ["read"],
    admin: [],
  },
  member: {
    tenants: ["read"],
    users: ["read"],
    providers: ["read"],
    models: ["read"],
    chat: ["create", "read", "update"],
    virtualKeys: ["read"],
    budget: ["read"],
    audit: [],
    guardrails: ["read"],
    skills: ["read", "execute"],
    agents: ["read", "update"],
    mcpServers: ["read"],
    webhooks: ["read"],
    customProviders: ["read"],
    prompts: ["create", "read", "update"],
    settings: ["read"],
    admin: [],
  },
  viewer: {
    tenants: ["read"],
    users: ["read"],
    providers: ["read"],
    models: ["read"],
    chat: ["read"],
    virtualKeys: ["read"],
    budget: ["read"],
    audit: [],
    guardrails: ["read"],
    skills: ["read"],
    agents: ["read"],
    mcpServers: ["read"],
    webhooks: ["read"],
    customProviders: ["read"],
    prompts: ["read"],
    settings: ["read"],
    admin: [],
  },
};

export function hasPermission(
  globalRole: Role,
  tenantRole: TenantRole | null,
  resource: Resource,
  action: Action
): boolean {
  // Check global role permissions first
  const globalPerms = PERMISSIONS[globalRole]?.[resource] ?? [];
  if (globalPerms.includes(action)) return true;

  // Check tenant-level permissions
  if (tenantRole) {
    const tenantPerms = TENANT_ROLE_PERMISSIONS[tenantRole]?.[resource] ?? [];
    if (tenantPerms.includes(action)) return true;
  }

  return false;
}
