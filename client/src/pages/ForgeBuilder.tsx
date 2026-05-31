import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Workflow, Blocks } from "lucide-react";
import BlockBuilder from "./BlockBuilder";

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
  createdAt: string;
}

interface WorkflowDef {
  id: string;
  name: string;
  description: string;
  status: string;
  stepCount: number;
  lastRunAt: string | null;
  createdAt: string;
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

function api(token: string | null) {
  return {
    query: async (path: string, input?: Record<string, any>) => {
      const params = input
        ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
        : "?input=%7B%7D";
      const res = await fetch(`/api/trpc/${path}${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    },
    mutate: async (path: string, input: Record<string, any>) => {
      const res = await fetch(`/api/trpc/${path}?batch=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: input }]),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    },
  };
}

const typeIcon: Record<string, string> = { chat: "\uD83D\uDCAC", workflow: "\u26A1", monitor: "\uD83D\uDC41\uFE0F", data: "\uD83D\uDCCA", orchestrator: "\uD83E\uDDE0" };
const statusColor: Record<string, string> = { active: "bg-green-500", paused: "bg-yellow-500", error: "bg-red-500", creating: "bg-blue-500" };

export default function ForgeBuilder() {
  const { getToken } = useAuth();
  const token = getToken();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [workflows, setWorkflows] = useState<WorkflowDef[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    type: "monitor",
    description: "",
    systemPrompt: "",
    model: "fast-8b",
    tools: "",
    triggers: "manual",
    schedule: "",
    maxSteps: 10,
    maxRuntime: 60,
    maxBudget: 0.5,
    requireApproval: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!token) return;
    loadAgents();
    loadWorkflows();
  }, [token]);

  async function loadAgents() {
    setAgentsLoading(true);
    try {
      const data = await api(token).query("agents.list");
      setAgents(data?.result?.data?.json || []);
    } catch {}
    setAgentsLoading(false);
  }

  async function loadWorkflows() {
    setWorkflowsLoading(true);
    try {
      const data = await api(token).query("workflowRouter.list");
      setWorkflows(data?.result?.data?.json || []);
    } catch {}
    setWorkflowsLoading(false);
  }

  function applyTemplate(tpl: typeof AGENT_TEMPLATES[0]) {
    const triggerType = tpl.triggers.includes("+") ? tpl.triggers.split("+") : [tpl.triggers];
    const hasCron = triggerType.includes("cron");
    const hasEvent = triggerType.includes("event");
    setForm({
      name: tpl.name,
      type: tpl.type,
      description: tpl.desc,
      systemPrompt: tpl.prompt,
      model: tpl.model,
      tools: tpl.tools,
      triggers: hasCron && hasEvent ? "cron+event" : hasCron ? "cron" : hasEvent ? "event" : "manual",
      schedule: tpl.schedule,
      maxSteps: 10,
      maxRuntime: 60,
      maxBudget: 0.5,
      requireApproval: "",
    });
    setShowTemplates(false);
    setShowCreateForm(true);
  }

  async function handleCreateAgent() {
    if (!form.name) return;
    setCreating(true);
    setCreateError("");

    const isCron = form.triggers.includes("cron");
    const isEvent = form.triggers.includes("event");
    const triggers: any[] = [];
    if (isCron) triggers.push({ type: "cron", schedule: form.schedule || "*/300 * * * * *" });
    if (isEvent) triggers.push({ type: "event", events: ["user.created", "chat.started"] });
    if (form.triggers === "manual" || (!isCron && !isEvent)) triggers.push({ type: "manual" });

    const payload = {
      name: form.name,
      type: form.type,
      description: form.description || undefined,
      systemPrompt: form.systemPrompt || undefined,
      model: form.model,
      tools: form.tools.split(",").map((t) => t.trim()).filter(Boolean),
      config: {
        triggers,
        llm: { model: form.model, temperature: 0.7, maxTokens: 2048 },
        memory: { contextWindow: 50, persistentMemory: true },
        guardrails: {
          maxSteps: form.maxSteps,
          maxRuntimeSec: form.maxRuntime,
          maxBudgetRun: form.maxBudget,
          requireApproval: form.requireApproval.split(",").map((t) => t.trim()).filter(Boolean),
          scope: form.tools.split(",").map((t) => t.trim()).filter(Boolean),
        },
        systemPrompt: form.systemPrompt || undefined,
      },
    };

    try {
      const data = await api(token).mutate("agentBuilder.create", payload);
      if (data) {
        setShowCreateForm(false);
        resetForm();
        loadAgents();
      } else {
        setCreateError("Failed to create agent.");
      }
    } catch {
      setCreateError("An error occurred.");
    }
    setCreating(false);
  }

  async function handleDeleteAgent(id: number) {
    try {
      await api(token).mutate("agentBuilder.delete", { id });
      loadAgents();
    } catch {}
  }

  async function handleRunAgent(id: number) {
    try {
      await api(token).mutate("agentBuilder.trigger", { id });
    } catch {}
  }

  function resetForm() {
    setForm({
      name: "", type: "monitor", description: "", systemPrompt: "", model: "fast-8b",
      tools: "", triggers: "manual", schedule: "", maxSteps: 10, maxRuntime: 60, maxBudget: 0.5, requireApproval: "",
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🏗️ Forge Builder</h1>
        <p className="text-muted-foreground mt-1">Build agents, orchestrate workflows, and compose blocks</p>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agents">
            <Bot className="w-4 h-4 mr-2" /> Agents
          </TabsTrigger>
          <TabsTrigger value="workflows">
            <Workflow className="w-4 h-4 mr-2" /> Workflows
          </TabsTrigger>
          <TabsTrigger value="block-builder">
            <Blocks className="w-4 h-4 mr-2" /> Block Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Agent Builder</h2>
              <p className="text-sm text-muted-foreground">Create and manage autonomous AI agents</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowTemplates(true); setShowCreateForm(false); }}>
                Templates
              </Button>
              <Button onClick={() => setShowCreateForm(true)}>
                + New Agent
              </Button>
            </div>
          </div>

          {showTemplates && (
            <Card>
              <CardHeader>
                <CardTitle>Pre-built Agent Templates</CardTitle>
                <CardDescription>Select a template to get started quickly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {AGENT_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.name}
                      onClick={() => applyTemplate(tpl)}
                      className="text-left p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <p className="text-foreground font-medium">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{tpl.desc}</p>
                      <span className="text-xs text-muted-foreground/70 mt-2 block capitalize">
                        {tpl.type} · {tpl.triggers}
                      </span>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" onClick={() => setShowTemplates(false)} className="mt-3">
                  Close
                </Button>
              </CardContent>
            </Card>
          )}

          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create Agent</CardTitle>
                <CardDescription>Configure your AI agent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Name</label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="My Agent"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    >
                      <option value="monitor">Monitor — always-on, watches, alerts</option>
                      <option value="workflow">Workflow — event-driven, task-oriented</option>
                      <option value="chat">Chat — conversational, user-facing</option>
                      <option value="data">Data — analyze, transform, report</option>
                      <option value="orchestrator">Orchestrator — manages other agents</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground block mb-1">Description</label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="What does this agent do?"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground block mb-1">System Prompt</label>
                    <textarea
                      value={form.systemPrompt}
                      onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm"
                      rows={3}
                      placeholder="You are a helpful assistant..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Model</label>
                    <select
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    >
                      <option value="fast-8b">Fast 8B</option>
                      <option value="chat">Chat</option>
                      <option value="coding">Coding</option>
                      <option value="vision">Vision</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Trigger</label>
                    <select
                      value={form.triggers}
                      onChange={(e) => setForm({ ...form, triggers: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    >
                      <option value="manual">Manual only</option>
                      <option value="cron">Cron schedule</option>
                      <option value="event">Event-driven</option>
                      <option value="cron+event">Cron + Events</option>
                    </select>
                  </div>
                  {form.triggers.includes("cron") && (
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Schedule (cron)</label>
                      <Input
                        value={form.schedule}
                        onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                        placeholder="*/300 * * * * *"
                        className="font-mono"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Tools (comma-separated)</label>
                    <Input
                      value={form.tools}
                      onChange={(e) => setForm({ ...form, tools: e.target.value })}
                      placeholder="rag_search, llm, notification"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Max Steps</label>
                    <Input
                      type="number"
                      value={form.maxSteps}
                      onChange={(e) => setForm({ ...form, maxSteps: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Max Runtime (s)</label>
                    <Input
                      type="number"
                      value={form.maxRuntime}
                      onChange={(e) => setForm({ ...form, maxRuntime: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Max Budget ($)</label>
                    <Input
                      type="number"
                      value={form.maxBudget}
                      onChange={(e) => setForm({ ...form, maxBudget: parseFloat(e.target.value) || 0.5 })}
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm text-muted-foreground block mb-1">Requires Approval (tools)</label>
                  <Input
                    value={form.requireApproval}
                    onChange={(e) => setForm({ ...form, requireApproval: e.target.value })}
                    placeholder="notification (tools that need human approval)"
                  />
                </div>

                {createError && (
                  <p className="text-sm text-red-500 mt-4">{createError}</p>
                )}

                <div className="flex gap-2 mt-6">
                  <Button onClick={handleCreateAgent} disabled={creating || !form.name}>
                    {creating ? "Creating..." : "Save Agent"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {agentsLoading ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">Loading agents...</div>
            ) : agents.length === 0 ? (
              <div className="col-span-2 text-center py-16">
                <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-foreground">No agents yet</p>
                <p className="text-muted-foreground text-sm mt-1">Create your first agent to automate your AI infrastructure.</p>
              </div>
            ) : (
              agents.map((agent) => (
                <Card key={agent.id} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{typeIcon[agent.type] || "\uD83E\uDD16"}</span>
                        <div>
                          <CardTitle>{agent.name}</CardTitle>
                          <CardDescription className="capitalize">{agent.type} agent</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusColor[agent.status] || "bg-gray-500"}`} />
                        <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {agent.description && (
                      <p className="text-sm text-muted-foreground mb-3">{agent.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span>Tools: {agent.tools?.length || 0}</span>
                      <span>Runs: {agent.totalRuns}</span>
                      <span>Model: {agent.model}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRunAgent(agent.id)}>
                        ▶ Run Now
                      </Button>
                      <a href={`/agents/${agent.id}`} className="inline-flex">
                        <Button size="sm" variant="ghost">
                          Activity
                        </Button>
                      </a>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteAgent(agent.id)}>
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Workflows</h2>
              <p className="text-sm text-muted-foreground">Orchestrate multi-step AI pipelines</p>
            </div>
            <a href="/workflow-editor">
              <Button>
                <Workflow className="w-4 h-4 mr-2" /> New Workflow
              </Button>
            </a>
          </div>

          {workflowsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading workflows...</div>
          ) : workflows.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <Workflow className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-foreground">No workflows yet</p>
                <p className="text-muted-foreground text-sm mt-1">Create your first workflow pipeline.</p>
                <a href="/workflow-editor" className="inline-block mt-4">
                  <Button>Create Workflow</Button>
                </a>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf) => (
                <Card key={wf.id} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{wf.name}</CardTitle>
                      <Badge variant="outline">
                        {wf.status}
                      </Badge>
                    </div>
                    <CardDescription>{wf.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span>{wf.stepCount} step{wf.stepCount !== 1 ? "s" : ""}</span>
                      <span>{wf.lastRunAt ? `Last run: ${new Date(wf.lastRunAt).toLocaleDateString()}` : "Never run"}</span>
                    </div>
                    <a href={`/workflow-editor?id=${wf.id}`}>
                      <Button size="sm" variant="outline" className="w-full">
                        <Workflow className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="block-builder">
          <BlockBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
