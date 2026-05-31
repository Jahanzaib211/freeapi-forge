import postgres from "postgres";

let _spendDb: ReturnType<typeof postgres> | null = null;

function getSpendDb() {
  if (!_spendDb) {
    const url = process.env.LITELLM_DATABASE_URL || "postgresql://litellm_user:litellm_password_123@localhost:5434/litellm_db";
    _spendDb = postgres(url);
  }
  return _spendDb;
}

export async function getLiveStats() {
  const sql = getSpendDb();
  const today = new Date().toISOString().split("T")[0];

  try {
    const [todayResult] = await sql`
      SELECT COUNT(*)::int as count FROM "LiteLLM_SpendLogs" 
      WHERE DATE("startTime") = ${today}
    `;

    const [hourResult] = await sql`
      SELECT COUNT(*)::int as count FROM "LiteLLM_SpendLogs" 
      WHERE "startTime" > NOW() - INTERVAL '1 hour'
    `;

    const [totalResult] = await sql`
      SELECT COUNT(*)::int as count FROM "LiteLLM_SpendLogs"
    `;

    const [tokensResult] = await sql`
      SELECT COALESCE(SUM(total_tokens), 0)::bigint as total FROM "LiteLLM_SpendLogs"
    `;

    const [successResult] = await sql`
      SELECT COALESCE(AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END), 0)::float * 100 as rate 
      FROM "LiteLLM_SpendLogs" 
      WHERE "startTime" > NOW() - INTERVAL '24 hours'
    `;

    return {
      todayRequests: todayResult?.count || 0,
      hourRequests: hourResult?.count || 0,
      totalRequests: totalResult?.count || 0,
      totalTokens: Number(tokensResult?.total || 0),
      successRate: parseFloat(successResult?.rate || "0"),
    };
  } catch (error) {
    console.error("[Analytics] getLiveStats failed:", error);
    return { todayRequests: 0, hourRequests: 0, totalRequests: 0, totalTokens: 0, successRate: 0 };
  }
}

export async function getHourlyVolume() {
  const sql = getSpendDb();
  try {
    const rows = await sql`
      SELECT EXTRACT(HOUR FROM "startTime")::int as hour, COUNT(*)::int as count
      FROM "LiteLLM_SpendLogs"
      WHERE "startTime" > NOW() - INTERVAL '24 hours'
      GROUP BY hour ORDER BY hour
    `;
    return rows.map((r: any) => ({ hour: r.hour, count: r.count }));
  } catch {
    return [];
  }
}

export async function getTopModels(limit: number = 5) {
  const sql = getSpendDb();
  try {
    const rows = await sql`
      SELECT model, COUNT(*)::int as count
      FROM "LiteLLM_SpendLogs"
      WHERE "startTime" > NOW() - INTERVAL '7 days'
      GROUP BY model ORDER BY count DESC LIMIT ${limit}
    `;
    return rows.map((r: any) => ({ model: r.model, count: r.count }));
  } catch {
    return [];
  }
}

export async function getProviderPerformance() {
  const sql = getSpendDb();
  try {
    const rows = await sql`
      SELECT custom_llm_provider as provider, 
             COUNT(*)::int as requests,
             COALESCE(AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END), 0)::float * 100 as success_rate
      FROM "LiteLLM_SpendLogs"
      WHERE "startTime" > NOW() - INTERVAL '24 hours'
      GROUP BY custom_llm_provider
    `;
    return rows.map((r: any) => ({
      provider: r.provider,
      requests: r.requests,
      successRate: parseFloat(r.success_rate || "0"),
    }));
  } catch {
    return [];
  }
}

export async function getModelStats() {
  const sql = getSpendDb();
  try {
    const rows = await sql`
      SELECT model,
             COUNT(*)::int as request_count,
             COALESCE(AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END), 0)::float * 100 as success_rate,
             COALESCE(AVG(request_duration_ms), 0)::float as avg_latency_ms,
             COALESCE(SUM(total_tokens), 0)::bigint as total_tokens,
             MAX("startTime") as last_used
      FROM "LiteLLM_SpendLogs"
      GROUP BY model
      ORDER BY request_count DESC
    `;
    return rows.map((r: any) => ({
      model: r.model,
      requestCount: r.request_count,
      successRate: parseFloat(r.success_rate || "0"),
      avgLatencyMs: parseFloat(r.avg_latency_ms || "0"),
      totalTokens: Number(r.total_tokens || 0),
      lastUsed: r.last_used,
    }));
  } catch {
    return [];
  }
}

export async function getModelHistory(modelName: string, limit: number = 20) {
  const sql = getSpendDb();
  try {
    const rows = await sql`
      SELECT "startTime", status, total_tokens, spend, request_duration_ms
      FROM "LiteLLM_SpendLogs"
      WHERE model = ${modelName}
      ORDER BY "startTime" DESC LIMIT ${limit}
    `;
    return rows.map((r: any) => ({
      timestamp: r.startTime,
      status: r.status,
      totalTokens: r.total_tokens,
      spend: r.spend,
      latencyMs: r.request_duration_ms,
    }));
  } catch {
    return [];
  }
}
