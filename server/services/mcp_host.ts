import { EventEmitter } from "events";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { mcpServers } from "../../drizzle/schema";

interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface McpServerConnection {
  id: number;
  name: string;
  transport: string;
  url: string;
  status: "connected" | "disconnected" | "error";
  tools: McpTool[];
  resources: McpResource[];
  toolCount: number;
  lastSeen: Date | null;
}

interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}

export class McpHost extends EventEmitter {
  private connections: Map<number, McpServerConnection> = new Map();
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  async registerServer(input: {
    name: string;
    transport?: string;
    url: string;
    authConfig?: string;
  }): Promise<number | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const result = await db
        .insert(mcpServers)
        .values({
          name: input.name,
          transport: input.transport || "sse",
          url: input.url,
          authConfig: input.authConfig || null,
        })
        .returning({ id: mcpServers.id });

      return result[0].id;
    } catch {
      return null;
    }
  }

  async connectServer(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      const result = await db
        .select()
        .from(mcpServers)
        .where(eq(mcpServers.id, id))
        .limit(1);

      if (result.length === 0) return false;

      const server = result[0];
      const connection: McpServerConnection = {
        id: server.id,
        name: server.name,
        transport: server.transport,
        url: server.url,
        status: "connected",
        tools: [],
        resources: [],
        toolCount: 0,
        lastSeen: new Date(),
      };

      this.connections.set(id, connection);

      await db
        .update(mcpServers)
        .set({
          status: "connected",
          lastSeen: new Date(),
        })
        .where(eq(mcpServers.id, id));

      this.emit("connected", { id, name: server.name });
      return true;
    } catch {
      return false;
    }
  }

  async disconnectServer(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      this.connections.delete(id);

      await db
        .update(mcpServers)
        .set({ status: "disconnected" })
        .where(eq(mcpServers.id, id));

      this.emit("disconnected", { id });
      return true;
    } catch {
      return false;
    }
  }

  async discoverTools(id: number): Promise<McpTool[]> {
    const connection = this.connections.get(id);
    if (!connection) return [];

    try {
      const response = await fetch(connection.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.json() as any;
      const tools = data.result?.tools || [];

      connection.tools = tools;
      connection.toolCount = tools.length;
      connection.lastSeen = new Date();

      const db = await getDb();
      if (db) {
        await db
          .update(mcpServers)
          .set({
            toolCount: tools.length,
            lastSeen: new Date(),
          })
          .where(eq(mcpServers.id, id));
      }

      return tools;
    } catch {
      connection.status = "error";
      return [];
    }
  }

  async listResources(id: number): Promise<McpResource[]> {
    const connection = this.connections.get(id);
    if (!connection) return [];

    try {
      const response = await fetch(connection.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "resources/list",
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.json() as any;
      const resources = data.result?.resources || [];

      connection.resources = resources;
      connection.lastSeen = new Date();

      return resources;
    } catch {
      return [];
    }
  }

  async executeTool(
    serverId: number,
    toolName: string,
    args: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return { success: false, error: "Server not connected" };
    }

    try {
      const response = await fetch(connection.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      const data = await response.json() as any;

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      connection.lastSeen = new Date();
      return { success: true, result: data.result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getAllServers(): Promise<McpServerConnection[]> {
    return Array.from(this.connections.values());
  }

  async getConnectedServers(): Promise<McpServerConnection[]> {
    return Array.from(this.connections.values()).filter(
      (c) => c.status === "connected"
    );
  }

  async getAllTools(): Promise<(McpTool & { serverId: number; serverName: string })[]> {
    const tools: (McpTool & { serverId: number; serverName: string })[] = [];

    Array.from(this.connections.values()).forEach((connection) => {
      if (connection.status === "connected") {
        connection.tools.forEach((tool) => {
          tools.push({
            ...tool,
            serverId: connection.id,
            serverName: connection.name,
          });
        });
      }
    });

    return tools;
  }

  getServer(id: number): McpServerConnection | undefined {
    return this.connections.get(id);
  }

  isServerConnected(id: number): boolean {
    const connection = this.connections.get(id);
    return connection?.status === "connected";
  }

  async removeServer(id: number): Promise<boolean> {
    await this.disconnectServer(id);

    const db = await getDb();
    if (!db) return false;

    try {
      await db.delete(mcpServers).where(eq(mcpServers.id, id));
      return true;
    } catch {
      return false;
    }
  }
}

export const mcpHost = new McpHost();
