import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import SandboxPanel from "@/components/hub/SandboxPanel";
import {
  Blocks,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Save,
  Upload,
  Download,
  Rocket,
  Play,
  Settings2,
  FileJson,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Cpu,
  Wrench,
  Puzzle,
  Server,
  MessageSquare,
  Code,
  Workflow,
  FileInput,
  FileOutput,
  Layers,
  GripVertical,
  X,
  TestTube,
  Terminal,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type BlockType =
  | "system-prompt"
  | "model-selection"
  | "tool-config"
  | "schema"
  | "workflow"
  | "code-block"
  | "test";

interface WorkflowBlock {
  id: string;
  type: BlockType;
  title: string;
  config: Record<string, any>;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: any; description: string }[] = [
  { type: "system-prompt", label: "System Prompt", icon: MessageSquare, description: "Define the AI's behavior and role" },
  { type: "model-selection", label: "Model Selection", icon: Cpu, description: "Choose which LLM to use" },
  { type: "tool-config", label: "Tool Configuration", icon: Wrench, description: "Select tools and MCP servers" },
  { type: "schema", label: "Input/Output Schema", icon: FileJson, description: "Define data formats" },
  { type: "workflow", label: "Workflow Steps", icon: Workflow, description: "Ordered task steps" },
  { type: "code-block", label: "Code Block", icon: Code, description: "Embedded code snippet" },
  { type: "test", label: "Test Panel", icon: TestTube, description: "Run test queries" },
];

interface ProjectState {
  name: string;
  blocks: WorkflowBlock[];
  selectedBlockId: string | null;
  selectedModel: string;
  selectedTools: string[];
  selectedMcpServers: string[];
  createdAt: string;
}

function generateId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function BlockConfigPanel({
  block,
  models,
  mcpServers,
  skills,
  onUpdate,
}: {
  block: WorkflowBlock;
  models: any[];
  mcpServers: any[];
  skills: any[];
  onUpdate: (config: Record<string, any>) => void;
}) {
  if (block.type === "system-prompt") {
    return (
      <div className="space-y-3">
        <label className="text-xs text-slate-400 block">System Prompt</label>
        <Textarea
          value={block.config.prompt || ""}
          onChange={(e) => onUpdate({ ...block.config, prompt: e.target.value })}
          placeholder="You are a helpful assistant that..."
          className="bg-slate-700/50 border-slate-600 text-white min-h-[120px] text-sm font-mono"
        />
      </div>
    );
  }

  if (block.type === "model-selection") {
    return (
      <div className="space-y-3">
        <label className="text-xs text-slate-400 block">Model</label>
        <Select
          value={block.config.model || ""}
          onValueChange={(v) => onUpdate({ ...block.config, model: v })}
        >
          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {models.map((m: any) => (
              <SelectItem key={m.name || m.id} value={m.name || m.id} className="text-white">
                {m.name || m.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Temperature</label>
            <Input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={block.config.temperature ?? "0.7"}
              onChange={(e) => onUpdate({ ...block.config, temperature: e.target.value })}
              className="bg-slate-700/50 border-slate-600 text-white text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Max Tokens</label>
            <Input
              type="number"
              min="1"
              max="128000"
              value={block.config.maxTokens ?? "4096"}
              onChange={(e) => onUpdate({ ...block.config, maxTokens: e.target.value })}
              className="bg-slate-700/50 border-slate-600 text-white text-xs"
            />
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "tool-config") {
    return (
      <div className="space-y-3">
        <label className="text-xs text-slate-400 block">MCP Servers</label>
        <div className="space-y-1 max-h-[120px] overflow-y-auto">
          {mcpServers.map((s: any) => (
            <label
              key={s.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-slate-700/30 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={(block.config.mcpServerIds || []).includes(s.id)}
                onChange={(e) => {
                  const ids = block.config.mcpServerIds || [];
                  const next = e.target.checked
                    ? [...ids, s.id]
                    : ids.filter((id: string) => id !== s.id);
                  onUpdate({ ...block.config, mcpServerIds: next });
                }}
                className="rounded border-slate-600"
              />
              <span className="text-xs text-white">{s.name}</span>
              <Badge className="ml-auto text-[9px] bg-slate-700 text-slate-300 border-slate-600">
                {s.toolCount || 0}
              </Badge>
            </label>
          ))}
          {mcpServers.length === 0 && (
            <p className="text-xs text-slate-500 italic">No MCP servers configured</p>
          )}
        </div>
        <Separator className="bg-slate-700/50" />
        <label className="text-xs text-slate-400 block">Skills</label>
        <div className="space-y-1 max-h-[120px] overflow-y-auto">
          {skills.map((s: any) => (
            <label
              key={s.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-slate-700/30 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={(block.config.skillIds || []).includes(s.id)}
                onChange={(e) => {
                  const ids = block.config.skillIds || [];
                  const next = e.target.checked
                    ? [...ids, s.id]
                    : ids.filter((id: string) => id !== s.id);
                  onUpdate({ ...block.config, skillIds: next });
                }}
                className="rounded border-slate-600"
              />
              <span className="text-xs text-white">{s.name}</span>
            </label>
          ))}
          {skills.length === 0 && (
            <p className="text-xs text-slate-500 italic">No skills available</p>
          )}
        </div>
      </div>
    );
  }

  if (block.type === "schema") {
    return (
      <div className="space-y-3">
        <label className="text-xs text-slate-400 block">Input Schema (JSON)</label>
        <Textarea
          value={block.config.inputSchema || '{\n  "query": "string"\n}'}
          onChange={(e) => onUpdate({ ...block.config, inputSchema: e.target.value })}
          className="bg-slate-700/50 border-slate-600 text-white min-h-[80px] text-xs font-mono"
        />
        <label className="text-xs text-slate-400 block">Output Schema (JSON)</label>
        <Textarea
          value={block.config.outputSchema || '{\n  "result": "string"\n}'}
          onChange={(e) => onUpdate({ ...block.config, outputSchema: e.target.value })}
          className="bg-slate-700/50 border-slate-600 text-white min-h-[80px] text-xs font-mono"
        />
      </div>
    );
  }

  if (block.type === "workflow") {
    const steps: string[] = block.config.steps || ["Step 1"];
    return (
      <div className="space-y-3">
        <label className="text-xs text-slate-400 block">Workflow Steps</label>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-5 text-right">{i + 1}.</span>
              <Input
                value={step}
                onChange={(e) => {
                  const next = [...steps];
                  next[i] = e.target.value;
                  onUpdate({ ...block.config, steps: next });
                }}
                className="bg-slate-700/50 border-slate-600 text-white text-xs flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-500 hover:text-red-400"
                onClick={() => {
                  const next = steps.filter((_, idx) => idx !== i);
                  onUpdate({ ...block.config, steps: next });
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-400 hover:text-blue-300 text-xs"
          onClick={() => onUpdate({ ...block.config, steps: [...steps, `Step ${steps.length + 1}`] })}
        >
          <Plus className="w-3 h-3 mr-1" /> Add Step
        </Button>
      </div>
    );
  }

  if (block.type === "code-block") {
    return (
      <div className="space-y-3">
        <label className="text-xs text-slate-400 block">Language</label>
        <Select
          value={block.config.language || "python"}
          onValueChange={(v) => onUpdate({ ...block.config, language: v })}
        >
          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {["python", "javascript", "typescript", "bash", "json"].map((l) => (
              <SelectItem key={l} value={l} className="text-white">{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="text-xs text-slate-400 block">Code</label>
        <Textarea
          value={block.config.code || ""}
          onChange={(e) => onUpdate({ ...block.config, code: e.target.value })}
          placeholder="# Your code here"
          className="bg-slate-700/50 border-slate-600 text-white min-h-[120px] text-xs font-mono"
        />
      </div>
    );
  }

  if (block.type === "test") {
    return (
      <div className="space-y-3">
        <label className="text-xs text-slate-400 block">Test Query</label>
        <Textarea
          value={block.config.query || ""}
          onChange={(e) => onUpdate({ ...block.config, query: e.target.value })}
          placeholder="Enter a test query..."
          className="bg-slate-700/50 border-slate-600 text-white min-h-[80px] text-sm"
        />
        <p className="text-[10px] text-slate-500">
          This block configures the test panel at the bottom.
        </p>
      </div>
    );
  }

  return <p className="text-xs text-slate-500">No configuration available.</p>;
}

export default function ForgeBuilder() {
  const [project, setProject] = useState<ProjectState>({
    name: "Untitled Project",
    blocks: [
      { id: generateId(), type: "system-prompt", title: "System Prompt", config: { prompt: "" } },
      { id: generateId(), type: "model-selection", title: "Model Selection", config: { model: "", temperature: "0.7", maxTokens: "4096" } },
    ],
    selectedBlockId: null,
    selectedModel: "",
    selectedTools: [],
    selectedMcpServers: [],
    createdAt: new Date().toISOString(),
  });

  const [testQuery, setTestQuery] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxCode, setSandboxCode] = useState("");
  const [copiedJson, setCopiedJson] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  const modelsQuery = trpc.models.list.useQuery(undefined);
  const mcpQuery = trpc.mcp.list.useQuery(undefined);
  const skillsQuery = trpc.skills.list.useQuery(undefined);
  const createAgent = trpc.agents.create.useMutation({
    onSuccess: () => {
      toast.success("Agent deployed successfully!");
    },
    onError: (err) => {
      toast.error(`Deploy failed: ${err.message}`);
    },
  });

  const chatComplete = trpc.chat.complete.useMutation({
    onError: (err) => {
      toast.error(`Test failed: ${err.message}`);
      setTestRunning(false);
    },
  });

  const models = modelsQuery.data ?? [];
  const mcpServers = mcpQuery.data ?? [];
  const skills = skillsQuery.data ?? [];

  const selectedBlock = project.blocks.find((b) => b.id === project.selectedBlockId);

  const addBlock = (type: BlockType) => {
    const meta = BLOCK_TYPES.find((b) => b.type === type)!;
    const newBlock: WorkflowBlock = {
      id: generateId(),
      type,
      title: meta.label,
      config: {},
    };
    setProject((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
      selectedBlockId: newBlock.id,
    }));
  };

  const removeBlock = (id: string) => {
    setProject((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
      selectedBlockId: prev.selectedBlockId === id ? null : prev.selectedBlockId,
    }));
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    setProject((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.blocks.length) return prev;
      const next = [...prev.blocks];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return { ...prev, blocks: next };
    });
  };

  const updateBlockConfig = (id: string, config: Record<string, any>) => {
    setProject((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, config } : b)),
    }));
  };

  const buildConfig = useCallback(() => {
    const systemPrompt = project.blocks.find((b) => b.type === "system-prompt")?.config.prompt || "";
    const modelBlock = project.blocks.find((b) => b.type === "model-selection");
    const toolBlock = project.blocks.find((b) => b.type === "tool-config");
    const schemaBlock = project.blocks.find((b) => b.type === "schema");
    const workflowBlock = project.blocks.find((b) => b.type === "workflow");
    const codeBlocks = project.blocks.filter((b) => b.type === "code-block");

    return {
      name: project.name,
      systemPrompt,
      model: modelBlock?.config.model || "",
      temperature: parseFloat(modelBlock?.config.temperature || "0.7"),
      maxTokens: parseInt(modelBlock?.config.maxTokens || "4096"),
      mcpServerIds: toolBlock?.config.mcpServerIds || [],
      skillIds: toolBlock?.config.skillIds || [],
      inputSchema: schemaBlock?.config.inputSchema || "",
      outputSchema: schemaBlock?.config.outputSchema || "",
      workflowSteps: workflowBlock?.config.steps || [],
      codeBlocks: codeBlocks.map((b) => ({ language: b.config.language, code: b.config.code })),
    };
  }, [project]);

  const handleExport = () => {
    const config = buildConfig();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuration exported");
  };

  const handleCopyJson = () => {
    const config = buildConfig();
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleSave = () => {
    const config = buildConfig();
    const saved = JSON.parse(localStorage.getItem("forge-projects") || "[]");
    const existingIdx = saved.findIndex((p: any) => p.name === project.name);
    if (existingIdx >= 0) {
      saved[existingIdx] = { ...config, savedAt: new Date().toISOString() };
    } else {
      saved.push({ ...config, savedAt: new Date().toISOString() });
    }
    localStorage.setItem("forge-projects", JSON.stringify(saved));
    toast.success("Project saved");
  };

  const handleLoad = () => {
    const saved = JSON.parse(localStorage.getItem("forge-projects") || "[]");
    if (saved.length === 0) {
      toast.info("No saved projects found");
      return;
    }
    const latest = saved[saved.length - 1];
    const blocks: WorkflowBlock[] = [];
    if (latest.systemPrompt) {
      blocks.push({ id: generateId(), type: "system-prompt", title: "System Prompt", config: { prompt: latest.systemPrompt } });
    }
    blocks.push({
      id: generateId(),
      type: "model-selection",
      title: "Model Selection",
      config: { model: latest.model || "", temperature: String(latest.temperature || 0.7), maxTokens: String(latest.maxTokens || 4096) },
    });
    if (latest.mcpServerIds?.length || latest.skillIds?.length) {
      blocks.push({
        id: generateId(),
        type: "tool-config",
        title: "Tool Configuration",
        config: { mcpServerIds: latest.mcpServerIds || [], skillIds: latest.skillIds || [] },
      });
    }
    if (latest.workflowSteps?.length) {
      blocks.push({ id: generateId(), type: "workflow", title: "Workflow Steps", config: { steps: latest.workflowSteps } });
    }
    setProject((prev) => ({ ...prev, name: latest.name || "Loaded Project", blocks }));
    toast.success("Project loaded");
  };

  const handleDeploy = () => {
    const config = buildConfig();
    createAgent.mutate({
      name: config.name,
      systemPrompt: config.systemPrompt,
      model: config.model,
      tools: [],
      mcpServerIds: config.mcpServerIds,
      budgetUsd: 10,
    });
  };

  const handleTestRun = async () => {
    const query = testQuery || project.blocks.find((b) => b.type === "test")?.config.query || "";
    if (!query.trim()) {
      toast.error("Enter a test query first");
      return;
    }
    setTestRunning(true);
    setTestOutput("");
    const config = buildConfig();

    try {
      const systemPrompt = config.systemPrompt || "You are a helpful assistant.";
      const response = await fetch("/api/stream/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
          model: config.model || undefined,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                fullContent += content;
                setTestOutput(fullContent);
              }
            } catch {}
          }
        }
      }

      if (!fullContent) {
        setTestOutput("No response received from the model.");
      }
    } catch (err: any) {
      setTestOutput(`Error: ${err.message || "Failed to reach LLM endpoint"}`);
    } finally {
      setTestRunning(false);
    }
  };

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [testOutput]);

  const getBlockIcon = (type: BlockType) => {
    return BLOCK_TYPES.find((b) => b.type === type)?.icon || Blocks;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-white">Forge Builder</h1>
          </div>
          <Input
            value={project.name}
            onChange={(e) => setProject((prev) => ({ ...prev, name: e.target.value }))}
            className="bg-transparent border-none text-white text-sm font-medium w-64 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={handleLoad}>
            <Upload className="w-4 h-4 mr-1" /> Load
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
            onClick={handleCopyJson}
          >
            {copiedJson ? <Check className="w-4 h-4 mr-1 text-green-400" /> : <Copy className="w-4 h-4 mr-1" />}
            JSON
          </Button>
          <Separator orientation="vertical" className="h-6 bg-slate-700/50 mx-1" />
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleDeploy}
            disabled={createAgent.isPending}
          >
            {createAgent.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Rocket className="w-4 h-4 mr-1" />}
            Deploy
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleTestRun}
            disabled={testRunning}
          >
            {testRunning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
            Test
          </Button>
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
            onClick={() => setSandboxOpen(true)}
          >
            <Terminal className="w-4 h-4 mr-1" />
            Sandbox
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Project Navigator */}
        <div className="w-64 border-r border-slate-700/50 bg-slate-900/30 flex flex-col">
          <div className="p-3 border-b border-slate-700/30">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resources</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider px-2 py-1 font-semibold flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Models ({models.length})
              </p>
              {models.map((m: any) => (
                <div
                  key={m.name || m.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => {
                    const modelBlock = project.blocks.find((b) => b.type === "model-selection");
                    if (modelBlock) {
                      updateBlockConfig(modelBlock.id, { ...modelBlock.config, model: m.name || m.id });
                    } else {
                      addBlock("model-selection");
                    }
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="truncate">{m.name || m.id}</span>
                </div>
              ))}
              {models.length === 0 && (
                <p className="text-[10px] text-slate-600 italic px-2">No models loaded</p>
              )}

              <Separator className="bg-slate-700/30 my-2" />

              <p className="text-[10px] text-slate-500 uppercase tracking-wider px-2 py-1 font-semibold flex items-center gap-1">
                <Server className="w-3 h-3" /> MCP Servers ({mcpServers.length})
              </p>
              {mcpServers.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${s.status === "connected" ? "bg-green-500" : "bg-slate-500"}`} />
                  <span className="truncate">{s.name}</span>
                  <Badge className="ml-auto text-[8px] bg-slate-700 text-slate-400 border-slate-600">
                    {s.toolCount || 0}
                  </Badge>
                </div>
              ))}
              {mcpServers.length === 0 && (
                <p className="text-[10px] text-slate-600 italic px-2">No MCP servers</p>
              )}

              <Separator className="bg-slate-700/30 my-2" />

              <p className="text-[10px] text-slate-500 uppercase tracking-wider px-2 py-1 font-semibold flex items-center gap-1">
                <Puzzle className="w-3 h-3" /> Skills ({skills.length})
              </p>
              {skills.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span className="truncate">{s.name}</span>
                </div>
              ))}
              {skills.length === 0 && (
                <p className="text-[10px] text-slate-600 italic px-2">No skills available</p>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-slate-700/30">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">Add Block</p>
            <div className="grid grid-cols-2 gap-1">
              {BLOCK_TYPES.map((bt) => (
                <Button
                  key={bt.type}
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[10px] text-slate-400 hover:text-white justify-start gap-1.5"
                  onClick={() => addBlock(bt.type)}
                >
                  <bt.icon className="w-3 h-3" />
                  {bt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel - Builder Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {project.blocks.map((block, idx) => {
              const Icon = getBlockIcon(block.type);
              const isSelected = block.id === project.selectedBlockId;
              return (
                <Card
                  key={block.id}
                  className={`bg-slate-800/30 border-slate-700/50 backdrop-blur transition-all ${
                    isSelected ? "border-blue-500/50 ring-1 ring-blue-500/20" : "hover:border-slate-500/50"
                  }`}
                  onClick={() => setProject((prev) => ({ ...prev, selectedBlockId: block.id }))}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-3 h-3 text-slate-600 cursor-grab" />
                        <Icon className="w-4 h-4 text-blue-400" />
                        <CardTitle className="text-sm text-white">{block.title}</CardTitle>
                        <Badge className="text-[9px] bg-slate-700 text-slate-400 border-slate-600">
                          {block.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-500 hover:text-white"
                          onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "up"); }}
                          disabled={idx === 0}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-500 hover:text-white"
                          onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "down"); }}
                          disabled={idx === project.blocks.length - 1}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-500 hover:text-red-400"
                          onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <BlockConfigPanel
                      block={block}
                      models={models}
                      mcpServers={mcpServers}
                      skills={skills}
                      onUpdate={(config) => updateBlockConfig(block.id, config)}
                    />
                  </CardContent>
                </Card>
              );
            })}

            {project.blocks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Blocks className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">No blocks yet. Add blocks from the left panel.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Properties/Preview */}
        <div className="w-72 border-l border-slate-700/50 bg-slate-900/30 flex flex-col">
          <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preview</h2>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-slate-400 hover:text-white">
              <Eye className="w-3 h-3 mr-1" /> View
            </Button>
          </div>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Project</p>
                <p className="text-xs text-white font-medium">{project.name}</p>
              </div>
              <Separator className="bg-slate-700/30" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Blocks</p>
                <div className="space-y-1">
                  {project.blocks.map((b) => (
                    <div
                      key={b.id}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] cursor-pointer transition-colors ${
                        b.id === project.selectedBlockId
                          ? "bg-blue-500/10 text-blue-400"
                          : "text-slate-400 hover:bg-slate-700/30"
                      }`}
                      onClick={() => setProject((prev) => ({ ...prev, selectedBlockId: b.id }))}
                    >
                      {(() => {
                        const Icon = getBlockIcon(b.type);
                        return <Icon className="w-3 h-3" />;
                      })()}
                      <span className="truncate">{b.title}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator className="bg-slate-700/30" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Configuration</p>
                <pre className="text-[10px] text-slate-400 bg-slate-800/50 rounded p-2 overflow-x-auto max-h-[300px] overflow-y-auto">
                  {JSON.stringify(buildConfig(), null, 2)}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Bottom Panel - Output/Logs */}
      <div className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur" style={{ minHeight: "180px" }}>
        <Tabs defaultValue="output" className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 pt-2">
            <TabsList className="bg-slate-800/50 h-8">
              <TabsTrigger value="output" className="text-xs h-6 data-[state=active]:bg-slate-700">
                Output
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs h-6 data-[state=active]:bg-slate-700">
                Logs
              </TabsTrigger>
              <TabsTrigger value="errors" className="text-xs h-6 data-[state=active]:bg-slate-700">
                Errors
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Input
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Enter test query..."
                className="h-7 w-80 bg-slate-800 border-slate-700 text-white text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleTestRun()}
              />
              <Button
                size="sm"
                className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                onClick={handleTestRun}
                disabled={testRunning}
              >
                {testRunning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                Run
              </Button>
            </div>
          </div>
          <TabsContent value="output" className="flex-1 p-0 m-0">
            <textarea
              ref={outputRef}
              readOnly
              value={testOutput}
              className="w-full h-full bg-transparent text-green-400 text-xs font-mono p-4 resize-none outline-none"
              placeholder="Test output will appear here..."
            />
          </TabsContent>
          <TabsContent value="logs" className="flex-1 p-0 m-0">
            <div className="p-4 text-xs text-slate-500 font-mono">
              [System] Forge Builder initialized<br />
              [System] {project.blocks.length} blocks loaded<br />
              [System] Ready for testing
            </div>
          </TabsContent>
          <TabsContent value="errors" className="flex-1 p-0 m-0">
            <div className="p-4 text-xs text-slate-600 font-mono italic">
              No errors
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sandbox Panel */}
      {sandboxOpen && (
        <SandboxPanel onClose={() => setSandboxOpen(false)} initialCode={sandboxCode} />
      )}
    </div>
  );
}
