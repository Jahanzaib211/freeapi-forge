import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

interface Agent {
  id: number;
  name: string;
  type: string;
  description: string | null;
  status: string;
  model: string;
  tools: string[] | null;
  totalRuns: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

interface AgentForm {
  name: string;
  type: string;
  description: string;
  systemPrompt: string;
  model: string;
  tools: string;
  triggers: string;
  schedule: string;
  maxSteps: number;
  maxRuntime: number;
  maxBudget: number;
  requireApproval: string;
}

const AGENT_TEMPLATES = [
  { name: "System Guardian", type: "monitor", desc: "Watches all services, auto-heals, alerts on failure", prompt: "You are a system guardian. Monitor all services and auto-heal when possible.", triggers: "cron", schedule: "*/30 * * * * *", tools: "health_check,notification", model: "fast-8b" },
  { name: "Security Sentinel", type: "monitor", desc: "Watches for anomalies, brute force, unauthorized access", prompt: "You monitor security. Detect anomalies and alert.", triggers: "cron+event", schedule: "*/60 * * * * *", tools: "audit_log_reader,rate_limit_check,notification", model: "fast-8b" },
  { name: "Document Processor", type: "workflow", desc: "Watches for uploads, chunks, embeds, indexes", prompt: "You process uploaded documents. Chunk, index, and notify.", triggers: "event", schedule: "", tools: "rag_search,notification", model: "fast-8b" },
  { name: "Cost Optimizer", type: "workflow", desc: "Monitors LLM spend, switches to cheaper providers", prompt: "Optimize LLM costs by switching providers.", triggers: "cron+event", schedule: "*/300 * * * * *", tools: "budget_check,notification", model: "fast-8b" },
  { name: "Chat Bot", type: "chat", desc: "General AI assistant with RAG knowledge", prompt: "You are a helpful AI assistant.", triggers: "manual", schedule: "", tools: "rag_search,llm,list_conversations", model: "fast-8b" },
  { name: "Code Reviewer", type: "workflow", desc: "Reviews code on webhook trigger", prompt: "You review code changes and suggest improvements.", triggers: "event", schedule: "", tools: "llm,skill", model: "coding" },
  { name: "Usage Reporter", type: "data", desc: "Generates daily/weekly usage reports", prompt: "Generate usage reports from system data.", triggers: "cron", schedule: "*/3600 * * * * *", tools: "list_conversations,notification", model: "fast-8b" },
  { name: "Model Health Watcher", type: "monitor", desc: "Pings all models, auto-disables failing ones", prompt: "Monitor model health and disable failing models.", triggers: "cron", schedule: "*/120 * * * * *", tools: "health_check,list_models,notification", model: "fast-8b" },
  { name: "Backup Agent", type: "workflow", desc: "Automated database backups", prompt: "Automate database backup process.", triggers: "cron", schedule: "*/86400 * * * * *", tools: "db_query,notification", model: "fast-8b" },
  { name: "Compliance Scanner", type: "workflow", desc: "Scans conversations for policy violations", prompt: "Scan conversations for policy violations.", triggers: "cron", schedule: "*/3600 * * * * *", tools: "audit_log_reader,rag_search,notification", model: "fast-8b" },
  { name: "Fleet Manager", type: "orchestrator", desc: "Manages all agents, ensures no conflicts", prompt: "Manage the agent fleet. Coordinate and resolve conflicts.", triggers: "cron", schedule: "*/300 * * * * *", tools: "health_check,notification", model: "fast-8b" },
  { name: "Onboarding Buddy", type: "chat", desc: "Guides new team members through setup", prompt: "Welcome new users. Guide them through setup.", triggers: "event+manual", schedule: "", tools: "llm,rag_search", model: "fast-8b" },
];

export default function AgentBuilder() {
  const { getToken } = useAuth();
  const token = getToken();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [form, setForm] = useState<AgentForm>({
    name: "", type: "monitor", description: "", systemPrompt: "", model: "fast-8b",
    tools: "", triggers: "manual", schedule: "", maxSteps: 10, maxRuntime: 60, maxBudget: 0.5, requireApproval: "",
  });

  useEffect(() => { loadAgents(); }, []);

  async function loadAgents() {
    try {
      const res = await fetch(`/api/trpc/agentBuilder.list?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.result?.data?.json || []);
      }
    } catch {}
  }

  function applyTemplate(tpl: typeof AGENT_TEMPLATES[0]) {
    const triggerType = tpl.triggers.includes("+") ? tpl.triggers.split("+") : [tpl.triggers];
    const hasCron = triggerType.includes("cron");
    const hasEvent = triggerType.includes("event");
    const hasManual = triggerType.includes("manual");
    setForm({
      name: tpl.name, type: tpl.type, description: tpl.desc,
      systemPrompt: tpl.prompt, model: tpl.model, tools: tpl.tools,
      triggers: hasCron && hasEvent ? "cron+event" : hasCron ? "cron" : hasEvent ? "event" : "manual",
      schedule: tpl.schedule, maxSteps: 10, maxRuntime: 60, maxBudget: 0.5, requireApproval: "",
    });
    setShowTemplates(false);
    setShowForm(true);
  }

  async function createAgent() {
    const isCron = form.triggers.includes("cron");
    const isEvent = form.triggers.includes("event");
    const triggers: any[] = [];
    if (isCron) triggers.push({ type: "cron", schedule: form.schedule || "*/300 * * * * *" });
    if (isEvent) triggers.push({ type: "event", events: ["user.created", "chat.started"] });
    if (form.triggers === "manual" || (!isCron && !isEvent)) triggers.push({ type: "manual" });

    const payload = {
      json: {
        name: form.name,
        type: form.type,
        description: form.description || undefined,
        systemPrompt: form.systemPrompt || undefined,
        model: form.model,
        tools: form.tools.split(",").map(t => t.trim()).filter(Boolean),
        config: {
          triggers,
          llm: { model: form.model, temperature: 0.7, maxTokens: 2048 },
          memory: { contextWindow: 50, persistentMemory: true },
          guardrails: {
            maxSteps: form.maxSteps,
            maxRuntimeSec: form.maxRuntime,
            maxBudgetRun: form.maxBudget,
            requireApproval: form.requireApproval.split(",").map(t => t.trim()).filter(Boolean),
            scope: form.tools.split(",").map(t => t.trim()).filter(Boolean),
          },
          systemPrompt: form.systemPrompt || undefined,
        },
      },
    };

    try {
      const res = await fetch("/api/trpc/agentBuilder.create?batch=1", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([payload]),
      });
      if (res.ok) {
        setShowForm(false);
        resetForm();
        loadAgents();
      }
    } catch {}
  }

  async function runAgent(id: number) {
    try {
      await fetch(`/api/trpc/agentBuilder.trigger?batch=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: { id } }]),
      });
    } catch {}
  }

  async function deleteAgent(id: number) {
    try {
      await fetch(`/api/trpc/agentBuilder.delete?batch=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: { id } }]),
      });
      loadAgents();
    } catch {}
  }

  function resetForm() {
    setForm({ name: "", type: "monitor", description: "", systemPrompt: "", model: "fast-8b", tools: "", triggers: "manual", schedule: "", maxSteps: 10, maxRuntime: 60, maxBudget: 0.5, requireApproval: "" });
  }

  const statusColor: Record<string, string> = { active: "bg-green-500", paused: "bg-yellow-500", error: "bg-red-500", creating: "bg-blue-500" };
  const typeIcon: Record<string, string> = { chat: "💬", workflow: "⚡", monitor: "👁️", data: "📊", orchestrator: "🧠" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🤖 Agent Builder</h1>
          <p className="text-muted-foreground mt-1">Create and manage autonomous AI agents</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowTemplates(true); setShowForm(false); }} className="px-4 py-2 bg-gray-800 text-foreground rounded-lg text-sm hover:bg-gray-700">
            Templates
          </button>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-[#00FFB2] text-black rounded-lg text-sm font-medium hover:bg-[#00cc8e]">
            + New Agent
          </button>
        </div>
      </div>

      {/* Template Picker */}
      {showTemplates && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pre-built Agent Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {AGENT_TEMPLATES.map(tpl => (
              <button key={tpl.name} onClick={() => applyTemplate(tpl)}
                className="text-left p-4 bg-background border border-border/80 rounded-lg hover:border-[#00FFB2] transition-colors">
                <p className="text-foreground font-medium">{tpl.name}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{tpl.desc}</p>
                <span className="text-xs text-gray-600 mt-2 block capitalize">{tpl.type} · {tpl.triggers}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowTemplates(false)} className="mt-3 text-muted-foreground/70 text-sm hover:text-foreground">Close</button>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{editing ? "Edit" : "Create"} Agent</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground">
                <option value="monitor">👁️ Monitor — always-on, watches, alerts</option>
                <option value="workflow">⚡ Workflow — event-driven, task-oriented</option>
                <option value="chat">💬 Chat — conversational, user-facing</option>
                <option value="data">📊 Data — analyze, transform, report</option>
                <option value="orchestrator">🧠 Orchestrator — manages other agents</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground block mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground" rows={2} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground block mb-1">System Prompt</label>
              <textarea value={form.systemPrompt} onChange={e => setForm({...form, systemPrompt: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground font-mono text-sm" rows={3} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Model</label>
              <select value={form.model} onChange={e => setForm({...form, model: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground">
                <option value="fast-8b">Fast 8B</option>
                <option value="chat">Chat</option>
                <option value="coding">Coding</option>
                <option value="vision">Vision</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Trigger</label>
              <select value={form.triggers} onChange={e => setForm({...form, triggers: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground">
                <option value="manual">Manual only</option>
                <option value="cron">Cron schedule</option>
                <option value="event">Event-driven</option>
                <option value="cron+event">Cron + Events</option>
              </select>
            </div>
            {form.triggers.includes("cron") && (
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Schedule (cron)</label>
                <input value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})}
                  placeholder="*/300 * * * * * (every 5 min)"
                  className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground font-mono text-sm" />
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Tools (comma-separated)</label>
              <input value={form.tools} onChange={e => setForm({...form, tools: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground font-mono text-sm"
                placeholder="rag_search, llm, health_check, notification" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Max Steps</label>
              <input type="number" value={form.maxSteps} onChange={e => setForm({...form, maxSteps: parseInt(e.target.value) || 10})}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Max Runtime (s)</label>
              <input type="number" value={form.maxRuntime} onChange={e => setForm({...form, maxRuntime: parseInt(e.target.value) || 60})}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Max Budget ($)</label>
              <input type="number" value={form.maxBudget} onChange={e => setForm({...form, maxBudget: parseFloat(e.target.value) || 0.5})}
                step="0.1" className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground" />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm text-muted-foreground block mb-1">Requires Approval (tools)</label>
            <input value={form.requireApproval} onChange={e => setForm({...form, requireApproval: e.target.value})}
              className="w-full px-3 py-2 bg-background border border-border/80 rounded-lg text-foreground"
              placeholder="notification (tools that need human approval)" />
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={createAgent} disabled={!form.name}
              className="px-6 py-2 bg-[#00FFB2] text-black font-medium rounded-lg hover:bg-[#00cc8e] disabled:opacity-50">
              Save Agent
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 text-foreground rounded-lg hover:bg-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Agent List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map(agent => (
          <div key={agent.id} className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{typeIcon[agent.type] || "🤖"}</span>
                <div>
                  <h3 className="text-foreground font-medium">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground/70 capitalize">{agent.type} agent</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${statusColor[agent.status] || "bg-gray-500"}`} />
                <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
              </div>
            </div>
            {agent.description && (
              <p className="text-sm text-muted-foreground mt-3">{agent.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground/70">
              <span>🛠️ {agent.tools?.length || 0} tools</span>
              <span>▶️ {agent.totalRuns} runs</span>
              <span>📋 {agent.model}</span>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => runAgent(agent.id)}
                className="px-3 py-1 bg-[#00FFB2]/10 text-[#00FFB2] border border-[#00FFB2]/30 rounded text-xs hover:bg-[#00FFB2]/20">
                ▶ Run Now
              </button>
              <a href={`/agents/${agent.id}`}
                className="px-3 py-1 bg-gray-800 text-foreground rounded text-xs hover:bg-gray-700">
                Activity
              </a>
              <button onClick={() => deleteAgent(agent.id)}
                className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-500/20">
                Delete
              </button>
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground/70">
            <p className="text-4xl mb-3">🤖</p>
            <p>No agents yet. Create your first agent to automate your AI infrastructure.</p>
          </div>
        )}
      </div>
    </div>
  );
}
