export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPServer {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  tools: MCPTool[];
  resources: MCPResource[];
  status: "connected" | "disconnected" | "error";
  lastSyncAt?: Date;
  createdAt?: Date;
}
