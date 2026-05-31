import { eq, and, desc, lte } from "drizzle-orm";
import { getDb } from "../db";
import { agents, agentRuns, agentMemories, toolApprovals } from "../../drizzle/schema";
import { agentRuntime } from "./agent-runtime";
import { eventBus } from "./event-bus";
import type { AgentConfig } from "./agent-runtime";

export class AgentScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = new Set<number>();

  start(): void {
    // Check for scheduled agents every 30 seconds
    this.intervalId = setInterval(() => this.tick(), 30_000);
    console.log("[AgentScheduler] Started (checking every 30s)");

    // Subscribe to events
    eventBus.onEvent("user.created", (payload) => {
      this.triggerAgents("event", "user.created", payload.data);
    });
    eventBus.onEvent("chat.started", (payload) => {
      this.triggerAgents("event", "chat.started", payload);
    });
    eventBus.onEvent("budget.alert", (payload) => {
      this.triggerAgents("event", "budget.alert", payload);
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async tick(): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const now = new Date();
      const due = await db.select().from(agents)
        .where(and(
          eq(agents.enabled, 1),
          lte(agents.nextRunAt, now),
          eq(agents.status, "active")
        )).limit(10);

      for (const agent of due) {
        if (this.running.has(agent.id)) continue;
        this.running.add(agent.id);

        const config: AgentConfig = JSON.parse(agent.config);
        const hasCron = config.triggers?.some(t => t.type === "cron");

        if (hasCron) {
          agentRuntime.runAgentSafely(agent.id, "cron").finally(() => {
            this.running.delete(agent.id);
            this.scheduleNext(agent.id, config);
          });
        }
      }
    } catch (err: any) {
      console.error("[AgentScheduler] Tick error:", err.message);
    }
  }

  async triggerAgents(eventType: string, eventName: string, data: any): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const tenantId = Number(data.tenantId) || 1;
      const matching = await db.select().from(agents)
        .where(and(eq(agents.tenantId, tenantId), eq(agents.enabled, 1)));

      for (const agent of matching) {
        if (this.running.has(agent.id)) continue;

        const config: AgentConfig = JSON.parse(agent.config);
        const hasEvent = config.triggers?.some(t =>
          t.type === "event" && t.events?.includes(eventName)
        );

        if (hasEvent) {
          this.running.add(agent.id);
          agentRuntime.runAgentSafely(agent.id, `event:${eventName}`, data).finally(() => {
            this.running.delete(agent.id);
          });
        }
      }
    } catch {}
  }

  async scheduleNext(agentId: number, config: AgentConfig): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const cronTrigger = config.triggers?.find(t => t.type === "cron");
    if (!cronTrigger?.schedule) return;

    // Simple cron parsing — support patterns like "*/30 * * * * *" or "*/N"
    let intervalSeconds = 300; // default 5 min
    const parts = cronTrigger.schedule.split(/\s+/);
    // Pattern: */N * * * * * — every N seconds
    if (parts[0]?.startsWith("*/")) {
      intervalSeconds = parseInt(parts[0].slice(2), 10) || 300;
    } else if (parts.length === 1 && parts[0].startsWith("*/")) {
      intervalSeconds = parseInt(parts[0].slice(2), 10) || 300;
    }

    const nextRun = new Date(Date.now() + intervalSeconds * 1000);
    await db.update(agents).set({ nextRunAt: nextRun }).where(eq(agents.id, agentId));
  }

  async triggerAgent(agentId: number): Promise<void> {
    if (this.running.has(agentId)) {
      throw new Error("Agent is already running");
    }

    this.running.add(agentId);
    agentRuntime.runAgentSafely(agentId, "manual").finally(() => {
      this.running.delete(agentId);
    });
  }

  async isRunning(agentId: number): Promise<boolean> {
    return this.running.has(agentId);
  }
}

export const agentScheduler = new AgentScheduler();
