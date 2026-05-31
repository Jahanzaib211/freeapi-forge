export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export interface TokenPayload {
  sub: string | number;
  email: string;
  name: string;
  role: string;
  tenantId: string | number | null;
  tenantRole: string | null;
  iat: number;
  exp: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  tenantId: number | null;
  tenantRole: string | null;
}

export interface SessionData {
  userId: number;
  tenantId: number | null;
  roles: string[];
  refreshToken: string;
  expiresAt: Date;
}
