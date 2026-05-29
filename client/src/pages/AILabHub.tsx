import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import {
  Brain, Cpu, HardDrive, Globe, Key, Plus, Play,
  RefreshCw, Search, TestTube, X, Check, Zap,
  Radio, Server, DollarSign, Layers, Loader2, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CatalogModel = {
  id: string;
  displayName: string;
  provider: string;
  providerName: string;
  source: string;
  pool: "paid" | "free" | "local";
  status: string;
  size?: string;
  quantization?: string;
  format?: string;
  addedAt?: string;
};

type CatalogProvider = {
  name: string;
  displayName: string;
  type: string;
  pool: "paid" | "free" | "local";
  modelCount: number;
  enabled: boolean;
  status: string;
  apiUrl?: string;
};

type PoolStats = {
  paid: { providers: number; models: number };
  free: { providers: number; models: number };
  local: { providers: number; models: number };
};

type ModelStat = {
  model?: string;
  requestCount?: number;
  successRate?: number;
  avgLatencyMs?: number;
  totalTokens?: number;
};

const poolColors: Record<string, string> = {
  paid: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  free: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  local: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

const sourceIcons: Record<string, React.ReactNode> = {
  cloud: <Globe className="h-3 w-3" />,
  custom: <Server className="h-3 w-3" />,
  local_ollama: <Brain className="h-3 w-3" />,
  local_llamacpp: <Cpu className="h-3 w-3" />,
  local_gguf: <HardDrive className="h-3 w-3" />,
  hf_cache: <Layers className="h-3 w-3" />,
};

const statusColors: Record<string, string> = {
  online: "bg-emerald-500",
  running: "bg-emerald-500 animate-pulse",
  available: "bg-blue-400",
  offline: "bg-slate-600",
  cached: "bg-violet-400",
};

function latencyColor(ms: number): string {
  if (ms < 300) return "text-emerald-400";
  if (ms < 800) return "text-yellow-400";
  return "text-red-400";
}

function successColor(rate: number): string {
  if (rate >= 95) return "text-emerald-400";
  if (rate >= 80) return "text-yellow-400";
  return "text-red-400";
}

export default function AILabHub() {
  const catalog = trpc.catalog.getAll.useQuery(undefined, { refetchInterval: 15000 });
  const modelStatsQuery = trpc.analytics.modelStats.useQuery(undefined, { refetchInterval: 30000 });
  const [search, setSearch] = useState("");
  const [poolFilter, setPoolFilter] = useState<string>("all");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const addMutation = trpc.catalog.providers.addQuick.useMutation();
  const testMutation = trpc.catalog.models.test.useMutation();
  const knownProviders = trpc.catalog.providers.listKnown.useQuery();
  const localScan = trpc.catalog.local.scan.useQuery(undefined, { enabled: false });
  const utils = trpc.useUtils();

  const models: CatalogModel[] = catalog.data?.models || [];
  const providers: CatalogProvider[] = catalog.data?.providers || [];
  const pools: PoolStats = catalog.data?.pools || { paid: { providers: 0, models: 0 }, free: { providers: 0, models: 0 }, local: { providers: 0, models: 0 } };

  const statsMap = useMemo(() => {
    const map = new Map<string, ModelStat>();
    (modelStatsQuery.data || []).forEach((s: any) => {
      if (s.model) map.set(s.model, s);
    });
    return map;
  }, [modelStatsQuery.data]);

  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (search && !m.displayName.toLowerCase().includes(search.toLowerCase()) && !m.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (poolFilter !== "all" && m.pool !== poolFilter) return false;
      if (selectedProvider !== "all" && m.provider !== selectedProvider) return false;
      return true;
    });
  }, [models, search, poolFilter, selectedProvider]);

  const handleAddKey = async (providerKey: string) => {
    const key = prompt(`Enter your ${providerKey} API key:`);
    if (!key) return;
    try {
      const result = await addMutation.mutateAsync({ providerKey, apiKey: key });
      toast.success(`Added ${result.provider.name} with ${result.models.length} model(s)`);
      catalog.refetch();
      setShowAddModal(false);
    } catch (e: any) {
      toast.error("Failed to add: " + (e?.message || "Unknown error"));
    }
  };

  const handleTestModel = async (modelName: string) => {
    setTestingId(modelName);
    try {
      const result = await testMutation.mutateAsync({ modelName });
      if (result.success) {
        toast.success(`${modelName}: ${result.latency}ms`);
      } else {
        toast.error(`${modelName}: ${result.error || "Failed"}`);
      }
    } catch (e: any) {
      toast.error(`${modelName}: ${e?.message || "Error"}`);
    }
    setTestingId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-[1800px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              AI Lab Hub
            </h1>
            <p className="text-slate-400 mt-1">
              {models.length} models · {providers.length} providers · unified catalog
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => localScan.refetch()} disabled={localScan.isFetching}>
              <Radio className={cn("h-4 w-4 mr-2", localScan.isFetching && "animate-spin")} />
              Scan Local
            </Button>
            <Button variant="outline" size="sm" onClick={() => { catalog.refetch(); modelStatsQuery.refetch(); }} disabled={catalog.isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", catalog.isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowAddModal(true)}>
              <Key className="h-4 w-4 mr-2" />
              Add API Key
            </Button>
          </div>
        </div>

        {/* Pool Stats and Usage */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {(["paid", "free", "local"] as const).map((pool) => {
            const totalTokens = filtered
              .filter(m => m.pool === pool)
              .reduce((sum, m) => {
                const stat = statsMap.get(m.id) || statsMap.get(m.displayName);
                return sum + (stat?.totalTokens || 0);
              }, 0);
            return (
            <button
              key={pool}
              onClick={() => setPoolFilter(poolFilter === pool ? "all" : pool)}
              className={cn(
                "rounded-xl p-4 border transition-all text-left card-lift",
                poolColors[pool],
                poolFilter === pool ? "ring-2 ring-white/20 scale-[1.02] shadow-lg" : "opacity-75 hover:opacity-100"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wider">{pool}</span>
                <span className="text-xs opacity-60">{pools[pool].providers} provider{pools[pool].providers !== 1 ? 's' : ''}</span>
              </div>
              <div className="mt-2 text-3xl font-bold">
                {pools[pool].models}
                <span className="text-sm font-normal opacity-60 ml-1">models</span>
              </div>
              {pool === "paid" && totalTokens > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-500/20">
                  <div className="flex justify-between text-xs">
                    <span className="opacity-60">Tokens</span>
                    <span className="font-mono">{totalTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="opacity-60">Est. Cost</span>
                    <span className="font-mono">${((totalTokens / 1_000_000) * 0.14).toFixed(4)}</span>
                  </div>
                </div>
              )}
            </button>
          )})}
        </div>

        <div className="flex gap-6">
          {/* Provider Sidebar */}
          <div className="w-64 shrink-0 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="h-4 w-4" /> Providers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 max-h-[50vh] overflow-y-auto">
                <button
                  onClick={() => setSelectedProvider("all")}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedProvider === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50"
                  )}
                >
                  All ({models.length})
                </button>
                {providers.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedProvider(p.name)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                      selectedProvider === p.name ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", statusColors[p.status])} />
                      <span className="truncate max-w-[160px]">{p.displayName}</span>
                    </span>
                    <span className="text-xs opacity-60 ml-1">{p.modelCount}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Radio className="h-4 w-4" /> Local Scanner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full" onClick={() => localScan.refetch()} disabled={localScan.isFetching}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", localScan.isFetching && "animate-spin")} />
                  Scan for Local LLMs
                </Button>
                {localScan.data && localScan.data.length > 0 && (
                  <div className="mt-3 text-xs text-slate-400">
                    Found {localScan.data.length} local model{localScan.data.length !== 1 ? 's' : ''}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Model Grid */}
          <div className="flex-1 min-w-0">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-800"
              />
            </div>

            {catalog.isLoading ? (
              <div className="text-center py-20 text-slate-500">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin opacity-30" />
                <p>Loading catalog...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">No models found</p>
                <p className="text-sm">Add an API key or scan for local LLMs to get started.</p>
                <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAddModal(true)}>
                  <Key className="h-4 w-4 mr-2" /> Add API Key
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((m) => {
                  const stat = statsMap.get(m.id) || statsMap.get(m.displayName);
                  const isTesting = testingId === m.id;

                  return (
                    <Card
                      key={m.id}
                      className="bg-slate-900/50 border-slate-800 hover:border-slate-600 card-lift glow-hover group"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm truncate">{m.displayName}</CardTitle>
                            <CardDescription className="text-xs mt-0.5 truncate flex items-center gap-1.5">
                              <span className="flex items-center gap-1">
                                {sourceIcons[m.source] || <Server className="h-3 w-3" />}
                                <span className="opacity-60">{m.providerName}</span>
                              </span>
                            </CardDescription>
                          </div>
                          <Badge className={cn("text-[10px] border shrink-0 ml-2", poolColors[m.pool])}>
                            {m.pool}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Status row */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusColors[m.status])} />
                            {m.status === "running" ? "running" : m.status === "online" ? "active" : m.status}
                          </span>
                          {stat?.avgLatencyMs && (
                            <span className={cn("text-[11px] font-mono", latencyColor(stat.avgLatencyMs))}>
                              ⚡{stat.avgLatencyMs}ms
                            </span>
                          )}
                          {stat?.successRate !== undefined && (
                            <span className={cn("text-[11px] font-mono", successColor(stat.successRate))}>
                              {(stat.successRate).toFixed(1)}%
                            </span>
                          )}
                          {m.pool === "local" && m.status === "running" && (
                            <span className="text-[11px] font-mono text-blue-400">live</span>
                          )}
                        </div>

                        {/* Size / quant info */}
                        {(m.size || m.quantization) && (
                          <div className="flex gap-2 text-[10px] text-slate-500 mb-2">
                            {m.size && <span>{m.size}</span>}
                            {m.quantization && <span>· {m.quantization}</span>}
                            {m.format && <span>· {m.format}</span>}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => handleTestModel(m.id)}
                            disabled={isTesting}
                          >
                            {isTesting ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <TestTube className="h-3 w-3 mr-1" />
                            )}
                            Test
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => window.open(`/dashboard?model=${encodeURIComponent(m.id)}`, '_self')}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add API Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[480px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-400" />
                Add API Key
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">Select a provider and paste your API key. Models are auto-discovered.</p>

            <div className="space-y-2">
              {knownProviders.data?.map((kp: any) => (
                <Card key={kp.key} className="bg-slate-800/50 border-slate-700 hover:border-slate-500 transition-colors cursor-pointer group" onClick={() => handleAddKey(kp.key)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{kp.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{kp.url}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                For custom OpenAI-compatible endpoints, use{" "}
                <a href="/custom-providers" className="text-blue-400 hover:underline">Custom Providers</a>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
