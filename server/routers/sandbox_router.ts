import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { sandboxManager } from "../services/sandbox_manager";
import { spawn } from "child_process";
import WebSocket from "ws";
import { IncomingMessage } from "http";
import type { Server as WSServer } from "ws";

export function setupTerminalWebSocket(wss: WSServer) {
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = req.url || "";
    if (!url.startsWith("/ws/terminal")) return;

    const sessionId = `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cmd = sandboxManager.getTerminalCommand(sessionId);

    let shell: ReturnType<typeof spawn> | null = null;

    try {
      shell = spawn(cmd[0], cmd.slice(1), {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, TERM: "xterm-256color", HOME: "/workspace" },
      });

      shell.stdout?.on("data", (data: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "stdout", data: data.toString() }));
      });

      shell.stderr?.on("data", (data: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "stderr", data: data.toString() }));
      });

      shell.on("close", (code) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "exit", code }));
        ws.close();
      });

      shell.on("error", (err) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "error", data: err.message }));
        ws.close();
      });

      ws.on("message", (msg: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(msg.toString());
          if (parsed.type === "stdin" && shell?.stdin?.writable) {
            shell.stdin.write(parsed.data);
          }
          if (parsed.type === "resize") {
            if (shell?.stdin?.writable) {
              // Terminal resize - set terminal size via escape sequence
              shell.stdin.write(`\x1b[8;${parsed.rows};${parsed.cols}t`);
            }
          }
        } catch {}
      });

      ws.on("close", () => {
        if (shell) { shell.kill("SIGTERM"); shell = null; }
      });
    } catch (err: any) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "error", data: err.message }));
        ws.close();
      }
    }
  });
}

export const sandboxRouter = router({
  execute: publicProcedure
    .input(
      z.object({
        language: z.string().min(1),
        code: z.string().min(1),
        timeout: z.number().min(1000).max(120000).default(30000),
      })
    )
    .mutation(async ({ input }) => {
      return sandboxManager.execute(input.language, input.code, input.timeout);
    }),

  languages: publicProcedure.query(() => {
    return sandboxManager.listLanguages();
  }),

  status: publicProcedure.query(() => {
    return sandboxManager.getStatus();
  }),
});
