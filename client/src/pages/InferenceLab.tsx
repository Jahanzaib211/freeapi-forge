import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Send,
  Loader2,
  Cpu,
  Zap,
  Server,
  Radio,
  ChevronDown,
  ChevronRight,
  Play,
  Trash2,
  Copy,
  Check,
  Settings2,
  Gauge,
  Thermometer,
  HardDrive,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Coins,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";

interface Backend {
  id: string;
  name: string;
  url: string;
  icon: any;
}

const BACKENDS: Backend[] = [
  { id: "litellm", name: "LiteLLM Proxy", url: "http://localhost:5050", icon: Radio },
  { id: "llamacpp", name: "llama.cpp (GPU)", url: "http://127.0.0.1:8081", icon: Cpu },
  { id: "ollama", name: "Ollama", url: "http://127.0.0.1:11434", icon: Server },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokens?: number;
  latency?: number;
  model?: string;
  cost?: number;
}

interface LlamaCppConfig {
  ngl: number;
  kvOffload: boolean;
  ctxSize: number;
  batchSize: number;
  ubatchSize: number;
  threads: number;
  threadsBatch: number;
  flashAttention: string;
  kvCacheTypeK: string;
  kvCacheTypeV: string;
  parallel: number;
  ropeScaling: string;
  ropeScale: number;
  extraArgs: string;
}

interface GpuStats {
  vramUsed: number;
  vramTotal: number;
  gpuUtil: number;
  temperature: number;
  tokensPerSec: number;
  kvCacheUsage: number;
}

interface GGUFModel {
  name: string;
  path: string;
  sizeBytes: number;
  sizeLabel: string;
  quantization: string;
}

interface BackendStatus {
  [key: string]: boolean;
  litellm: boolean;
  llamacpp: boolean;
  ollama: boolean;
}

function parseGGUFCatalog(text: string): GGUFModel[] {
  const models: GGUFModel[] = [];
  const lines = text.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(.+?)\s+([\d.]+)\s*(GB|MB|KB|B)?$/i);
    if (match) {
      const name = match[1].trim();
      const val = parseFloat(match[2]);
      const unit = (match[3] || "B").toUpperCase();
      let bytes = val;
      if (unit === "GB") bytes = val * 1073741824;
      else if (unit === "MB") bytes = val * 1048576;
      else if (unit === "KB") bytes = val * 1024;
      const quantMatch = name.match(/(Q[2-9]K?[SML]?|F16|F32|BF16|IQ[2-4][XSNM]?)/i);
      models.push({
        name,
        path: `/home/jahanzaib/models/${name}`,
        sizeBytes: bytes,
        sizeLabel: match[2] + (match[3] || "B"),
        quantization: quantMatch ? quantMatch[1].toUpperCase() : "Unknown",
      });
    }
  }
  return models;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(1) + " KB";
}

function estimateVRAM(modelSizeBytes: number, ngl: number, ctxSize: number): number {
  const baseGB = modelSizeBytes / 1073741824;
  const gpuFraction = ngl / 100;
  const modelVram = baseGB * gpuFraction;
  const kvOverhead = (ctxSize / 16384) * 0.3;
  return modelVram + kvOverhead;
}

const DEFAULT_LLMACPP_CONFIG: LlamaCppConfig = {
  ngl: 10,
  kvOffload: true,
  ctxSize: 16384,
  batchSize: 512,
  ubatchSize: 512,
  threads: -1,
  threadsBatch: -1,
  flashAttention: "auto",
  kvCacheTypeK: "f16",
  kvCacheTypeV: "f16",
  parallel: 1,
  ropeScaling: "none",
  ropeScale: 2,
  extraArgs: "",
};

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  tooltip?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400" title={tooltip}>
          {label}
        </label>
        <span className="text-xs text-slate-300 font-mono bg-slate-700/50 px-2 py-0.5 rounded">
          {value === -1 ? "auto" : value}
          {unit || ""}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="w-full"
      />
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-700/20 hover:bg-slate-700/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-medium text-slate-200">{title}</span>
        </div>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      {open && <div className="p-3 space-y-3 bg-slate-900/20">{children}</div>}
    </div>
  );
}

export default function InferenceLab() {
  const [backend, setBackend] = useState("litellm");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topP, setTopP] = useState(1);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [stopSequences, setStopSequences] = useState("");

  const [llmConfig, setLlmConfig] = useState<LlamaCppConfig>({ ...DEFAULT_LLMACPP_CONFIG });
  const [gpuPanelOpen, setGpuPanelOpen] = useState(true);

  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    litellm: false,
    llamacpp: false,
    ollama: false,
  });
  const [testingBackend, setTestingBackend] = useState<string | null>(null);

  const [ggufModels, setGGUFModels] = useState<GGUFModel[]>([]);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ggufLoading, setGGufLoading] = useState(false);

  const [gpuStats, setGpuStats] = useState<GpuStats | null>(null);
  const [gpuPolling, setGpuPolling] = useState(false);

  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [paramsExpanded, setParamsExpanded] = useState(false);

  const modelsQuery = trpc.models.list.useQuery();
  const currentBackend = BACKENDS.find((b) => b.id === backend)!;

  const availableModels = backend === "litellm"
    ? (modelsQuery.data || []).map((m) => m.name)
    : backend === "llamacpp"
      ? ggufModels.map((m) => m.name)
      : ollamaModels;

  useEffect(() => {
    if (availableModels.length > 0 && !model) {
      setModel(availableModels[0]);
    }
  }, [availableModels, model]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const testBackend = useCallback(async (backendId: string) => {
    const b = BACKENDS.find((x) => x.id === backendId)!;
    setTestingBackend(backendId);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      let endpoint = b.url;
      if (backendId === "ollama") endpoint += "/api/tags";
      else if (backendId === "llamacpp") endpoint += "/health";
      else endpoint += "/health";
      const resp = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);
      setBackendStatus((prev) => ({ ...prev, [backendId]: resp.ok }));
    } catch {
      setBackendStatus((prev) => ({ ...prev, [backendId]: false }));
    } finally {
      setTestingBackend(null);
    }
  }, []);

  const testAllBackends = useCallback(() => {
    for (const b of BACKENDS) testBackend(b.id);
  }, [testBackend]);

  useEffect(() => {
    testAllBackends();
    const interval = setInterval(testAllBackends, 30000);
    return () => clearInterval(interval);
  }, [testAllBackends]);

  const fetchGGUFModels = useCallback(async () => {
    setGGufLoading(true);
    try {
      const resp = await fetch("/api/llamacpp/models");
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          setGGUFModels(data);
        } else if (typeof data === "string") {
          setGGUFModels(parseGGUFCatalog(data));
        } else if (data.models) {
          setGGUFModels(data.models);
        }
      }
    } catch {
      setGGUFModels([]);
    } finally {
      setGGufLoading(false);
    }
  }, []);

  const fetchOllamaModels = useCallback(async () => {
    try {
      const resp = await fetch("http://127.0.0.1:11434/api/tags");
      if (resp.ok) {
        const data = await resp.json();
        if (data.models) {
          setOllamaModels(data.models.map((m: any) => m.name));
        }
      }
    } catch {
      setOllamaModels([]);
    }
  }, []);

  useEffect(() => {
    if (backend === "llamacpp") fetchGGUFModels();
    if (backend === "ollama") fetchOllamaModels();
  }, [backend, fetchGGUFModels, fetchOllamaModels]);

  useEffect(() => {
    if (backend === "llamacpp" && (backendStatus.llamacpp || loading)) {
      setGpuPolling(true);
      const interval = setInterval(async () => {
        try {
          const resp = await fetch("http://127.0.0.1:8081/v1/gpu-stats");
          if (resp.ok) {
            const data = await resp.json();
            setGpuStats(data);
          }
        } catch {
          setGpuStats(null);
        }
      }, 2000);
      return () => {
        clearInterval(interval);
        setGpuPolling(false);
      };
    } else {
      setGpuStats(null);
    }
  }, [backend, backendStatus.llamacpp, loading]);

  const launchServer = async () => {
    setLaunching(true);
    setLaunchResult(null);
    try {
      const params = new URLSearchParams();
      params.set("ngl", String(llmConfig.ngl));
      params.set("ctx", String(llmConfig.ctxSize));
      params.set("batch", String(llmConfig.batchSize));
      params.set("ubatch", String(llmConfig.ubatchSize));
      params.set("threads", String(llmConfig.threads));
      params.set("threads-batch", String(llmConfig.threadsBatch));
      params.set("parallel", String(llmConfig.parallel));
      params.set("flash-attn", llmConfig.flashAttention);
      params.set("kv-cache-type-k", llmConfig.kvCacheTypeK);
      params.set("kv-cache-type-v", llmConfig.kvCacheTypeV);
      params.set("rope-scaling", llmConfig.ropeScaling);
      params.set("rope-scale", String(llmConfig.ropeScale));
      if (llmConfig.kvOffload) params.set("kv-offload", "1");
      if (llmConfig.extraArgs.trim()) params.set("extra", llmConfig.extraArgs.trim());

      const selectedGGUF = ggufModels.find((m) => m.name === model);
      if (selectedGGUF) params.set("model", selectedGGUF.path);

      const resp = await fetch(`/api/llamacpp/configure?${params.toString()}`, {
        method: "POST",
      });
      const data = await resp.json();
      setLaunchResult({
        ok: resp.ok,
        msg: data.message || data.error || (resp.ok ? "Server configured successfully" : "Configuration failed"),
      });
    } catch (err: any) {
      setLaunchResult({ ok: false, msg: err.message || "Failed to reach server" });
    } finally {
      setLaunching(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const selectedModel = model || customModel;
    if (!selectedModel) return;

    const userMsg: ChatMessage = { role: "user", content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreaming("");

    const allMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const startTime = Date.now();
    let fullContent = "";
    let tokenCount = 0;

    try {
      const stops = stopSequences.split(",").map((s) => s.trim()).filter(Boolean);
      const response = await fetch("/api/stream/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          model: selectedModel,
          temperature,
          maxTokens,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          stop: stops.length > 0 ? stops : undefined,
          backend,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                fullContent += content;
                tokenCount++;
                setStreaming(fullContent);
              }
            } catch {}
          }
        }
      }

      const latency = Date.now() - startTime;
      const tokensPerSec = tokenCount / (latency / 1000);
      const costEstimate = (tokenCount / 1000) * 0.002;
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: fullContent,
        timestamp: new Date(),
        tokens: tokenCount,
        latency,
        model: selectedModel,
        cost: costEstimate,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setStreaming("");
    }
  };

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setStreaming("");
  };

  const selectedGGUF = ggufModels.find((m) => m.name === model);
  const estimatedVRAM = selectedGGUF
    ? estimateVRAM(selectedGGUF.sizeBytes, llmConfig.ngl, llmConfig.ctxSize)
    : null;

  const updateConfig = (key: keyof LlamaCppConfig, value: any) => {
    setLlmConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[2200px] mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1 tracking-tight">Inference Lab</h1>
            <p className="text-slate-400">
              Direct connection to any backend — LiteLLM, llama.cpp, Ollama
            </p>
          </div>
          <div className="flex items-center gap-2">
            {BACKENDS.map((b) => (
              <Badge
                key={b.id}
                className={`cursor-pointer transition-all ${
                  backendStatus[b.id]
                    ? "bg-green-600/20 text-green-400 border-green-600/50"
                    : "bg-red-600/20 text-red-400 border-red-600/50"
                }`}
                onClick={() => testBackend(b.id)}
              >
                {backendStatus[b.id] ? (
                  <Wifi className="w-3 h-3 mr-1" />
                ) : (
                  <WifiOff className="w-3 h-3 mr-1" />
                )}
                {b.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          {/* Left sidebar */}
          <div className={`space-y-4 transition-all duration-300 ${gpuPanelOpen ? "w-80 shrink-0" : "w-0 overflow-hidden"}`}>
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50 p-3">
                <CardTitle className="text-white text-sm">Backend</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {BACKENDS.map((b) => {
                  const Icon = b.icon;
                  const isOnline = backendStatus[b.id];
                  const isTesting = testingBackend === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setBackend(b.id);
                        setModel("");
                      }}
                      className={`w-full p-2.5 rounded-lg text-left transition-all ${
                        backend === b.id
                          ? "bg-blue-600/20 border border-blue-600/50 text-white"
                          : "bg-slate-700/30 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{b.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isTesting ? (
                            <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                          ) : (
                            <div
                              className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400"}`}
                            />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              testBackend(b.id);
                            }}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Test connection"
                          >
                            <RefreshCw className={`w-3 h-3 ${isTesting ? "animate-spin" : ""}`} />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">{b.url}</div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50 p-3">
                <CardTitle className="text-white text-sm">Model</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 max-h-60">
                    {availableModels.map((m) => (
                      <SelectItem key={m} value={m} className="text-sm">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Or type custom model..."
                  className="bg-slate-700 border-slate-600 text-white text-sm h-9"
                />

                {selectedGGUF && (
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-xs text-slate-300 font-medium truncate">{selectedGGUF.name}</div>
                    <div className="flex gap-2 text-xs text-slate-400">
                      <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{selectedGGUF.sizeLabel}</span>
                      <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{selectedGGUF.quantization}</span>
                    </div>
                    {estimatedVRAM !== null && (
                      <div className="text-xs text-slate-400">
                        Est. VRAM: <span className="text-blue-400 font-mono">{estimatedVRAM.toFixed(1)} GB</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GPU Stats Panel */}
            {backend === "llamacpp" && (
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50 p-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-400" />
                    GPU Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {gpuStats ? (
                    <>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">VRAM</span>
                          <span className="text-slate-300 font-mono">
                            {gpuStats.vramUsed}MB / {gpuStats.vramTotal}MB
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(gpuStats.vramUsed / gpuStats.vramTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                          <div className="text-xs text-slate-400">GPU</div>
                          <div className="text-sm font-mono text-green-400">{gpuStats.gpuUtil}%</div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                          <div className="text-xs text-slate-400">Temp</div>
                          <div className="text-sm font-mono text-amber-400">
                            <Thermometer className="w-3 h-3 inline mr-0.5" />
                            {gpuStats.temperature}°C
                          </div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                          <div className="text-xs text-slate-400">tok/s</div>
                          <div className="text-sm font-mono text-blue-400">{gpuStats.tokensPerSec.toFixed(1)}</div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                          <div className="text-xs text-slate-400">KV Cache</div>
                          <div className="text-sm font-mono text-purple-400">{gpuStats.kvCacheUsage}%</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 text-center py-4">
                      {gpuPolling ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                      ) : (
                        <Activity className="w-4 h-4 mx-auto mb-1 opacity-50" />
                      )}
                      {gpuPolling ? "Polling GPU..." : "GPU stats unavailable"}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* GPU Config Panel (llama.cpp specific) */}
          {backend === "llamacpp" && (
            <div
              className={`transition-all duration-300 ${gpuPanelOpen ? "w-96 shrink-0" : "w-0 overflow-hidden"}`}
            >
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur h-full">
                <CardHeader className="border-b border-slate-700/50 p-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-blue-400" />
                      GPU & Performance
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={launchServer}
                      disabled={launching || !backendStatus.llamacpp}
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {launching ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Play className="w-3 h-3 mr-1" />
                      )}
                      Launch
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <CollapsibleSection title="GPU Offloading" icon={Cpu} defaultOpen={true}>
                    <SliderControl
                      label="GPU Layers (ngl)"
                      value={llmConfig.ngl}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(v) => updateConfig("ngl", v)}
                      tooltip="Number of layers to offload to GPU. Higher = more VRAM usage, faster inference"
                    />
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400" title="Offload KV cache to GPU">
                        KV Offload
                      </label>
                      <Switch
                        checked={llmConfig.kvOffload}
                        onCheckedChange={(v) => updateConfig("kvOffload", v)}
                      />
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection title="Context & Batching" icon={HardDrive} defaultOpen={true}>
                    <SliderControl
                      label="Context Size"
                      value={llmConfig.ctxSize}
                      min={512}
                      max={131072}
                      step={512}
                      onChange={(v) => updateConfig("ctxSize", v)}
                      tooltip="Prompt context window size"
                    />
                    <SliderControl
                      label="Batch Size"
                      value={llmConfig.batchSize}
                      min={128}
                      max={4096}
                      step={64}
                      onChange={(v) => updateConfig("batchSize", v)}
                      tooltip="Logical maximum batch size"
                    />
                    <SliderControl
                      label="UBatch Size"
                      value={llmConfig.ubatchSize}
                      min={64}
                      max={2048}
                      step={64}
                      onChange={(v) => updateConfig("ubatchSize", v)}
                      tooltip="Physical maximum batch size"
                    />
                  </CollapsibleSection>

                  <CollapsibleSection title="CPU Configuration" icon={Cpu} defaultOpen={false}>
                    <SliderControl
                      label="Threads"
                      value={llmConfig.threads}
                      min={-1}
                      max={12}
                      step={1}
                      onChange={(v) => updateConfig("threads", v)}
                      tooltip="CPU threads for generation"
                    />
                    <SliderControl
                      label="Threads Batch"
                      value={llmConfig.threadsBatch}
                      min={-1}
                      max={12}
                      step={1}
                      onChange={(v) => updateConfig("threadsBatch", v)}
                      tooltip="CPU threads for prompt processing"
                    />
                  </CollapsibleSection>

                  <CollapsibleSection title="Advanced" icon={Settings2} defaultOpen={false}>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">Flash Attention</label>
                      <Select
                        value={llmConfig.flashAttention}
                        onValueChange={(v) => updateConfig("flashAttention", v)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="auto">auto</SelectItem>
                          <SelectItem value="on">on</SelectItem>
                          <SelectItem value="off">off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">KV Cache Type K</label>
                      <Select
                        value={llmConfig.kvCacheTypeK}
                        onValueChange={(v) => updateConfig("kvCacheTypeK", v)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="f16">f16</SelectItem>
                          <SelectItem value="q8_0">q8_0</SelectItem>
                          <SelectItem value="q4_0">q4_0</SelectItem>
                          <SelectItem value="q4_1">q4_1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">KV Cache Type V</label>
                      <Select
                        value={llmConfig.kvCacheTypeV}
                        onValueChange={(v) => updateConfig("kvCacheTypeV", v)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="f16">f16</SelectItem>
                          <SelectItem value="q8_0">q8_0</SelectItem>
                          <SelectItem value="q4_0">q4_0</SelectItem>
                          <SelectItem value="q4_1">q4_1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <SliderControl
                      label="Parallel"
                      value={llmConfig.parallel}
                      min={1}
                      max={4}
                      step={1}
                      onChange={(v) => updateConfig("parallel", v)}
                      tooltip="Number of parallel sequences"
                    />
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">Rope Scaling</label>
                      <Select
                        value={llmConfig.ropeScaling}
                        onValueChange={(v) => updateConfig("ropeScaling", v)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="none">none</SelectItem>
                          <SelectItem value="linear">linear</SelectItem>
                          <SelectItem value="yarn">yarn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <SliderControl
                      label="Rope Scale"
                      value={llmConfig.ropeScale}
                      min={1}
                      max={8}
                      step={0.5}
                      onChange={(v) => updateConfig("ropeScale", v)}
                    />
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">Extra Args</label>
                      <Input
                        value={llmConfig.extraArgs}
                        onChange={(e) => updateConfig("extraArgs", e.target.value)}
                        placeholder="Additional llama.cpp arguments..."
                        className="bg-slate-700 border-slate-600 text-white text-xs h-8"
                      />
                    </div>
                  </CollapsibleSection>

                  {launchResult && (
                    <div
                      className={`p-2 rounded-lg text-xs ${
                        launchResult.ok
                          ? "bg-green-600/20 text-green-400 border border-green-600/30"
                          : "bg-red-600/20 text-red-400 border border-red-600/30"
                      }`}
                    >
                      {launchResult.msg}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Toggle GPU Panel Button */}
          {(backend === "llamacpp") && (
            <button
              onClick={() => setGpuPanelOpen(!gpuPanelOpen)}
              className="self-start mt-2 p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
              title={gpuPanelOpen ? "Hide GPU panel" : "Show GPU panel"}
            >
              {gpuPanelOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 min-w-0">
            <Card className="h-full bg-slate-800/30 border-slate-700/50 backdrop-blur flex flex-col">
              <CardHeader className="border-b border-slate-700/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4" />
                      {currentBackend.name}
                      <span className="text-slate-400 font-normal">— {model || customModel || "no model"}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Streaming enabled • {messages.length} messages
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearChat}
                      className="text-slate-400 hover:text-white h-7 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                    <Badge
                      className={`text-xs ${
                        backendStatus[backend]
                          ? "bg-green-600/20 text-green-400 border-green-600/50"
                          : "bg-red-600/20 text-red-400 border-red-600/50"
                      }`}
                    >
                      <Radio className="w-3 h-3 mr-1" />
                      {backendStatus[backend] ? "Connected" : "Offline"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-4">
                <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2 max-h-[calc(100vh-340px)]">
                  {messages.length === 0 && !streaming ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <div className="text-center">
                        <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Send a message to start. Tokens stream in real-time.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-2xl px-4 py-3 rounded-lg relative group ${
                              msg.role === "user"
                                ? "bg-blue-600 text-white rounded-br-none"
                                : "bg-slate-700/80 text-slate-100 rounded-bl-none"
                            }`}
                          >
                            {msg.role === "assistant" && msg.model && (
                              <div className="text-xs text-slate-400 mb-1">{msg.model}</div>
                            )}
                            <Streamdown>{msg.content}</Streamdown>
                            <div className="text-xs opacity-60 mt-2 flex items-center gap-3 flex-wrap">
                              <span>{msg.timestamp.toLocaleTimeString()}</span>
                              {msg.tokens != null && <span>{msg.tokens} tokens</span>}
                              {msg.latency != null && <span>{msg.latency}ms</span>}
                              {msg.tokens != null && msg.latency != null && (
                                <span>{(msg.tokens / (msg.latency / 1000)).toFixed(1)} tok/s</span>
                              )}
                              {msg.cost != null && msg.cost > 0 && (
                                <span className="text-amber-400">
                                  <Coins className="w-3 h-3 inline mr-0.5" />${msg.cost.toFixed(4)}
                                </span>
                              )}
                            </div>
                            {msg.role === "assistant" && (
                              <button
                                onClick={() => copyMessage(msg.content, idx)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-slate-600/50 hover:bg-slate-500/50"
                              >
                                {copiedIdx === idx ? (
                                  <Check className="w-3 h-3 text-green-400" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-300" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {streaming && (
                        <div className="flex justify-start">
                          <div className="max-w-2xl px-4 py-3 rounded-lg bg-slate-700/80 text-slate-100 rounded-bl-none">
                            <Streamdown>{streaming + "▌"}</Streamdown>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Parameters bar */}
                <div className="mb-3">
                  <button
                    onClick={() => setParamsExpanded(!paramsExpanded)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Settings2 className="w-3 h-3" />
                    Parameters
                    {paramsExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                  {paramsExpanded && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-2 p-3 bg-slate-900/30 border border-slate-700/30 rounded-lg">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Temperature: {temperature}</label>
                        <Slider
                          value={[temperature]}
                          min={0}
                          max={2}
                          step={0.1}
                          onValueChange={(v) => setTemperature(v[0])}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Max Tokens: {maxTokens}</label>
                        <Slider
                          value={[maxTokens]}
                          min={50}
                          max={8192}
                          step={50}
                          onValueChange={(v) => setMaxTokens(v[0])}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Top P: {topP}</label>
                        <Slider
                          value={[topP]}
                          min={0}
                          max={1}
                          step={0.05}
                          onValueChange={(v) => setTopP(v[0])}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Freq Penalty: {frequencyPenalty}</label>
                        <Slider
                          value={[frequencyPenalty]}
                          min={0}
                          max={2}
                          step={0.1}
                          onValueChange={(v) => setFrequencyPenalty(v[0])}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Presence Penalty: {presencePenalty}</label>
                        <Slider
                          value={[presencePenalty]}
                          min={0}
                          max={2}
                          step={0.1}
                          onValueChange={(v) => setPresencePenalty(v[0])}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Stop Sequences</label>
                        <Input
                          value={stopSequences}
                          onChange={(e) => setStopSequences(e.target.value)}
                          placeholder="comma, separated"
                          className="bg-slate-700 border-slate-600 text-white text-xs h-7"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message... (Ctrl+Enter to send)"
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 resize-none text-sm"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) sendMessage();
                    }}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-auto px-4"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
