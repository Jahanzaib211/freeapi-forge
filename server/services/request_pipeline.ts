import { estimateRequestTokens, estimateCost } from "./token_estimator";
import { semanticCache } from "./semantic_cache";
import { errorLogger } from "./error_logger";

export interface PipelineContext {
  requestId: string;
  model: string;
  messages: { role: string; content: string }[];
  maxTokens: number;
  temperature: number;
  virtualKey?: any;
  teamId?: string;
  startTime: number;
  cached?: boolean;
  cachedResponse?: string;
  metadata: Record<string, any>;
}

export async function runCacheInterceptor(ctx: PipelineContext): Promise<PipelineContext> {
  try {
    const cacheKey = semanticCache.getCacheKey(ctx.model, ctx.messages, ctx.temperature);
    const cached = await semanticCache.get(cacheKey);
    if (cached) {
      ctx.cached = true;
      ctx.cachedResponse = cached;
      ctx.metadata.cacheHit = true;
    }
  } catch {}
  return ctx;
}

export async function budgetInterceptor(ctx: PipelineContext): Promise<PipelineContext> {
  if (!ctx.virtualKey) return ctx;

  try {
    const estimatedInputTokens = estimateRequestTokens(ctx.messages);
    const estimatedCostUsd = estimateCost(estimatedInputTokens, ctx.maxTokens);

    if (ctx.virtualKey.budgetLimitUsd > 0) {
      const projectedSpend = (ctx.virtualKey.spendUsd || 0) + estimatedCostUsd;
      if (projectedSpend > ctx.virtualKey.budgetLimitUsd) {
        throw new Error(`Budget exceeded: projected $${projectedSpend.toFixed(4)} > $${ctx.virtualKey.budgetLimitUsd}`);
      }
    }
  } catch (err: any) {
    errorLogger.warn("pipeline", `Budget check failed: ${err.message}`);
    throw err;
  }

  return ctx;
}

export async function runResponseInterceptors(ctx: PipelineContext, response: any): Promise<void> {
  if (ctx.cached) return;

  try {
    const cacheKey = semanticCache.getCacheKey(ctx.model, ctx.messages, ctx.temperature);
    const content = response?.choices?.[0]?.message?.content;
    if (content && ctx.temperature < 0.3) {
      await semanticCache.set(cacheKey, content, ctx.model);
    }
  } catch {}

  try {
    const latencyMs = Date.now() - ctx.startTime;
    const tokens = response?.usage?.total_tokens || 0;
    errorLogger.info("pipeline", "Request completed", {
      model: ctx.model,
      latencyMs,
      tokens,
      cached: ctx.cached || false,
    });
  } catch {}
}

export async function runPipeline(ctx: PipelineContext): Promise<PipelineContext> {
  ctx = await runCacheInterceptor(ctx);
  if (!ctx.cached) {
    ctx = await budgetInterceptor(ctx);
  }
  return ctx;
}
