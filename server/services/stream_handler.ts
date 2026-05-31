import { Request, Response } from "express";
import axios from "axios";
import { providerService } from "./provider_service";
import { customProviderService } from "./custom_provider";
import { directProxyStream } from "./direct_proxy";
import { errorLogger } from "./error_logger";
import { guardrailService } from "./guardrail_service";
import { virtualKeyService } from "./virtual_key_service";
import { createRequestHistory, createAuditLog, updateBudgetSpend, getOrCreateBudgetLimit, getAllProviders } from "../db";
import { getModelForTask } from "../_core/model-registry";
import type { TenantRequest } from "../middleware/tenant-resolver";

async function resolveTeamIdFromRequest(req: Request): Promise<number> {
  try {
    const apiKey = req.headers["x-api-key"];
    if (apiKey) {
      const validation = await virtualKeyService.validateKey(apiKey as string);
      if (validation.valid && validation.keyRecord) {
        return validation.keyRecord.teamId;
      }
    }
  } catch {}
  return 1;
}

function resolveTenantIdFromRequest(req: Request): number {
  const tenantReq = req as TenantRequest;
  return tenantReq.tenantId || 1;
}

export async function handleStreamChat(req: Request, res: Response) {
  const { messages, taskType, maxTokens, temperature, model: directModel } = req.body;

  const model = directModel || await getModelForTask(taskType || "chat");
  const requestId = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();

  // Resolve team and user context
  const teamId = await resolveTeamIdFromRequest(req);
  const tenantId = resolveTenantIdFromRequest(req);
  const monthYear = new Date().toISOString().slice(0, 7);
  const inputText = messages?.map((m: any) => m.content || "").join("\n") || "";

  // Budget check
  try {
    const budget = await getOrCreateBudgetLimit(teamId, monthYear, 10, tenantId);
    if (budget) {
      const currentSpendUsd = budget.currentSpendUsd / 1000000;
      if (currentSpendUsd >= budget.monthlyLimitUsd) {
        res.status(429).json({ error: `Monthly budget limit exceeded: $${currentSpendUsd.toFixed(2)} / $${budget.monthlyLimitUsd}` });
        return;
      }
    }
  } catch (err: any) {
    errorLogger.error("stream_handler", `Budget check failed: ${err.message}`, err, { model });
  }

  // Pre-call guardrails
  try {
    const guardrailResults = await guardrailService.runPreCallGuardrails(inputText, model);
    const blocked = guardrailResults.filter((g) => !g.passed);
    if (blocked.length > 0) {
      const violations = blocked.flatMap((g) => g.violations.map((v) => v.matched));
      errorLogger.warn("stream_handler", "Pre-call guardrail blocked", { model, violations });
      res.status(403).json({ error: "Request blocked by guardrails", violations });
      return;
    }
  } catch (err: any) {
    errorLogger.error("stream_handler", `Guardrail check failed: ${err.message}`, err, { model });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Track completion for governance logging
  const recordCompletion = async (providerName: string, tokenCount: number, error: boolean, fullContent: string) => {
    const costUsd = (tokenCount / 1000000) * 0.0001;
    const latencyMs = Date.now() - startTime;

    if (error) {
      await providerService.recordFailure(providerName);
    } else {
      await providerService.recordSuccess(providerName);
    }

    const allProviders = await getAllProviders(tenantId);
    const providerRecord = allProviders.find((p: any) => p.name === providerName);

    await createRequestHistory(
      requestId,
      teamId,
      providerRecord?.id || null,
      taskType || "chat",
      0,
      tokenCount,
      costUsd,
      error ? "error" : "success",
      undefined,
      tenantId
    );

    await updateBudgetSpend(teamId, monthYear, costUsd, tenantId);

    await createAuditLog(
      null,
      teamId,
      "CHAT_COMPLETION",
      JSON.stringify({ model, tokens: tokenCount, latencyMs, provider: providerName }),
      tenantId
    );

    // Post-call guardrails
    if (fullContent) {
      try {
        const postResults = await guardrailService.runPostCallGuardrails(fullContent, model);
        const postBlocked = postResults.filter((g) => !g.passed);
        if (postBlocked.length > 0) {
          errorLogger.warn("stream_handler", "Post-call guardrail flagged", { model, violations: postBlocked.flatMap((g) => g.violations.map((v) => v.matched)) });
        }
      } catch {}
    }
  };

  // Check custom providers first (standalone mode)
  const customProvider = await customProviderService.findProviderForModel(model);
  if (customProvider) {
    try {
      const upstream = await directProxyStream({
        messages: messages || [],
        model,
        apiUrl: customProvider.apiUrl,
        apiKey: customProvider.apiKey,
        maxTokens: maxTokens || 1024,
        temperature: temperature || 0.7,
        stream: true,
      });

      const reader = upstream.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let tokenCount = 0;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
            fullContent += chunk;
            tokenCount++;
          }
        } catch {}
      } else {
        const text = await upstream.text();
        res.write(text);
        fullContent = text;
      }

      res.write("data: [DONE]\n\n");
      res.end();
      await recordCompletion(`custom:${customProvider.name}`, tokenCount, false, fullContent);
      return;
    } catch (err: any) {
      providerService.recordFailure(`custom:${customProvider.name}`);
      errorLogger.error("stream_handler", `Custom provider ${customProvider.name} failed for model ${model}: ${err.message}`, err, { model, provider: customProvider.name });
      const errorData = {
        choices: [{ delta: { content: `Error from ${customProvider.name}: ${err.message}` }, finish_reason: "error" }],
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      await recordCompletion(`custom:${customProvider.name}`, 0, true, "");
      return;
    }
  }

  // Fall back to LiteLLM
  const litellmUrl = process.env.LITELLM_URL || "http://localhost:5050";
  const litellmApiKey = process.env.LITELLM_API_KEY || "sk-ai-lab-master-key";

  const providerName = model.includes("/") ? model.split("/")[0] : model;
  const circuitOpen = await providerService.isCircuitOpen(providerName);

  if (circuitOpen) {
    const errorData = {
      choices: [{ delta: { content: `Circuit breaker open for ${providerName}` }, finish_reason: "error" }],
    };
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
    await recordCompletion(providerName, 0, true, "");
    return;
  }

  try {
    const response = await axios.post(
      `${litellmUrl}/v1/chat/completions`,
      {
        model,
        messages: messages || [],
        max_tokens: maxTokens || 1024,
        temperature: temperature || 0.7,
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${litellmApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
        responseType: "stream",
      }
    );

    let fullContent = "";
    let tokenCount = 0;

    response.data.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            res.write("data: [DONE]\n\n");
            res.end();
            recordCompletion(providerName, tokenCount, false, fullContent);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              tokenCount++;
            }
            res.write(`data: ${JSON.stringify(parsed)}\n\n`);
          } catch {}
        }
      }
    });

    response.data.on("error", (err: Error) => {
      providerService.recordFailure(providerName);
      errorLogger.error("stream_handler", `LiteLLM stream error for model ${model}: ${err.message}`, err, { model, provider: providerName });
      const errorData = {
        choices: [{ delta: { content: `\n\n[Stream error: ${err.message}]` }, finish_reason: "error" }],
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      recordCompletion(providerName, tokenCount, true, fullContent);
    });
  } catch (error: any) {
    providerService.recordFailure(providerName);
    errorLogger.error("stream_handler", `LiteLLM request failed for model ${model}: ${error.message}`, error, { model, provider: providerName });
    const errorData = {
      choices: [{ delta: { content: `Error: ${error.message}` }, finish_reason: "error" }],
    };
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
    await recordCompletion(providerName, 0, true, "");
  }
}
