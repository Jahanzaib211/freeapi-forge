import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { mcpServers } from "../../drizzle/schema";
import { mcpHost } from "../services/mcp_host";

export const mcpRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const servers = await db.select().from(mcpServers);
    return servers.map((s) => ({
      id: s.id,
      name: s.name,
      transport: s.transport,
      url: s.url,
      authConfig: s.authConfig,
      status: s.status,
      toolCount: s.toolCount,
      lastSeen: s.lastSeen,
      createdAt: s.createdAt,
    }));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(mcpServers)
        .where(eq(mcpServers.id, input.id))
        .limit(1);

      if (result.length === 0) throw new Error("MCP server not found");
      return result[0];
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        transport: z.string().default("sse"),
        url: z.string().url(),
        authConfig: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await mcpHost.registerServer(input);
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        transport: z.string().optional(),
        url: z.string().url().optional(),
        authConfig: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      await db.update(mcpServers).set(updates).where(eq(mcpServers.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await mcpHost.removeServer(input.id);
      return { success };
    }),

  connect: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await mcpHost.connectServer(input.id);
      return { success };
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await mcpHost.disconnectServer(input.id);
      return { success };
    }),

  tools: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const tools = await mcpHost.discoverTools(input.id);
      return tools;
    }),

  executeTool: protectedProcedure
    .input(
      z.object({
        serverId: z.number(),
        toolName: z.string(),
        args: z.record(z.string(), z.any()).default({}),
      })
    )
    .mutation(async ({ input }) => {
      const result = await mcpHost.executeTool(
        input.serverId,
        input.toolName,
        input.args
      );
      return result;
    }),

  allTools: protectedProcedure.query(async () => {
    const tools = await mcpHost.getAllTools();
    return tools;
  }),
});
