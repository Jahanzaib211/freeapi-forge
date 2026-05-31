import React, { useState, useCallback, useEffect } from "react";
import {
  ReactFlow, MiniMap, Controls, Background, addEdge,
  useNodesState, useEdgesState, type Connection, type Node, type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import WorkflowNode from "../components/workflow/WorkflowNode";
import { useAuth } from "../contexts/AuthContext";

const NODE_TYPES = {
  "monitor": { icon: "👁️", desc: "Always-on, watches, alerts" },
  "workflow": { icon: "⚡", desc: "Event-driven, task-oriented" },
  "chat": { icon: "💬", desc: "Conversational, user-facing" },
  "data": { icon: "📊", desc: "Analyze, transform, report" },
  "orchestrator": { icon: "🧠", desc: "Manages other agents" },
};

const NODE_PALETTE = [
  { category: "Triggers", items: [
    { type: "webhook-trigger", label: "Webhook", icon: "🪝" },
    { type: "cron-trigger", label: "Cron", icon: "⏰" },
    { type: "event-trigger", label: "Event", icon: "📨" },
    { type: "manual-trigger", label: "Manual", icon: "▶️" },
  ]},
  { category: "Agents", items: [
    { type: "agent-node", label: "Run Agent", icon: "⚡" },
    { type: "chat-agent-node", label: "Chat Agent", icon: "💬" },
    { type: "monitor-node", label: "Monitor", icon: "👁️" },
  ]},
  { category: "LLM", items: [
    { type: "llm-call", label: "LLM Call", icon: "🧠" },
    { type: "llm-branch", label: "LLM Branch", icon: "🔀" },
    { type: "llm-summarize", label: "Summarize", icon: "📝" },
  ]},
  { category: "Skills", items: [
    { type: "skill-node", label: "Skill", icon: "🎯" },
    { type: "mcp-tool-node", label: "MCP Tool", icon: "🔧" },
    { type: "rag-search", label: "RAG Search", icon: "🔍" },
  ]},
  { category: "Flow", items: [
    { type: "condition-node", label: "Condition", icon: "🔀" },
    { type: "delay-node", label: "Delay", icon: "⏳" },
    { type: "parallel-node", label: "Parallel", icon: "⏩" },
    { type: "loop-node", label: "Loop", icon: "🔄" },
    { type: "error-handler", label: "Error Handler", icon: "⚠️" },
  ]},
  { category: "Data", items: [
    { type: "http-request", label: "HTTP", icon: "🌐" },
    { type: "code-node", label: "Code", icon: "💻" },
    { type: "db-query", label: "DB Query", icon: "🗃️" },
    { type: "json-transform", label: "JSON", icon: "📋" },
    { type: "set-variable", label: "Variable", icon: "📌" },
    { type: "template-node", label: "Template", icon: "📄" },
  ]},
  { category: "Notify", items: [
    { type: "notify-in-app", label: "In-App", icon: "🔔" },
    { type: "notify-discord", label: "Discord", icon: "💬" },
    { type: "budget-check", label: "Budget Check", icon: "💰" },
  ]},
];

export default function WorkflowEditor() {
  const { getToken } = useAuth();
  const token = getToken();
  const [nodes, setNodes, onNodesChange] = useNodesState([] as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as any);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activeWf, setActiveWf] = useState<any>(null);
  const [showPalette, setShowPalette] = useState(false);

  useEffect(() => { loadWorkflows(); }, []);

  async function loadWorkflows() {
    try {
      const res = await fetch("/api/trpc/workflowRouter.list", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setWorkflows(d.result?.data?.json || []); }
    } catch {}
  }

  async function saveWorkflow() {
    if (!activeWf) return;
    const graph = JSON.stringify({ nodes, edges });
    try {
      await fetch("/api/trpc/workflowRouter.update?batch=1", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: { id: activeWf.id, graph } }]),
      });
    } catch {}
  }

  async function executeWorkflow() {
    if (!activeWf) return;
    await saveWorkflow();
    try {
      await fetch("/api/trpc/workflowRouter.execute?batch=1", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: { id: activeWf.id } }]),
      });
    } catch {}
  }

  const onConnect = useCallback((params: Connection) => setEdges(eds => addEdge(params, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow");
    if (!type) return;
    const position = { x: event.clientX - 200, y: event.clientY - 100 };
    const newNode: Node = { id: `${type}_${Date.now()}`, type: "workflowNode", position, data: { nodeType: type, label: type } as any };
    setNodes(nds => [...nds, newNode]);
  }, [setNodes]);

  const nodeTypes = { workflowNode: WorkflowNode };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left sidebar — workflow list */}
      <div className="w-64 border-r border-border flex flex-col bg-card">
        <div className="p-3 border-b border-border">
          <div className="flex gap-2">
            <button onClick={() => setShowPalette(!showPalette)} className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              + New
            </button>
            <button onClick={saveWorkflow} className="px-3 py-2 bg-muted text-foreground rounded-lg text-sm">💾</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {workflows.map(wf => (
            <button key={wf.id} onClick={() => setActiveWf(wf)}
              className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                activeWf?.id === wf.id ? "bg-primary/10 text-primary border border-primary/30" : "text-foreground hover:bg-muted"
              }`}>
              <p className="font-medium truncate">{wf.name}</p>
              <p className="text-xs text-muted-foreground">{wf.status} · {wf.triggerType}</p>
            </button>
          ))}
          {workflows.length === 0 && <p className="text-muted-foreground text-sm p-2">No workflows yet</p>}
        </div>
      </div>

      {/* Node Palette (overlay) */}
      {showPalette && (
        <div className="absolute left-64 top-14 z-50 w-64 bg-card border border-border rounded-xl shadow-xl p-3 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Node Palette</p>
            <button onClick={() => setShowPalette(false)} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
          {NODE_PALETTE.map(group => (
            <div key={group.category} className="mb-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">{group.category}</p>
              <div className="grid grid-cols-2 gap-1">
                {group.items.map(item => (
                  <div key={item.type} draggable
                    onDragStart={e => e.dataTransfer.setData("application/reactflow", item.type)}
                    className="flex items-center gap-1.5 px-2 py-1.5 bg-muted rounded text-xs text-foreground cursor-grab hover:bg-accent">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ReactFlow Canvas */}
      <div className="flex-1 bg-background" onDragOver={onDragOver} onDrop={onDrop}>
        {activeWf ? (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onNodeClick={(_, node) => setSelectedNode(node)}
            nodeTypes={nodeTypes} fitView
          >
            <Controls />
            <MiniMap className="!bg-card !border-border" />
            <Background color="var(--border)" gap={20} />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-2xl mb-3">⚡</p>
              <p className="text-muted-foreground">Select or create a workflow to edit</p>
              <button onClick={() => setShowPalette(true)} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
                Create Workflow
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Properties Panel */}
      {selectedNode && activeWf && (
        <div className="w-72 border-l border-border bg-card p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">Node Properties</p>
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground">&times;</button>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Type</p>
          <p className="text-sm text-foreground mb-3">{(selectedNode.data as any)?.nodeType}</p>
          <p className="text-xs text-muted-foreground mb-1">Label</p>
          <input
            value={((selectedNode.data as any)?.label as string) || ""}
            onChange={e => setNodes((nds: any[]) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n))}
            className="w-full px-2 py-1 bg-muted border border-border rounded text-sm text-foreground mb-3"
          />
          <p className="text-xs text-muted-foreground mb-1">Node ID</p>
          <p className="text-xs text-muted-foreground/70 mb-3">{selectedNode.id}</p>
          <button onClick={() => {
            setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
            setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
            setSelectedNode(null);
          }} className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/30 rounded text-xs">
            Delete Node
          </button>
        </div>
      )}

      {/* Top toolbar */}
      {activeWf && (
        <div className="absolute top-14 right-4 flex gap-2 z-10">
          <button onClick={() => setShowPalette(!showPalette)} className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground hover:bg-accent">
            + Add Node
          </button>
          <button onClick={saveWorkflow} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium">
            💾 Save
          </button>
          <button onClick={executeWorkflow} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
            ▶ Run
          </button>
        </div>
      )}
    </div>
  );
}
