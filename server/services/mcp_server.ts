import { Router, Request, Response } from "express";
import { mcpHost } from "./mcp_host";
import { getSystemStats } from "./system_monitor";

const router = Router();

interface McpRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: Record<string, any>;
}

interface McpResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: any;
  error?: { code: number; message: string };
}

const FORGE_TOOLS = [
  {
    name: "get_system_stats",
    description: "Get real-time system statistics including CPU, RAM, GPU usage",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_llm_models",
    description: "List all detected LLM models from various sources",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_mcp_servers",
    description: "List all registered MCP servers and their status",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "execute_mcp_tool",
    description: "Execute a tool on a connected MCP server",
    inputSchema: {
      type: "object",
      properties: {
        serverId: { type: "number", description: "MCP server ID" },
        toolName: { type: "string", description: "Tool name to execute" },
        args: { type: "object", description: "Tool arguments" },
      },
      required: ["serverId", "toolName"],
    },
  },
  {
    name: "list_virtual_keys",
    description: "List all virtual API keys",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "number", description: "Filter by team ID" },
      },
      required: [],
    },
  },
  {
    name: "get_usage_logs",
    description: "Get recent usage logs",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of logs to retrieve" },
      },
      required: [],
    },
  },
];

const FORGE_RESOURCES = [
  {
    uri: "forge://system/stats",
    name: "System Statistics",
    description: "Real-time system resource usage",
    mimeType: "application/json",
  },
  {
    uri: "forge://llm/models",
    name: "LLM Models",
    description: "All detected LLM models",
    mimeType: "application/json",
  },
  {
    uri: "forge://mcp/servers",
    name: "MCP Servers",
    description: "Registered MCP servers",
    mimeType: "application/json",
  },
  {
    uri: "forge://keys/list",
    name: "Virtual Keys",
    description: "All virtual API keys",
    mimeType: "application/json",
  },
];

function createMcpResponse(id: number | string | null, result: any): McpResponse {
  return { jsonrpc: "2.0", id, result };
}

function createMcpError(id: number | string | null, code: number, message: string): McpResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleToolCall(toolName: string, args: Record<string, any> = {}): Promise<any> {
  switch (toolName) {
    case "get_system_stats":
      return getSystemStats();

    case "list_llm_models": {
      const { detectAllLLMs } = await import("./llm_detector");
      return detectAllLLMs();
    }

    case "list_mcp_servers":
      return mcpHost.getAllServers();

    case "execute_mcp_tool":
      return mcpHost.executeTool(args.serverId, args.toolName, args.args || {});

    case "list_virtual_keys": {
      const { virtualKeyService } = await import("./virtual_key_service");
      return virtualKeyService.listKeys(args.teamId);
    }

    case "get_usage_logs": {
      const { errorLogger } = await import("./error_logger");
      return errorLogger.getRecentEvents(args.limit || 100);
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function handleResourceRead(uri: string): Promise<any> {
  switch (uri) {
    case "forge://system/stats":
      return getSystemStats();

    case "forge://llm/models": {
      const { detectAllLLMs } = await import("./llm_detector");
      return detectAllLLMs();
    }

    case "forge://mcp/servers":
      return mcpHost.getAllServers();

    case "forge://keys/list": {
      const { virtualKeyService } = await import("./virtual_key_service");
      return virtualKeyService.listKeys();
    }

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}

router.post("/mcp/sse", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("connected", { sessionId: Date.now() });

  req.on("data", async (chunk: Buffer) => {
    try {
      const request: McpRequest = JSON.parse(chunk.toString());

      switch (request.method) {
        case "initialize":
          sendEvent("response", createMcpResponse(request.id, {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: true },
              resources: { subscribe: true, listChanged: true },
            },
            serverInfo: {
              name: "forge-studio",
              version: "1.0.0",
            },
          }));
          break;

        case "tools/list":
          sendEvent("response", createMcpResponse(request.id, {
            tools: FORGE_TOOLS,
          }));
          break;

        case "tools/call": {
          const toolName = request.params?.name;
          const toolArgs = request.params?.arguments || {};
          try {
            const result = await handleToolCall(toolName, toolArgs);
            sendEvent("response", createMcpResponse(request.id, {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            }));
          } catch (error: any) {
            sendEvent("response", createMcpError(request.id, -32603, error.message));
          }
          break;
        }

        case "resources/list":
          sendEvent("response", createMcpResponse(request.id, {
            resources: FORGE_RESOURCES,
          }));
          break;

        case "resources/read": {
          const uri = request.params?.uri;
          try {
            const contents = await handleResourceRead(uri);
            sendEvent("response", createMcpResponse(request.id, {
              contents: [{
                uri,
                mimeType: "application/json",
                text: JSON.stringify(contents, null, 2),
              }],
            }));
          } catch (error: any) {
            sendEvent("response", createMcpError(request.id, -32603, error.message));
          }
          break;
        }

        default:
          sendEvent("response", createMcpError(request.id, -32601, `Method not found: ${request.method}`));
      }
    } catch (error: any) {
      sendEvent("response", createMcpError(null, -32700, "Parse error"));
    }
  });

  req.on("close", () => {
    res.end();
  });
});

router.get("/mcp/sse", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`event: endpoint\ndata: /mcp/sse\n\n`);

  req.on("close", () => {
    res.end();
  });
});

export { router as mcpRouter };
