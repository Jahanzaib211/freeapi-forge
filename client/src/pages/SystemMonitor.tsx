import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Cpu,
  MemoryStick,
  MonitorDot,
  Thermometer,
  Fan,
  Zap,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SystemStats {
  cpu?: {
    cores?: { usage: number }[];
    model?: string;
    totalUsage?: number;
    loadAvg?: number[];
  };
  memory?: {
    total: number;
    free: number;
    used: number;
    usedPercent: number;
    totalSwap: number;
    freeSwap: number;
    usedSwap: number;
    swapUsedPercent: number;
  };
  gpu?: {
    index: number;
    utilizationGpu: number;
    memoryUsed: number;
    memoryTotal: number;
    temperature: number;
    powerDraw: number;
    fanSpeed: number;
  }[];
  gpuProcesses?: { pid: number; processName: string; usedMemory: number }[];
  topProcesses?: { pid: number; name: string; cpu: number; mem: number }[];
  aiProcesses?: { name: string; pid: number; command: string; type: string }[];
}

function BarGauge({
  value,
  max = 100,
  color = "bg-blue-500",
  height = "h-2",
}: {
  value: number;
  max?: number;
  color?: string;
  height?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor =
    pct > 90
      ? "bg-red-500"
      : pct > 70
        ? "bg-yellow-500"
        : color;
  return (
    <div className={`w-full bg-slate-700 rounded-full ${height}`}>
      <div
        className={`${height} rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-medium text-white">
        {value}
        {sub && <span className="text-slate-500 ml-1">{sub}</span>}
      </span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(1) + " KB";
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SystemMonitor() {
  const { data: queryStats } = trpc.systemMonitor.stats.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const [wsStats, setWsStats] = useState<SystemStats | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "system_stats" && msg.data) {
          setWsStats(msg.data);
        }
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => { ws.close(); };
  }, []);

  const stats = wsStats || queryStats;

  const cpu = stats?.cpu;
  const mem = stats?.memory;
  const gpuList = stats?.gpu || [];
  const gpu = gpuList[0];
  const gpuProcs = stats?.gpuProcesses || [];
  const topProcs = stats?.topProcesses || [];
  const aiProcs = stats?.aiProcesses || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              System Monitor
            </h1>
            <p className="text-slate-400 text-lg">
              Real-time hardware & process monitoring
            </p>
          </div>
          <Badge className="bg-green-600/20 text-green-400 border-green-600/50 px-3 py-1 animate-pulse">
            <Activity className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* CPU */}
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                CPU
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-slate-400 truncate">
                {cpu?.model || "Unknown CPU"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {cpu?.cores?.map((core: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Core {i}</span>
                      <span className="text-[10px] text-white font-mono">
                        {core.usage?.toFixed(0) || "0"}%
                      </span>
                    </div>
                    <BarGauge value={core.usage || 0} color="bg-blue-500" height="h-1.5" />
                  </div>
                ))}
              </div>
              {cpu?.loadAvg && (
                <div className="pt-2 border-t border-slate-700/50 space-y-1">
                  <StatRow label="Load 1m" value={cpu.loadAvg[0]?.toFixed(2) || "0"} />
                  <StatRow label="Load 5m" value={cpu.loadAvg[1]?.toFixed(2) || "0"} />
                  <StatRow label="Load 15m" value={cpu.loadAvg[2]?.toFixed(2) || "0"} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* RAM */}
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <MemoryStick className="w-4 h-4 text-purple-400" />
                Memory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">RAM</span>
                  <span className="text-xs text-white">
                    {formatBytes(mem?.used || 0)} / {formatBytes(mem?.total || 0)}
                  </span>
                </div>
                <BarGauge
                  value={mem?.used || 0}
                  max={mem?.total || 1}
                  color="bg-purple-500"
                />
              </div>
              <StatRow label="Free" value={formatBytes(mem?.free || 0)} />
              <StatRow label="Used %" value={`${mem?.usedPercent?.toFixed(1) || "0"}%`} />
              {mem && mem.totalSwap > 0 && (
                <div className="pt-2 border-t border-slate-700/50">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-400">Swap</span>
                    <span className="text-xs text-white">
                      {formatBytes(mem.usedSwap)} / {formatBytes(mem.totalSwap)}
                    </span>
                  </div>
                  <BarGauge
                    value={mem.usedSwap}
                    max={mem.totalSwap || 1}
                    color="bg-indigo-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* GPU */}
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <MonitorDot className="w-4 h-4 text-green-400" />
                GPU
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {gpu ? (
                <>
                  <p className="text-xs text-slate-400 truncate">GPU #{gpu.index}</p>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-400">Utilization</span>
                      <span className="text-xs text-white">{gpu.utilizationGpu?.toFixed(0) || 0}%</span>
                    </div>
                    <BarGauge value={gpu.utilizationGpu || 0} color="bg-green-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-400">VRAM</span>
                      <span className="text-xs text-white">
                        {gpu.memoryUsed?.toFixed(0) || "0"} / {gpu.memoryTotal?.toFixed(0) || "0"} MB
                      </span>
                    </div>
                    <BarGauge
                      value={gpu.memoryUsed || 0}
                      max={gpu.memoryTotal || 1}
                      color="bg-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50">
                    <div className="text-center">
                      <Thermometer className="w-3 h-3 text-orange-400 mx-auto mb-1" />
                      <span className="text-[10px] text-slate-400 block">Temp</span>
                      <span className="text-xs text-white font-mono">{gpu.temperature?.toFixed(0) || "0"}°C</span>
                    </div>
                    <div className="text-center">
                      <Zap className="w-3 h-3 text-yellow-400 mx-auto mb-1" />
                      <span className="text-[10px] text-slate-400 block">Power</span>
                      <span className="text-xs text-white font-mono">{gpu.powerDraw?.toFixed(0) || "0"}W</span>
                    </div>
                    <div className="text-center">
                      <Fan className="w-3 h-3 text-cyan-400 mx-auto mb-1" />
                      <span className="text-[10px] text-slate-400 block">Fan</span>
                      <span className="text-xs text-white font-mono">{gpu.fanSpeed?.toFixed(0) || "0"}%</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">No GPU detected</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* GPU Processes */}
        {gpuProcs.length > 0 && (
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mb-6">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <MonitorDot className="w-4 h-4 text-green-400" />
                GPU Processes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider pb-2">Process</th>
                      <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider pb-2">PID</th>
                      <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider pb-2">VRAM Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gpuProcs.map((proc: any, i: number) => (
                      <tr key={i} className="border-b border-slate-700/30">
                        <td className="py-2 text-xs text-white">{proc.processName}</td>
                        <td className="py-2 text-xs text-slate-400 font-mono">{proc.pid}</td>
                        <td className="py-2 text-xs text-slate-300">{proc.usedMemory?.toFixed(0) || "0"} MB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Processes */}
        {aiProcs.length > 0 && (
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mb-6">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base">AI Processes</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {aiProcs.map((proc: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{proc.name}</p>
                        <p className="text-[10px] text-slate-400">PID {proc.pid}</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/50 text-[10px]">
                      {proc.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Processes */}
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white text-base">Top Processes</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider pb-2">Name</th>
                    <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider pb-2">PID</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider pb-2">CPU%</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider pb-2">MEM%</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topProcs.map((proc: any, i: number) => (
                    <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="py-2 text-xs text-white truncate max-w-[200px]">{proc.name}</td>
                      <td className="py-2 text-xs text-slate-400 font-mono">{proc.pid}</td>
                      <td className="py-2 text-xs text-right font-mono">
                        <span className={proc.cpu > 80 ? "text-red-400" : proc.cpu > 50 ? "text-yellow-400" : "text-green-400"}>
                          {proc.cpu?.toFixed(1) || "0"}%
                        </span>
                      </td>
                      <td className="py-2 text-xs text-right font-mono text-slate-300">
                        {proc.mem?.toFixed(1) || "0"}%
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={() => {
                            if (confirm(`Kill process ${proc.name} (PID: ${proc.pid})?`)) {
                              fetch(`/api/system-monitor/kill-pid/${proc.pid}`, { method: "POST" })
                                .then(() => window.location.reload())
                                .catch(() => {});
                            }
                          }}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {topProcs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                        No process data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
