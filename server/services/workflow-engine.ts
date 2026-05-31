import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { workflows, workflowRuns, workflowNodeRuns } from "../../drizzle/schema";
import { llmRouter } from "./llm_router";
import { agentRuntime } from "./agent-runtime";
import { skillManager } from "./skill_manager";
import { ragService } from "./rag-service";
import { budgetService } from "./budget-service";
import { eventBus } from "./event-bus";
import { chatService } from "./chat-service";
import { errorLogger } from "./error_logger";

interface WorkflowNode {
  id: string; type: string; position: { x: number; y: number };
  data: { label?: string; [key: string]: any };
}

interface WorkflowEdge { source: string; target: string; sourceHandle?: string; targetHandle?: string; label?: string; condition?: string; }

interface WorkflowGraph { nodes: WorkflowNode[]; edges: WorkflowEdge[]; }

function resolveVariables(template: string, ctx: Record<string, any>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, path) => {
    const parts = path.trim().split(".");
    let val: any = ctx;
    for (const p of parts) val = val?.[p];
    return val != null ? String(val) : "";
  });
}

function getNestedValue(obj: any, path: string[]): any {
  return path.reduce((acc, key) => acc?.[key], obj);
}

function evaluateCondition(condition: string, output: any): boolean {
  try {
    const [field, op, val] = condition.split(/\s+/);
    const actual = String(getNestedValue(output, field.split(".")) ?? "");
    switch (op) {
      case "==": return actual === val;
      case "!=": return actual !== val;
      case ">": return Number(actual) > Number(val);
      case "<": return Number(actual) < Number(val);
      case "contains": return actual.includes(val);
      default: return true;
    }
  } catch { return true; }
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export class WorkflowEngine {
  async execute(workflowId: number, triggerType: string = "manual", triggerData?: any): Promise<void> {
    const db = await getDb(); if (!db) return;
    const wfResult = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    if (wfResult.length === 0) throw new Error("Workflow not found");
    const wf = wfResult[0];

    const graph: WorkflowGraph = JSON.parse(wf.graph || "{}");
    if (!graph.nodes?.length) return;

    const tenantId = wf.tenantId;
    const startTime = Date.now();

    const runResult = await db.insert(workflowRuns).values({
      workflowId, tenantId, version: wf.version, triggerType,
      triggerData: triggerData ? JSON.stringify(triggerData) : null,
      status: "running", totalNodes: graph.nodes.length,
    }).returning({ id: workflowRuns.id });
    const runId = runResult[0].id;
    const ctx: Record<string, any> = { trigger: triggerData || {}, workflow: { id: workflowId, runId }, tenant: { id: tenantId } };

    // Build adjacency
    const adjacency: Record<string, string[]> = {};
    for (const edge of graph.edges) {
      if (!adjacency[edge.source]) adjacency[edge.source] = [];
      adjacency[edge.source].push(edge.target);
    }

    const inDegree: Record<string, number> = {};
    for (const n of graph.nodes) { inDegree[n.id] = 0; }
    for (const edge of graph.edges) { inDegree[edge.target] = (inDegree[edge.target] || 0) + 1; }

    const queue = graph.nodes.filter(n => (inDegree[n.id] || 0) === 0);

    while (queue.length > 0) {
      // Budget check
      const budget = await budgetService.getBudgetStatus(tenantId, new Date().toISOString().slice(0, 7));
      if (budget.status === "blocked") { await this.failRun(db, runId, "Budget exceeded"); break; }

      const node = queue.shift()!;
      const nodeStart = Date.now();

      try {
        await db.insert(workflowNodeRuns).values({
          workflowRunId: runId, nodeId: node.id, nodeType: node.type,
          nodeName: resolveVariables(node.data?.label || node.type, ctx),
          status: "running", startedAt: new Date(),
        });

        const config = node.data || {};
        const resolved = JSON.parse(resolveVariables(JSON.stringify(config), ctx));
        const input = { ...ctx, ...resolved };

        let output: any;

        switch (node.type) {
          case "llm-call": {
            const resp = await llmRouter.complete({
              messages: [{ role: "user", content: resolved.prompt || "" }],
              taskType: "chat", maxTokens: resolved.maxTokens || 1024,
              temperature: resolved.temperature || 0.7, tenantId,
            });
            output = { text: resp.choices[0]?.message?.content || "", usage: resp.usage, model: resp.model };
            break;
          }
          case "llm-branch": {
            const resp = await llmRouter.complete({
              messages: [{ role: "user", content: `Classify this into one category: ${resolved.categories?.join(", ") || "yes,no"}\n\n${resolved.prompt || ""}` }],
              taskType: "chat", maxTokens: 128, temperature: 0.1, tenantId,
            });
            const text = resp.choices[0]?.message?.content || "";
            output = { classification: text.toLowerCase().trim().replace(/[^a-z]/g, " ") };
            break;
          }
          case "llm-summarize": {
            const resp = await llmRouter.complete({
              messages: [{ role: "user", content: `Summarize concisely:\n\n${resolved.input || ""}` }],
              taskType: "chat", maxTokens: 1024, temperature: 0.3, tenantId,
            });
            output = { summary: resp.choices[0]?.message?.content || "" };
            break;
          }
          case "agent-node":
          case "monitor-node":
          case "chat-agent-node": {
            await agentRuntime.runAgentSafely(resolved.agentId, `workflow:${runId}`, { input, trigger: triggerData });
            output = { agentId: resolved.agentId, status: "triggered" };
            break;
          }
          case "skill-node": {
            const result = await skillManager.executeWithBuiltin(resolved.skillName, resolved.input || "", tenantId);
            output = { skill: resolved.skillName, result: result.output || result.error };
            break;
          }
          case "rag-search": {
            const results = await ragService.similaritySearch(tenantId, resolved.query || "", resolved.topK || 5);
            output = { results: results.map(r => ({ doc: r.documentName, content: r.content.slice(0, 300), score: r.score })) };
            break;
          }
          case "chat-send": {
            const convId = resolved.conversationId || 0;
            const result = await chatService.sendMessage(tenantId, 0, convId, resolved.content || "", { model: resolved.model });
            output = { message: result.assistantMessage.content };
            break;
          }
          case "http-request": {
            const resp = await fetch(resolved.url, {
              method: resolved.method || "GET",
              headers: resolved.headers || {},
              body: resolved.body ? JSON.stringify(resolved.body) : undefined,
              signal: AbortSignal.timeout(resolved.timeout || 30000),
            });
            output = await resp.json().catch(() => ({ status: resp.status }));
            break;
          }
          case "condition-node": {
            output = { result: evaluateCondition(resolved.condition || "true == true", input) };
            break;
          }
          case "delay-node": {
            await sleep(resolved.delayMs || 1000);
            output = { delayed: true, duration: resolved.delayMs || 1000 };
            break;
          }
          case "set-variable": {
            output = { [resolved.key || "var"]: resolved.value };
            break;
          }
          case "template-node": {
            const rendered = JSON.parse(resolveVariables(JSON.stringify(resolved), ctx));
            output = rendered;
            break;
          }
          case "json-transform": {
            output = { transformed: true };
            break;
          }
          case "notify-in-app": {
            eventBus.publish("workflow.notification" as any, { tenantId, message: resolved.message || "" }, tenantId);
            output = { notified: true };
            break;
          }
          case "notify-discord": {
            console.log(`[Workflow Discord] ${resolved.message || ""}`);
            output = { sent: true };
            break;
          }
          case "budget-check": {
            output = await budgetService.getBudgetStatus(tenantId, new Date().toISOString().slice(0, 7));
            break;
          }
          case "error-handler": {
            output = { handled: true, error: input.error || "" };
            break;
          }
          case "code-node": {
            try {
              const fn = new Function("ctx", resolved.code || "return ctx");
              output = fn(input);
            } catch (e: any) { output = { error: e.message }; }
            break;
          }
          case "db-query": {
            output = { query: resolved.query?.slice(0, 100) || "" };
            break;
          }
          case "redis-get": {
            output = { key: resolved.key, value: null };
            break;
          }
          case "redis-set": {
            output = { set: true };
            break;
          }
          case "parallel-node": break;
          case "loop-node": break;
          default: {
            // Trigger/flow-through nodes
            output = input;
          }
        }

        const nodeDuration = Date.now() - nodeStart;
        await db.update(workflowNodeRuns).set({
          status: "success", output: JSON.stringify(output), completedAt: new Date(), durationMs: nodeDuration,
        }).where(and(eq(workflowNodeRuns.workflowRunId, runId), eq(workflowNodeRuns.nodeId, node.id)));

        // Merge output into context
        ctx[`nodes.${node.id}`] = output;

        // Enqueue downstream
        for (const target of adjacency[node.id] || []) {
          // Check edge conditions
          const edges = graph.edges.filter(e => e.source === node.id && e.target === target);
          let shouldPass = true;
          for (const edge of edges) {
            if (edge.label === "condition" && edge.condition) {
              shouldPass = evaluateCondition(edge.condition, output);
            }
          }
          if (shouldPass) {
            inDegree[target] = (inDegree[target] || 1) - 1;
            if (inDegree[target] <= 0) {
              const targetNode = graph.nodes.find(n => n.id === target);
              if (targetNode) queue.push(targetNode);
            }
          }
        }
      } catch (err: any) {
        await db.update(workflowNodeRuns).set({
          status: "failed", error: err.message, completedAt: new Date(), durationMs: Date.now() - nodeStart,
        }).where(and(eq(workflowNodeRuns.workflowRunId, runId), eq(workflowNodeRuns.nodeId, node.id)));
        await this.failRun(db, runId, err.message);
        break;
      }
    }

    const duration = Date.now() - startTime;
    const cost = Math.round((duration / 1000) * 0.001 * 1_000_000);
    await db.update(workflowRuns).set({
      status: "success", completedAt: new Date(), durationMs: duration, costUsd: cost,
    }).where(eq(workflowRuns.id, runId));

    await db.update(workflows).set({
      lastRunAt: new Date(), totalRuns: sql`${workflows.totalRuns} + 1`,
      successCount: sql`${workflows.successCount} + 1`,
    }).where(eq(workflows.id, workflowId));

    eventBus.publish("workflow.completed" as any, { workflowId, runId, duration, cost }, tenantId);
  }

  private async failRun(db: any, runId: number, error: string) {
    await db.update(workflowRuns).set({ status: "failed", error, completedAt: new Date() }).where(eq(workflowRuns.id, runId));
  }
}

export const workflowEngine = new WorkflowEngine();
