import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import net from "net";
import { WebSocketServer } from "ws";
import Redis from "ioredis";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStreamChat } from "../services/stream_handler";
import { startSystemMonitor } from "../services/system_monitor";
import { mcpRouter } from "../services/mcp_server";
import { errorLogger } from "../services/error_logger";
import { customProviderService } from "../services/custom_provider";
import { directProxyChat } from "../services/direct_proxy";
import { getDb } from "../db";
import { providerService } from "../services/provider_service";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [] }));

  // Validate required env vars on startup
  if (!process.env.JWT_SECRET) {
    console.error("[FATAL] JWT_SECRET environment variable must be set");
    process.exit(1);
  }

  // Global error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(`[ERROR] ${new Date().toISOString()}:`, err.message);
      console.error(err.stack);
      errorLogger.error("express.global", "Unhandled Express error", err, {
        path: _req.path,
        method: _req.method,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  );

  // Mock auth (DEV only)
  if (process.env.NODE_ENV !== "production") {
    app.get("/auth/mock", (req, res) => {
      res.cookie("session", "mock-session-token", {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });
      const returnPath = (req.query.returnPath as string) || "/";
      res.redirect(returnPath);
    });
  }

  // Health check endpoint (standalone, not tRPC)
  app.get("/health", async (_req, res) => {
    const checks: Record<string, { status: string; latencyMs?: number }> = {};
    let overallStatus = "healthy";

    // Check PostgreSQL
    try {
      const start = Date.now();
      const db = await getDb();
      if (db) {
        await db.execute(sql`SELECT 1`);
        checks.postgres = { status: "up", latencyMs: Date.now() - start };
      } else {
        checks.postgres = { status: "down" };
        overallStatus = "degraded";
      }
    } catch {
      checks.postgres = { status: "down" };
      overallStatus = "unhealthy";
    }

    // Check Redis
    try {
      const start = Date.now();
      const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/1", { connectTimeout: 3000, lazyConnect: true });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      checks.redis = { status: "up", latencyMs: Date.now() - start };
    } catch {
      checks.redis = { status: "down" };
      overallStatus = overallStatus === "unhealthy" ? "unhealthy" : "degraded";
    }

    // Check LiteLLM (optional)
    if (process.env.LITELLM_URL) {
      try {
        const start = Date.now();
        const resp = await fetch(process.env.LITELLM_URL, { signal: AbortSignal.timeout(3000) });
        checks.litellm = { status: resp.ok ? "up" : "degraded", latencyMs: Date.now() - start };
      } catch {
        checks.litellm = { status: "down" };
      }
    }

    const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;
    res.status(statusCode).json({
      status: overallStatus,
      version: "3.0.0",
      uptime: process.uptime(),
      checks,
    });
  });

  // Stream chat endpoint
  app.post("/api/stream/chat", express.json(), handleStreamChat);

  // tRPC middleware
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // OpenAI-compatible chat completions
  const preferredPort = parseInt(process.env.PORT || "5051");
  const port = await findAvailablePort(preferredPort);

  app.post("/v1/chat/completions", async (req, res) => {
    try {
      const { messages, model } = req.body;

      const modelTaskMap: Record<string, string> = {
        "forge-chat": "chat",
        "forge-coder": "coding",
        "forge-vision": "vision",
        "forge-fast": "fast",
        "forge-long-context": "long_context",
        "forge-local": "local",
      };
      const taskType = modelTaskMap[model?.toLowerCase()] || "chat";

      // Check custom providers first (standalone mode)
      const customProvider = await customProviderService.findProviderForModel(model || "fast-70b");
      if (customProvider) {
        try {
          const result = await directProxyChat({
            messages: messages || [],
            model: model || "fast-70b",
            apiUrl: customProvider.apiUrl,
            apiKey: customProvider.apiKey,
            maxTokens: req.body.max_tokens || 1024,
            temperature: req.body.temperature || 0.7,
            stream: false,
          });

          res.json({
            id: result.id || "forge-" + Date.now(),
            object: "chat.completion",
            created: result.created || Date.now(),
            model: result.model || model || "forge-chat",
            choices: result.choices || [
              {
                index: 0,
                message: { role: "assistant", content: "" },
                finish_reason: "stop",
              },
            ],
            usage: result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          });
          return;
        } catch (err: any) {
          console.error(`[CustomProvider] ${customProvider.name} failed:`, err.message);
          // Fall through to LiteLLM
        }
      }

      // Fall back to LiteLLM (via tRPC)
      const response = await fetch(
        `http://localhost:${port}/api/trpc/chat.complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.BUILT_IN_FORGE_API_KEY || "local-dev-key",
          },
          body: JSON.stringify({ json: { messages, taskType } }),
        }
      );

      const data = await response.json();
      const result = data?.result?.data?.json || data;

      res.json({
        id: "forge-" + Date.now(),
        object: "chat.completion",
        created: Date.now(),
        model: model || "forge-chat",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: result.choices?.[0]?.message?.content || "",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: result.usage?.prompt_tokens,
          completion_tokens: result.usage?.completion_tokens,
          total_tokens: result.usage?.total_tokens,
        },
      });
    } catch (err: any) {
      console.error("[/v1/chat/completions] Error:", err.message);
      errorLogger.error("api.v1.chat.completions", `Request failed: ${err.message}`, err, { model: req.body?.model });
      res.status(500).json({ error: err.message });
    }
  });

  // Model list endpoint for OpenAI-compatible tools
  app.get("/v1/models", async (_req, res) => {
    const customModels: Array<{ id: string; object: string; owned_by?: string }> = [];
    try {
      const providers = await customProviderService.list();
      for (const p of providers) {
        if (p.enabled !== 1) continue;
        const models = p.models.split(",").map((m) => m.trim()).filter(Boolean);
        for (const m of models) {
          customModels.push({ id: m, object: "model", owned_by: p.name });
        }
      }
    } catch {
      // ignore
    }

    res.json({
      object: "list",
      data: [
        { id: "forge-chat", object: "model" },
        { id: "forge-coder", object: "model" },
        { id: "forge-vision", object: "model" },
        { id: "forge-fast", object: "model" },
        { id: "forge-long-context", object: "model" },
        { id: "forge-local", object: "model" },
        ...customModels,
      ],
    });
  });

  // MCP server routes
  app.use(mcpRouter);

  // API docs endpoint
  app.get("/api-docs", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Forge Studio — API Reference</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; background: linear-gradient(90deg, #60a5fa, #a78bfa, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; }
    .endpoint { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
    .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-right: 0.5rem; }
    .method.post { background: #166534; color: #4ade80; }
    .method.get { background: #1e3a5f; color: #60a5fa; }
    .path { font-family: monospace; font-size: 0.9rem; color: #f8fafc; }
    .desc { color: #94a3b8; margin-top: 0.5rem; font-size: 0.875rem; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Forge Studio API</h1>
    <p class="subtitle">v3.0.0 — <a href="/">← Back to Dashboard</a></p>
    <div class="endpoint">
      <span class="method post">POST</span><span class="path">/v1/chat/completions</span>
      <p class="desc">OpenAI-compatible chat completions endpoint. Send messages and receive AI responses.</p>
    </div>
    <div class="endpoint">
      <span class="method get">GET</span><span class="path">/v1/models</span>
      <p class="desc">List all available models for use with the completions endpoint.</p>
    </div>
    <div class="endpoint">
      <span class="method post">POST</span><span class="path">/api/stream/chat</span>
      <p class="desc">Streaming chat endpoint with token-by-token SSE rendering.</p>
    </div>
    <div class="endpoint">
      <span class="method get">GET</span><span class="path">/api/trpc/*</span>
      <p class="desc">tRPC router for all internal operations. Use the tRPC client for typed queries and mutations.</p>
    </div>
    <div class="endpoint">
      <span class="method get">GET</span><span class="path">/mcp/sse</span>
      <p class="desc">MCP (Model Context Protocol) Server-Sent Events endpoint for tool discovery.</p>
    </div>
    <div class="endpoint">
      <span class="method get">GET</span><span class="path">/health</span>
      <p class="desc">System health check — returns status of database, Redis, and providers.</p>
    </div>
  </div>
</body>
</html>`);
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // WebSocket server for real-time system stats and error events
  const wss = new WebSocketServer({ server, path: "/ws" });
  startSystemMonitor(wss);

  // Broadcast error events to all connected clients
  errorLogger.on("log", (event) => {
    const data = JSON.stringify({ type: "system_event", data: event });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  });

  wss.on("connection", (ws) => {
    console.log("[WS] Client connected");
    ws.on("close", () => {
      console.log("[WS] Client disconnected");
    });
  });

  server.listen(port, () => {
    console.log(`Forge Studio server running on http://localhost:${port}/`);
    console.log(`  WebSocket: ws://localhost:${port}/ws`);
    console.log(`  API Docs:  http://localhost:${port}/api-docs`);
    console.log(`  MCP SSE:   http://localhost:${port}/mcp/sse`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[Shutdown] ${signal} received, shutting down gracefully...`);

    // 1. Stop accepting new connections
    server.close(() => {
      console.log("[Shutdown] HTTP server closed");
    });

    // 2. Close WebSocket connections
    wss.clients.forEach(client => client.close(1001, "Server shutting down"));
    wss.close();

    // 3. Close Redis
    try {
      await providerService.closeRedis();
      console.log("[Shutdown] Redis closed");
    } catch {}

    // 4. Force exit after 10s
    setTimeout(() => {
      console.error("[Shutdown] Forced exit after timeout");
      process.exit(1);
    }, 10000);

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
