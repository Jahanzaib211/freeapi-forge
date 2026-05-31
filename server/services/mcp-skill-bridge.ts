import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import { mcpServers, mcpRegistry } from "../../drizzle/schema";
import { mcpExplorerService } from "./mcp-explorer-service";

interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

class McpSkillBridge {
  async getToolsForTenant(tenantId: number): Promise<Array<{ 
    source: "mcp"; serverId: number; serverName: string; tool: MCPTool 
  }>> {
    const db = await getDb();
    if (!db) return [];
    
    const servers = await db.select().from(mcpServers)
      .where(and(eq(mcpServers.tenantId, tenantId), eq(mcpServers.status, "connected")));
    
    const tools: Array<{ source: "mcp"; serverId: number; serverName: string; tool: MCPTool }> = [];
    
    for (const server of servers) {
      await this.syncServerTools(server.id, tenantId);
    }
    
    return tools;
  }

  async syncServerTools(serverId: number, tenantId: number): Promise<string[]> {
    const db = await getDb();
    if (!db) return [];
    
    const server = await db.select().from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.tenantId, tenantId)))
      .limit(1).then(r => r[0]);
    
    if (!server || !server.url) return [];
    
    try {
      const resp = await fetch(`${server.url}/tools`, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) return [];
      
      const data = await resp.json();
      const toolList: MCPTool[] = data.tools || [];
      
      // Register each as a skill in the database
      const { skills } = await import("../../drizzle/schema");
      const { sql } = await import("drizzle-orm");
      
      for (const tool of toolList) {
        const skillName = `mcp:${server.name}:${tool.name}`;
        try {
          await db.insert(skills).values({
            name: skillName,
            description: tool.description || `MCP tool from ${server.name}`,
            path: `mcp://${server.name}/${tool.name}`,
            category: "mcp",
            tenantId,
            enabled: 1,
          }).onConflictDoUpdate({
            target: skills.name,
            set: { description: tool.description || `MCP tool from ${server.name}`, enabled: 1 },
          });
        } catch {}
      }
      
      const names = toolList.map(t => `mcp:${server.name}:${t.name}`);
      return names;
    } catch {
      return [];
    }
  }

  async unsyncServerTools(serverId: number, tenantId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    
    const server = await db.select().from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.tenantId, tenantId)))
      .limit(1).then(r => r[0]);
    
    if (!server) return;
    
    const { skills } = await import("../../drizzle/schema");
    await db.delete(skills).where(
      and(eq(skills.tenantId, tenantId), sql`${skills.name} LIKE ${`mcp:${server.name}:%`}`)
    );
  }

  async executeTool(tenantId: number, serverId: number, toolName: string, params: Record<string, unknown>): Promise<{ result: any; error?: string }> {
    const db = await getDb();
    if (!db) return { result: null, error: "Database not available" };
    
    const server = await db.select().from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.tenantId, tenantId)))
      .limit(1).then(r => r[0]);
    
    if (!server) return { result: null, error: "MCP server not found" };
    if (!server.url) return { result: null, error: "MCP server not configured" };
    
    const startTime = Date.now();
    try {
      const resp = await fetch(`${server.url}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: toolName, arguments: params }),
        signal: AbortSignal.timeout(30000),
      });
      
      const data = await resp.json();
      const duration = Date.now() - startTime;
      
      await mcpExplorerService.logUsage(tenantId, null, serverId, toolName, params, data, duration, resp.ok, resp.ok ? undefined : data.error);
      
      if (!resp.ok) return { result: null, error: data.error || "MCP server error" };
      return { result: data };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      await mcpExplorerService.logUsage(tenantId, null, serverId, toolName, params, null, duration, false, err.message);
      return { result: null, error: err.message };
    }
  }
}

export const mcpSkillBridge = new McpSkillBridge();
