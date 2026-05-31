export interface TenantContext {
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: string;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  ownerId: number;
  monthlyBudgetUsd?: number;
  maxProviders?: number;
  maxModels?: number;
}

export interface UpdateTenantInput {
  name?: string;
  monthlyBudgetUsd?: number;
  maxProviders?: number;
  maxModels?: number;
  status?: "active" | "provisioning" | "terminated" | "suspended";
}

export interface TenantUserInput {
  tenantId: number;
  userId: number;
  role: "owner" | "admin" | "member" | "viewer";
}

export interface TenantWithStats {
  id: number;
  name: string;
  slug: string;
  ownerId: number;
  status: string;
  monthlyBudgetUsd: number;
  maxProviders: number;
  maxModels: number;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  providerCount?: number;
  modelCount?: number;
}
