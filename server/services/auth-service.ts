import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcrypt";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { users, sessions, tenantUsers } from "../../drizzle/schema";
import type { AuthTokens, TokenPayload, RegisterInput, LoginInput, AuthUser } from "../../shared/types/auth";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const BCRYPT_ROUNDS = 12;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "forge-studio-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array {
  const secret = (process.env.JWT_SECRET || "forge-studio-dev-secret") + "-refresh";
  return new TextEncoder().encode(secret);
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthTokens & { user: AuthUser }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existingUser.length > 0) {
      throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const openId = `email:${input.email}`;

    const result = await db.insert(users).values({
      openId,
      email: input.email,
      name: input.name,
      passwordHash,
      loginMethod: "email",
      role: "user",
    }).returning({ id: users.id });

    const userId = result[0].id;

    // Auto-join default tenant as member
    try {
      await db.insert(tenantUsers).values({
        tenantId: 1,
        userId,
        role: "member",
      });
    } catch {
      // Default tenant might not exist yet
    }

    const tokens = await this.generateTokens(userId, input.email, input.name, "user", 1, "member");
    await this.storeSession(userId, 1, ["user"], tokens.refreshToken);

    const user: AuthUser = {
      id: userId,
      email: input.email,
      name: input.name,
      role: "user",
      tenantId: 1,
      tenantRole: "member",
    };

    return { ...tokens, user };
  }

  async login(input: LoginInput): Promise<AuthTokens & { user: AuthUser }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (result.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = result[0];
    if (!user.passwordHash) {
      throw new Error("Account uses external login. Please use OAuth.");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    // Get tenant role
    let tenantId: number | null = null;
    let tenantRole: string | null = null;
    const tenantMembership = await db.select().from(tenantUsers).where(eq(tenantUsers.userId, user.id)).limit(1);
    if (tenantMembership.length > 0) {
      tenantId = tenantMembership[0].tenantId;
      tenantRole = tenantMembership[0].role;
    }

    const tokens = await this.generateTokens(user.id, user.email || "", user.name || "", user.role, tenantId, tenantRole);
    await this.storeSession(user.id, tenantId, [user.role], tokens.refreshToken);

    // Update lastSignedIn
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || "",
      name: user.name || "",
      role: user.role,
      tenantId,
      tenantRole,
    };

    return { ...tokens, user: authUser };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify the refresh token JWT
    let payload: JWTPayload;
    try {
      const result = await jwtVerify(refreshToken, getRefreshSecret());
      payload = result.payload;
    } catch {
      throw new Error("Invalid or expired refresh token");
    }

    // Check session exists in DB
    const sessionId = payload.sub as string;
    const sessionResult = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (sessionResult.length === 0) {
      throw new Error("Session not found");
    }

    const session = sessionResult[0];

    // Rotate: delete old session, create new one
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    // Get fresh user data
    const userResult = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (userResult.length === 0) {
      throw new Error("User not found");
    }

    const user = userResult[0];
    const tokens = await this.generateTokens(
      user.id, user.email || "", user.name || "", user.role,
      session.tenantId, session.roles[0] || "user"
    );
    await this.storeSession(user.id, session.tenantId, session.roles, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const result = await jwtVerify(refreshToken, getRefreshSecret());
      const sessionId = result.payload.sub as string;
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    } catch {
      // Token already invalid, that's fine
    }
  }

  async getCurrentUser(accessToken: string): Promise<AuthUser | null> {
    const db = await getDb();
    if (!db) return null;

    let payload: TokenPayload;
    try {
      const result = await jwtVerify(accessToken, getJwtSecret());
      payload = result.payload as unknown as TokenPayload;
    } catch {
      return null;
    }

    const userResult = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (userResult.length === 0) return null;

    const user = userResult[0];

    return {
      id: user.id,
      email: user.email || "",
      name: user.name || "",
      role: user.role,
      tenantId: payload.tenantId,
      tenantRole: payload.tenantRole,
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private async generateTokens(
    userId: number,
    email: string,
    name: string,
    role: string,
    tenantId: number | null,
    tenantRole: string | null
  ): Promise<AuthTokens> {
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await new SignJWT({
      sub: userId,
      email,
      name,
      role,
      tenantId,
      tenantRole,
    } satisfies Partial<TokenPayload>)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(ACCESS_TOKEN_EXPIRY)
      .sign(getJwtSecret());

    const refreshToken = await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(`${REFRESH_TOKEN_EXPIRY_DAYS}d`)
      .sign(getRefreshSecret());

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: "Bearer",
    };
  }

  private async storeSession(
    userId: number,
    tenantId: number | null,
    roles: string[],
    refreshToken: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const sessionId = `session_${userId}_${Date.now()}`;

    await db.insert(sessions).values({
      id: sessionId,
      userId,
      tenantId,
      roles,
      refreshToken,
      expiresAt,
    }).onConflictDoUpdate({
      target: sessions.id,
      set: { refreshToken, expiresAt, roles, tenantId },
    });
  }
}

export const authService = new AuthService();
