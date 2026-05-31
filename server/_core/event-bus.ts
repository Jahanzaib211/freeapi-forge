export const ForgeEvents = {
  PROVIDER_ADDED: "provider.added",
  PROVIDER_REMOVED: "provider.removed",
  MODELS_DISCOVERED: "models.discovered",
  MODEL_TESTED: "model.tested",
  AGENT_CREATED: "agent.created",
  AGENT_UPDATED: "agent.updated",
  AGENT_DELETED: "agent.deleted",
  AGENT_RUN_STARTED: "agent.run.started",
  AGENT_RUN_PROGRESS: "agent.run.progress",
  AGENT_RUN_COMPLETED: "agent.run.completed",
  AGENT_RUN_FAILED: "agent.run.failed",
  MCP_CONNECTED: "mcp.connected",
  MCP_DISCONNECTED: "mcp.disconnected",
  TOOLS_DISCOVERED: "tools.discovered",
  WORKFLOW_CREATED: "workflow.created",
  WORKFLOW_RUN_STARTED: "workflow.run.started",
  WORKFLOW_RUN_COMPLETED: "workflow.run.completed",
  TASK_QUEUED: "task.queued",
  TASK_STARTED: "task.started",
  TASK_PROGRESS: "task.progress",
  TASK_COMPLETED: "task.completed",
  TASK_FAILED: "task.failed",
  TASK_CANCELLED: "task.cancelled",
  DEPLOYMENT_STATUS: "deployment.status",
} as const;

import { EventEmitter } from "events";
import Redis from "ioredis";

export type EventType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "tenant.created"
  | "tenant.suspended"
  | "tenant.deleted"
  | "chat.started"
  | "chat.message"
  | "chat.completed"
  | "budget.alert"
  | "model.loaded"
  | "model.failed"
  | "model.health_change"
  | "provider.circuit_open"
  | "provider.circuit_closed"
  | "guardrail.triggered"
  | "error.critical"
  | "auth.login"
  | "auth.logout"
  | "auth.register";

export interface EventPayload {
  type: EventType;
  tenantId?: number;
  userId?: number;
  data: Record<string, unknown>;
  timestamp: Date;
}

type EventHandler = (payload: EventPayload) => void | Promise<void>;

export class EventBus extends EventEmitter {
  private redis: Redis | null = null;
  private subscribers: Map<EventType, EventHandler[]> = new Map();
  private redisSub: Redis | null = null;
  private redisPub: Redis | null = null;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  init(redisUrl?: string): void {
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            const delay = Math.min(times * 200, 2000);
            return delay;
          },
          lazyConnect: true,
        });

        this.redisSub = this.redis.duplicate();
        this.redisPub = this.redis.duplicate();

        this.redisSub.on("message", (channel, message) => {
          try {
            const payload = JSON.parse(message) as EventPayload;
            this.processEvent(payload);
          } catch {
            // Ignore parse errors
          }
        });

        this.redis.connect().catch(() => {
          console.warn("[EventBus] Redis connection failed, falling back to local only");
          this.redis = null;
          this.redisSub = null;
          this.redisPub = null;
        });

        this.redisSub.subscribe("forge:events").catch(() => {});
      } catch {
        console.warn("[EventBus] Redis init failed, using local EventEmitter only");
      }
    }
  }

  async publish(event: EventType, data: Record<string, unknown>, tenantId?: number, userId?: number): Promise<void> {
    const payload: EventPayload = {
      type: event,
      tenantId,
      userId,
      data,
      timestamp: new Date(),
    };

    // Process locally
    this.processEvent(payload);

    // Publish to Redis for cross-process
    if (this.redisPub) {
      try {
        await this.redisPub.publish("forge:events", JSON.stringify(payload));
      } catch {
        // Redis unavailable, local processing still works
      }
    }
  }

  publishEvent(tenantId: number, eventType: string, data: any): void {
    this.publish(eventType as any, data, tenantId);
  }

  onEvent(type: EventType, handler: EventHandler): void {
    const handlers = this.subscribers.get(type) || [];
    handlers.push(handler);
    this.subscribers.set(type, handlers);
  }

  offEvent(type: EventType, handler: EventHandler): void {
    const handlers = this.subscribers.get(type) || [];
    const idx = handlers.indexOf(handler);
    if (idx > -1) handlers.splice(idx, 1);
    this.subscribers.set(type, handlers);
  }

  private processEvent(payload: EventPayload): void {
    const handlers = this.subscribers.get(payload.type) || [];
    for (const handler of handlers) {
      try {
        const result = handler(payload);
        if (result && typeof result === "object" && "catch" in result) {
          (result as Promise<void>).catch((err) => {
            console.error(`[EventBus] Handler error for ${payload.type}:`, err);
          });
        }
      } catch (err) {
        console.error(`[EventBus] Handler error for ${payload.type}:`, err);
      }
    }
  }

  async close(): Promise<void> {
    if (this.redisSub) {
      await this.redisSub.unsubscribe("forge:events").catch(() => {});
      await this.redisSub.quit().catch(() => {});
    }
    if (this.redisPub) {
      await this.redisPub.quit().catch(() => {});
    }
    if (this.redis) {
      await this.redis.quit().catch(() => {});
    }
    this.removeAllListeners();
    this.subscribers.clear();
  }
}

export const eventBus = new EventBus();
