import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Cpu,
  RefreshCw,
  Power,
  Loader2,
  Zap,
  HardDrive,
  Thermometer,
  Activity,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

function formatUptime(ms: number | null): string {
  if (!ms) return "—";
  const seconds = Math.floor((Date.now() - ms) / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(mb: number | null): string {
  if (mb === null || mb === undefined) return "—";
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export default function LocalModelManager() {
  const [switchingModel, setSwitchingModel] = useState<string | null>(null);

  const modelsQuery = trpc.localModels.list.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const activeQuery = trpc.localModels.active.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const gpuQuery = trpc.localModels.gpu.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const utils = trpc.useUtils();

  const switchMut = trpc.localModels.switch.useMutation({
    onMutate: (vars) => setSwitchingModel(vars.model),
    onSuccess: () => {
      utils.localModels.list.invalidate();
      utils.localModels.active.invalidate();
      utils.localModels.gpu.invalidate();
      setSwitchingModel(null);
    },
    onError: () => setSwitchingModel(null),
  });

  const models = modelsQuery.data || [];
  const active = activeQuery.data?.active;
  const switching = activeQuery.data?.switching || !!switchingModel;
  const gpu = gpuQuery.data?.status;
  const gpuProcesses = gpuQuery.data?.processes || [];

  const vramPercent = gpu ? Math.round((gpu.usedMb / gpu.totalMb) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Local Models</h1>
            <p className="text-slate-400 text-lg">
              GPU load balancer — one model active at a time
            </p>
          </div>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => {
              modelsQuery.refetch();
              activeQuery.refetch();
              gpuQuery.refetch();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* GPU Status */}
        {gpu && (
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                GPU — NVIDIA RTX 3060
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">VRAM</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-white">{formatBytes(gpu.usedMb)}</span>
                    <span className="text-xs text-slate-500">/ {formatBytes(gpu.totalMb)}</span>
                  </div>
                  <Progress value={vramPercent} className="h-1.5 mt-2 bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all ${
                        vramPercent > 85 ? "bg-red-500" : vramPercent > 60 ? "bg-amber-500" : "bg-cyan-500"
                      }`}
                      style={{ width: `${vramPercent}%` }}
                    />
                  </Progress>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Utilization</p>
                  <span className="text-xl font-bold text-white">{gpu.utilization}%</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Temperature</p>
                  <span className="text-xl font-bold text-white">{gpu.temperature}°C</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Power</p>
                  <span className="text-xl font-bold text-white">{gpu.powerDraw}W</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Free VRAM</p>
                  <span className="text-xl font-bold text-green-400">{formatBytes(gpu.freeMb)}</span>
                </div>
              </div>

              {gpuProcesses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">GPU Processes</p>
                  <div className="flex flex-wrap gap-2">
                    {gpuProcesses.map((proc, i) => (
                      <Badge key={i} className="bg-slate-700/50 text-slate-300 border-slate-600/50 text-[10px]">
                        {proc.name.split("/").pop()} — {proc.memoryMb}MB
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Model Banner */}
        {active && (
          <Card className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-700/30 backdrop-blur mb-6">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-cyan-400 uppercase tracking-wider">Currently Active</p>
                    <p className="text-lg font-bold text-white">{active.displayName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400">Port</p>
                    <p className="font-mono text-white">{active.port}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400">VRAM</p>
                    <p className="font-mono text-white">{formatBytes(active.memoryMb)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400">Uptime</p>
                    <p className="font-mono text-white">{formatUptime(active.uptime)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400">PID</p>
                    <p className="font-mono text-white">{active.pid}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Model Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {models.map((model) => {
            const isActive = active?.name === model.name;
            const isSwitchingThis = switchingModel === model.name;
            const canSwitch = !switching && !isActive;
            const vramOk = gpu ? gpu.freeMb >= model.vramEstimateMb - 500 : true;

            return (
              <Card
                key={model.name}
                className={`backdrop-blur transition-all ${
                  isActive
                    ? "bg-cyan-900/20 border-cyan-600/50 ring-1 ring-cyan-500/30"
                    : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-white">
                      {model.displayName}
                    </CardTitle>
                    <Badge
                      className={
                        isActive
                          ? "bg-green-600/20 text-green-400 border-green-600/50"
                          : model.status === "error"
                          ? "bg-red-600/20 text-red-400 border-red-600/50"
                          : "bg-slate-600/20 text-slate-400 border-slate-600/50"
                      }
                    >
                      {isActive ? "active" : model.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Port</p>
                        <p className="font-mono text-white">{model.port}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">GPU Layers</p>
                        <p className="font-mono text-white">{model.gpuLayers}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Context</p>
                        <p className="font-mono text-white">{(model.contextSize / 1024).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Est. VRAM</p>
                        <p className={`font-mono ${vramOk ? "text-white" : "text-red-400"}`}>
                          {formatBytes(model.vramEstimateMb)}
                        </p>
                      </div>
                    </div>

                    {!vramOk && !isActive && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-900/20 rounded px-2 py-1">
                        <HardDrive className="w-3 h-3" />
                        Insufficient VRAM — stop other GPU processes first
                      </div>
                    )}

                    {isActive ? (
                      <div className="flex items-center gap-2 text-xs text-cyan-400">
                        <Zap className="w-3 h-3" />
                        Serving on port {model.port}
                      </div>
                    ) : (
                      <Button
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                        disabled={!canSwitch || isSwitchingThis || !vramOk}
                        onClick={() => switchMut.mutate({ model: model.name })}
                      >
                        {isSwitchingThis ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Switching...
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {models.length === 0 && !modelsQuery.isLoading && (
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-12 text-center">
              <Cpu className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No local models configured</p>
              <p className="text-slate-500 text-sm mt-1">
                Add GGUF models to the registry in local_model_manager.ts
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
