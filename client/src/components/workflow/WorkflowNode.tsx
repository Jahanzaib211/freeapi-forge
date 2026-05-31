import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const NODE_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  "webhook-trigger": { icon: "🪝", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "cron-trigger": { icon: "⏰", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "event-trigger": { icon: "📨", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "manual-trigger": { icon: "▶️", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "agent-node": { icon: "⚡", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  "chat-agent-node": { icon: "💬", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  "monitor-node": { icon: "👁️", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  "llm-call": { icon: "🧠", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  "llm-branch": { icon: "🔀", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  "llm-summarize": { icon: "📝", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  "skill-node": { icon: "🎯", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "mcp-tool-node": { icon: "🔧", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "rag-search": { icon: "🔍", color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
  "condition-node": { icon: "🔀", color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  "code-node": { icon: "💻", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  "http-request": { icon: "🌐", color: "#14b8a6", bg: "rgba(20,184,166,0.1)" },
  "delay-node": { icon: "⏳", color: "#64748b", bg: "rgba(100,116,139,0.1)" },
  "notify-in-app": { icon: "🔔", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  "notify-discord": { icon: "💬", color: "#5865f2", bg: "rgba(88,101,242,0.1)" },
  "budget-check": { icon: "💰", color: "#84cc16", bg: "rgba(132,204,22,0.1)" },
  "chat-send": { icon: "💬", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  "parallel-node": { icon: "⏩", color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  "loop-node": { icon: "🔄", color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  "db-query": { icon: "🗃️", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  "json-transform": { icon: "📋", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  "set-variable": { icon: "📌", color: "#64748b", bg: "rgba(100,116,139,0.1)" },
  "template-node": { icon: "📄", color: "#64748b", bg: "rgba(100,116,139,0.1)" },
  "error-handler": { icon: "⚠️", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

export default function WorkflowNode({ data, selected }: NodeProps) {
  const style = NODE_STYLES[data.nodeType as string] || { icon: "📦", color: "#64748b", bg: "rgba(100,116,139,0.1)" };

  return (
    <div className={`bg-card border-2 rounded-xl px-4 py-3 min-w-[160px] shadow-sm transition-all ${
      selected ? "border-primary ring-2 ring-primary/30" : "border-border"
    }`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <span className="text-lg">{style.icon}</span>
        <div>
          <p className="text-sm font-medium text-foreground">{String(data.label || data.nodeType)}</p>
          <p className="text-xs text-muted-foreground">{(data as any).nodeType}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
    </div>
  );
}
