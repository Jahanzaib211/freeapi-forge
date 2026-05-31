import { Response } from "express";
import { IncomingMessage } from "http";

interface SSEClient {
  id: string;
  tenantId: number;
  res: Response;
}

class SSEManager {
  private clients: SSEClient[] = [];

  addClient(id: string, tenantId: number, req: IncomingMessage, res: Response): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(":ok\n\n");
    const client: SSEClient = { id, tenantId, res };
    this.clients.push(client);
    req.on("close", () => { this.clients = this.clients.filter(c => c.id !== id); });
  }

  sendEvent(tenantId: number, eventType: string, data: any): void {
    const msg = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of this.clients) {
      if (c.tenantId === tenantId) c.res.write(msg);
    }
  }

  sendToAll(eventType: string, data: any): void {
    const msg = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of this.clients) c.res.write(msg);
  }

  getClientCount(): number { return this.clients.length; }
}

export const sseManager = new SSEManager();
