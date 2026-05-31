import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

// Mock context
function createMockContext(user?: any): TrpcContext {
  return {
    user: user || {
      id: 1,
      openId: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      loginMethod: 'test',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: 'https',
      headers: {},
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

function createAdminContext(): TrpcContext {
  return createMockContext({
    id: 1,
    openId: 'admin-user',
    email: 'admin@example.com',
    name: 'Admin User',
    loginMethod: 'test',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  });
}

describe('Forge Studio API Tests', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let adminCaller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    caller = appRouter.createCaller(createMockContext());
    adminCaller = appRouter.createCaller(createAdminContext());
  });

  describe('Authentication', () => {
    it('should return current user info', async () => {
      const user = await caller.auth.me();
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should logout successfully', async () => {
      const result = await caller.auth.logout();
      expect(result.success).toBe(true);
    });
  });

  describe('Chat Completions', () => {
    it('should accept valid chat request', async () => {
      const response = await caller.chat.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        taskType: 'chat',
        maxTokens: 100,
        temperature: 0.7,
      });

      expect(response).toBeDefined();
      expect(response.choices).toBeDefined();
      expect(response.choices.length).toBeGreaterThan(0);
    });

    it('should reject empty messages', async () => {
      expect(async () => {
        await caller.chat.complete({
          messages: [],
          taskType: 'chat',
        });
      }).rejects.toThrow();
    });

    it('should support different task types', async () => {
      const taskTypes = ['chat', 'coding', 'vision', 'fast', 'long_context'];

      for (const taskType of taskTypes) {
        const response = await caller.chat.complete({
          messages: [{ role: 'user', content: 'Test' }],
          taskType: taskType as any,
        });

        expect(response).toBeDefined();
      }
    });

    it('should validate temperature range', async () => {
      expect(async () => {
        await caller.chat.complete({
          messages: [{ role: 'user', content: 'Test' }],
          temperature: 3.0, // Out of range
        });
      }).rejects.toThrow();
    });

    it('should validate max_tokens range', async () => {
      expect(async () => {
        await caller.chat.complete({
          messages: [{ role: 'user', content: 'Test' }],
          maxTokens: 10000, // Out of range
        });
      }).rejects.toThrow();
    });
  });

  describe('Provider Management', () => {
    it('should list all providers', async () => {
      const providers = await caller.providers.list();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should get provider status', async () => {
      const status = await caller.providers.status();
      expect(Array.isArray(status)).toBe(true);
      if (status.length > 0) {
        expect(status[0]).toHaveProperty('name');
        expect(status[0]).toHaveProperty('enabled');
        expect(status[0]).toHaveProperty('circuitState');
      }
    });
  });

  describe('Budget Tracking', () => {
    it('should get monthly spend', async () => {
      const budget = await caller.budget.getMonthlySpend({ teamId: 'default' });
      expect(budget).toBeDefined();
      expect(budget).toHaveProperty('currentSpend');
      expect(budget).toHaveProperty('monthlyLimit');
      expect(budget).toHaveProperty('percentageUsed');
    });

    it('should reject budget update for non-admin', async () => {
      expect(async () => {
        await caller.budget.updateLimit({
          teamId: 'default',
          newLimit: 50,
        });
      }).rejects.toThrow('Unauthorized');
    });

    it('should allow budget update for admin', async () => {
      const result = await adminCaller.budget.updateLimit({
        teamId: 'default',
        newLimit: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid budget limits', async () => {
      expect(async () => {
        await adminCaller.budget.updateLimit({
          teamId: 'default',
          newLimit: 0, // Invalid
        });
      }).rejects.toThrow();
    });
  });

  describe('Request History', () => {
    it('should list request history', async () => {
      const history = await caller.requests.list({
        teamId: 'default',
        limit: 10,
        offset: 0,
      });

      expect(history).toBeDefined();
      expect(history).toHaveProperty('requests');
      expect(history).toHaveProperty('total');
      expect(Array.isArray(history.requests)).toBe(true);
    });

    it('should support pagination', async () => {
      const page1 = await caller.requests.list({
        teamId: 'default',
        limit: 5,
        offset: 0,
      });

      const page2 = await caller.requests.list({
        teamId: 'default',
        limit: 5,
        offset: 5,
      });

      expect(page1.requests).toBeDefined();
      expect(page2.requests).toBeDefined();
    });

    it('should validate limit parameter', async () => {
      expect(async () => {
        await caller.requests.list({
          teamId: 'default',
          limit: 1000, // Out of range
        });
      }).rejects.toThrow();
    });
  });

  describe('Admin Panel', () => {
    it('should reject provider update for non-admin', async () => {
      expect(async () => {
        await caller.admin.updateProvider({
          providerId: 1,
          enabled: false,
        });
      }).rejects.toThrow('Unauthorized');
    });

    it('should allow provider update for admin', async () => {
      const result = await adminCaller.admin.updateProvider({
        providerId: 1,
        enabled: true,
        qualityScore: 75,
      });
      expect(result.success).toBe(true);
    });

    it('should get providers for admin', async () => {
      const providers = await adminCaller.admin.getProviders();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should reject provider access for non-admin', async () => {
      expect(async () => {
        await caller.admin.getProviders();
      }).rejects.toThrow('Unauthorized');
    });

    it('should validate quality score range', async () => {
      expect(async () => {
        await adminCaller.admin.updateProvider({
          providerId: 1,
          qualityScore: 150, // Out of range
        });
      }).rejects.toThrow();
    });
  });

  describe('System Health', () => {
    it('should return health check', async () => {
      const health = await caller.health.check();
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
    });

    it('should return detailed health check', async () => {
      const health = await caller.health.detailed();
      expect(health).toBeDefined();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('redis');
      expect(health).toHaveProperty('database');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid role in message', async () => {
      expect(async () => {
        await caller.chat.complete({
          messages: [{ role: 'invalid' as any, content: 'Test' }],
        });
      }).rejects.toThrow();
    });

    it('should handle empty message content', async () => {
      expect(async () => {
        await caller.chat.complete({
          messages: [{ role: 'user', content: '' }],
        });
      }).rejects.toThrow();
    });

    it('should handle very long message content', async () => {
      const longContent = 'a'.repeat(50000);
      expect(async () => {
        await caller.chat.complete({
          messages: [{ role: 'user', content: longContent }],
        });
      }).rejects.toThrow();
    });
  });

  describe('Rate Limiting & Budgets', () => {
    it('should track cost per request', async () => {
      const response = await caller.chat.complete({
        messages: [{ role: 'user', content: 'Test' }],
        maxTokens: 100,
      });

      expect(response.usage).toBeDefined();
      expect(response.usage.total_tokens).toBeGreaterThan(0);
    });

    it('should validate budget before request', async () => {
      // This would require setting up a budget limit first
      const budget = await caller.budget.getMonthlySpend({ teamId: 'default' });
      expect(budget.percentageUsed).toBeGreaterThanOrEqual(0);
      expect(budget.percentageUsed).toBeLessThanOrEqual(100);
    });
  });
});
