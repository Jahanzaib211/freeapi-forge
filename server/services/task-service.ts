import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { agentTasks } from "../../drizzle/schema";

export class TaskService {

  async createTask(tenantId: number, input: {
    agentId?: number;
    workflowId?: number;
    taskType: string;
    input?: any;
    totalSteps?: number;
    createdBy?: number;
  }): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(agentTasks).values({
      tenantId,
      agentId: input.agentId ?? null,
      workflowId: input.workflowId ?? null,
      taskType: input.taskType,
      input: input.input ? JSON.stringify(input.input) : null,
      totalSteps: input.totalSteps ?? 0,
      progress: 0,
      currentStep: 0,
      status: "queued",
      createdBy: input.createdBy ?? null,
    }).returning();

    return result[0] || null;
  }

  async startTask(tenantId: number, taskId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db.update(agentTasks)
      .set({ status: "running", startedAt: new Date() })
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.tenantId, tenantId)));
  }

  async updateProgress(tenantId: number, taskId: number, currentStep: number, message?: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const task = await db.select({ totalSteps: agentTasks.totalSteps })
      .from(agentTasks)
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.tenantId, tenantId)))
      .limit(1)
      .then(r => r[0] || null);

    if (!task) return;

    const totalSteps = task.totalSteps || 1;
    const progress = Math.round((currentStep / totalSteps) * 100);

    await db.update(agentTasks)
      .set({
        currentStep,
        progress: Math.min(progress, 100),
        progressMessage: message ?? null,
      })
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.tenantId, tenantId)));
  }

  async completeTask(tenantId: number, taskId: number, output?: any): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const task = await db.select({ startedAt: agentTasks.startedAt })
      .from(agentTasks)
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.tenantId, tenantId)))
      .limit(1)
      .then(r => r[0] || null);

    const completedAt = new Date();
    const durationMs = task?.startedAt
      ? completedAt.getTime() - new Date(task.startedAt).getTime()
      : 0;

    await db.update(agentTasks)
      .set({
        status: "completed",
        completedAt,
        durationMs: Math.max(0, durationMs),
        output: output ? JSON.stringify(output) : null,
        progress: 100,
      })
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.tenantId, tenantId)));
  }

  async failTask(tenantId: number, taskId: number, error: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db.update(agentTasks)
      .set({ status: "failed", completedAt: new Date(), error })
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.tenantId, tenantId)));
  }

  async cancelTask(tenantId: number, taskId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db.update(agentTasks)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.tenantId, tenantId)));
  }

  async listTasks(tenantId: number, options?: {
    status?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ items: any[]; total: number }> {
    const db = await getDb();
    if (!db) return { items: [], total: 0 };

    const conditions = [eq(agentTasks.tenantId, tenantId)];
    if (options?.status) conditions.push(eq(agentTasks.status, options.status));

    const page = options?.page || 1;
    const perPage = options?.perPage || 20;
    const offset = (page - 1) * perPage;

    const items = await db.select()
      .from(agentTasks)
      .where(and(...conditions))
      .orderBy(desc(agentTasks.createdAt))
      .limit(perPage)
      .offset(offset);

    const totalResult = await db.select({ c: sql<number>`count(*)` })
      .from(agentTasks)
      .where(and(...conditions));

    return { items, total: Number(totalResult[0]?.c || 0) };
  }

  async getActiveTasks(tenantId: number): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];

    return db.select()
      .from(agentTasks)
      .where(and(
        eq(agentTasks.tenantId, tenantId),
        sql`${agentTasks.status} IN ('queued', 'running')`
      ))
      .orderBy(desc(agentTasks.createdAt));
  }

  async getTask(tenantId: number, taskId: number): Promise<any> {
    const db = await getDb();
    if (!db) return null;

    return db.select()
      .from(agentTasks)
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.tenantId, tenantId)))
      .limit(1)
      .then(r => r[0] || null);
  }
}

export const taskService = new TaskService();
