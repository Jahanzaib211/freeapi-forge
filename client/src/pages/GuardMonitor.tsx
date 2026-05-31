import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Shield, Activity, ScrollText, Stethoscope, Cpu, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";

interface SystemMetrics {
  cpu: { loadAvg: number[]; cores: number };
  memory: { total: number; free: number; usedPercent: number; heapUsed: number; heapTotal: number };
  uptime: number;
  nodeVersion: string;
  pid: number;
}

interface AuditItem {
  id: number;
  timestamp: string;
  action: string;
  level: string;
  message: string;
  details: string | null;
  stackTrace: string | null;
}

interface DiagnosticsResult {
  postgres: { ok: boolean; latencyMs: number };
  redis: { ok: boolean; latencyMs: number };
  services: { name: string; status: string; latencyMs: number }[];
}

export default function GuardMonitor() {
  const { getToken } = useAuth();
  const token = getToken();

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
  const [uptimeHistory, setUptimeHistory] = useState<any[]>([]);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [activeTab, setActiveTab] = useState("monitor");

  const callTrpc = async (path: string, input?: any) => {
    try {
      const url = input
        ? `/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
        : `/api/trpc/${path}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const d = await res.json();
      return d.result?.data?.json ?? d.result?.data ?? null;
    } catch {
      return null;
    }
  };

  const loadMetrics = async () => {
    const data = await callTrpc("guard.metrics");
    if (data) setMetrics(data);
  };

  const loadAudit = async () => {
    const data = await callTrpc("guard.auditTrail", {
      action: auditActionFilter || undefined,
      page: auditPage,
      perPage: 50,
    });
    if (data) {
      setAuditItems(data.items || []);
      setAuditTotal(data.total || 0);
    }
  };

  const loadDiagnostics = async () => {
    setDiagnosticsLoading(true);
    const data = await callTrpc("guard.diagnostics");
    if (data) setDiagnostics(data);
    setDiagnosticsLoading(false);
  };

  const loadUptime = async () => {
    const data = await callTrpc("guard.uptimeHistory");
    if (data) setUptimeHistory(data);
  };

  useEffect(() => {
    loadMetrics();
    loadAudit();
    loadUptime();
    const metricsInterval = setInterval(loadMetrics, 5000);
    return () => clearInterval(metricsInterval);
  }, []);

  useEffect(() => {
    loadAudit();
  }, [auditPage, auditActionFilter]);

  const handleRunDiagnostics = async () => {
    await loadDiagnostics();
  };

  const diagOk = diagnostics && diagnostics.postgres.ok && diagnostics.redis.ok;

  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
    return bytes + " B";
  };

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    let result = "";
    if (d > 0) result += `${d}d `;
    if (h > 0) result += `${h}h `;
    if (m > 0) result += `${m}m `;
    result += `${sec}s`;
    return result;
  };

  const totalPages = Math.max(1, Math.ceil(auditTotal / 50));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
            <Shield className="inline w-10 h-10 mr-3 -mt-1" />
            Guard Monitor
          </h1>
          <p className="text-slate-400 text-lg">System health, audit trail, and diagnostics</p>
        </div>

        {diagnostics && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
              diagOk
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {diagOk ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">
              {diagOk ? "All Systems Operational" : "System Issues Detected"}
            </span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
            <TabsTrigger value="monitor" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" /> Monitor
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <ScrollText className="w-4 h-4 mr-2" /> Audit
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Stethoscope className="w-4 h-4 mr-2" /> Diagnostics
            </TabsTrigger>
            <TabsTrigger value="processes" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Cpu className="w-4 h-4 mr-2" /> Processes
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: MONITOR ─────────────────────────────────────────────── */}
          <TabsContent value="monitor" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50 pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-400" /> CPU
                  </CardTitle>
                  <CardDescription>Load average &amp; cores</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {metrics?.cpu.loadAvg.map((load, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          {i === 0 ? "1 min" : i === 1 ? "5 min" : "15 min"}
                        </span>
                        <span className="text-white font-mono">{load.toFixed(2)}</span>
                      </div>
                      <Progress
                        value={Math.min((load / metrics.cpu.cores) * 100, 100)}
                        className="h-2 bg-slate-700"
                      />
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-700/50">
                    <span className="text-slate-400">Cores</span>
                    <span className="text-white font-mono">{metrics?.cpu.cores}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50 pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" /> Memory
                  </CardTitle>
                  <CardDescription>System memory usage</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Used / Total</span>
                      <span className="text-white font-mono">
                        {metrics ? formatBytes(metrics.memory.total - metrics.memory.free) : "--"} /{" "}
                        {metrics ? formatBytes(metrics.memory.total) : "--"}
                      </span>
                    </div>
                    <Progress
                      value={metrics?.memory.usedPercent || 0}
                      className="h-2 bg-slate-700"
                    />
                    <span className="text-xs text-slate-500">{metrics?.memory.usedPercent.toFixed(1)}% used</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50 pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" /> Heap Memory
                  </CardTitle>
                  <CardDescription>Node.js process heap</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Heap Used</span>
                      <span className="text-white font-mono">
                        {metrics ? formatBytes(metrics.memory.heapUsed) : "--"}
                      </span>
                    </div>
                    <Progress
                      value={metrics ? (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100 : 0}
                      className="h-2 bg-slate-700"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Heap Total</span>
                    <span className="text-white font-mono">
                      {metrics ? formatBytes(metrics.memory.heapTotal) : "--"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50 pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-400" /> Uptime
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-white font-mono">
                    {metrics ? formatUptime(metrics.uptime) : "--"}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50 pb-3">
                  <CardTitle className="text-white text-lg">Node.js</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Version</span>
                    <span className="text-white font-mono">{metrics?.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">PID</span>
                    <span className="text-white font-mono">{metrics?.pid}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── TAB 2: AUDIT ────────────────────────────────────────────────── */}
          <TabsContent value="audit" className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Filter by action..."
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="max-w-xs bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500"
              />
              <Button variant="outline" onClick={loadAudit} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>

            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50">
                      <TableHead className="text-slate-400">Timestamp</TableHead>
                      <TableHead className="text-slate-400">Action</TableHead>
                      <TableHead className="text-slate-400">Level</TableHead>
                      <TableHead className="text-slate-400">Message</TableHead>
                      <TableHead className="text-slate-400">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500 py-12">
                          No audit events found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditItems.map((item) => (
                        <TableRow key={item.id} className="border-slate-700/50 hover:bg-slate-700/30">
                          <TableCell className="text-slate-300 text-sm font-mono">
                            {new Date(item.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                              {item.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                item.level === "error"
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : item.level === "warn"
                                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                  : "bg-green-500/10 text-green-400 border-green-500/20"
                              }
                            >
                              {item.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm max-w-md truncate">
                            {item.message}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm max-w-xs truncate">
                            {item.details || "--"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {auditTotal > 0 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-400">
                  Page {auditPage} of {totalPages} ({auditTotal} total)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={auditPage >= totalPages}
                  onClick={() => setAuditPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ─── TAB 3: DIAGNOSTICS ──────────────────────────────────────────── */}
          <TabsContent value="diagnostics" className="space-y-6">
            <Button
              onClick={handleRunDiagnostics}
              disabled={diagnosticsLoading}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {diagnosticsLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Stethoscope className="w-4 h-4" />
              )}
              Run Diagnostics
            </Button>

            {diagnostics && (
              <>
                <div className="flex gap-4">
                  <div
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      diagOk
                        ? "bg-green-500/10 text-green-400 border border-green-500/30"
                        : "bg-red-500/10 text-red-400 border border-red-500/30"
                    }`}
                  >
                    Overall: {diagOk ? "Healthy" : "Issues Found"}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                    <CardHeader className="border-b border-slate-700/50">
                      <CardTitle className="text-white flex items-center gap-2">
                        {diagnostics.postgres.ok ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        PostgreSQL
                      </CardTitle>
                      <CardDescription>
                        {diagnostics.postgres.ok ? "Connected" : "Connection failed"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Status</span>
                        <Badge
                          className={
                            diagnostics.postgres.ok
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }
                        >
                          {diagnostics.postgres.ok ? "UP" : "DOWN"}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm mt-3">
                        <span className="text-slate-400">Latency</span>
                        <span className="text-white font-mono">{diagnostics.postgres.latencyMs}ms</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                    <CardHeader className="border-b border-slate-700/50">
                      <CardTitle className="text-white flex items-center gap-2">
                        {diagnostics.redis.ok ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        Redis
                      </CardTitle>
                      <CardDescription>
                        {diagnostics.redis.ok ? "Connected" : "Connection failed"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Status</span>
                        <Badge
                          className={
                            diagnostics.redis.ok
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }
                        >
                          {diagnostics.redis.ok ? "UP" : "DOWN"}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm mt-3">
                        <span className="text-slate-400">Latency</span>
                        <span className="text-white font-mono">{diagnostics.redis.latencyMs}ms</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {diagnostics.services.length > 0 && (
                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                    <CardHeader className="border-b border-slate-700/50">
                      <CardTitle className="text-white">Services</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700/50">
                            <TableHead className="text-slate-400">Name</TableHead>
                            <TableHead className="text-slate-400">Status</TableHead>
                            <TableHead className="text-slate-400">Latency</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {diagnostics.services.map((svc, i) => (
                            <TableRow key={i} className="border-slate-700/50">
                              <TableCell className="text-slate-300">{svc.name}</TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    svc.status === "ok"
                                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                                      : "bg-red-500/10 text-red-400 border-red-500/20"
                                  }
                                >
                                  {svc.status === "ok" ? "UP" : "DOWN"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-300 font-mono">{svc.latencyMs}ms</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ─── TAB 4: PROCESSES ────────────────────────────────────────────── */}
          <TabsContent value="processes" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">System Memory Breakdown</CardTitle>
                  <CardDescription>Detailed memory allocation</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total Memory</span>
                      <span className="text-white font-mono">{metrics ? formatBytes(metrics.memory.total) : "--"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Free Memory</span>
                      <span className="text-white font-mono">{metrics ? formatBytes(metrics.memory.free) : "--"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Used Memory</span>
                      <span className="text-white font-mono">
                        {metrics ? formatBytes(metrics.memory.total - metrics.memory.free) : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Usage</span>
                      <span className="text-white font-mono">{metrics?.memory.usedPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                  <Progress
                    value={metrics?.memory.usedPercent || 0}
                    className="h-3 bg-slate-700"
                  />
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">Heap Memory Details</CardTitle>
                  <CardDescription>Node.js process heap allocation</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Heap Used</span>
                      <span className="text-white font-mono">{metrics ? formatBytes(metrics.memory.heapUsed) : "--"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Heap Total</span>
                      <span className="text-white font-mono">{metrics ? formatBytes(metrics.memory.heapTotal) : "--"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Heap Usage</span>
                      <span className="text-white font-mono">
                        {metrics ? ((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100).toFixed(1) : "--"}%
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={metrics ? (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100 : 0}
                    className="h-3 bg-slate-700"
                  />
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">Connection Stats</CardTitle>
                  <CardDescription>Process and uptime info</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Process PID</span>
                    <span className="text-white font-mono">{metrics?.pid}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Node Version</span>
                    <span className="text-white font-mono">{metrics?.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Uptime</span>
                    <span className="text-white font-mono">{metrics ? formatUptime(metrics.uptime) : "--"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">CPU Cores</span>
                    <span className="text-white font-mono">{metrics?.cpu.cores}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">CPU Load Details</CardTitle>
                  <CardDescription>Load average per interval</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {metrics?.cpu.loadAvg.map((load, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          {i === 0 ? "1 min" : i === 1 ? "5 min" : "15 min"}
                        </span>
                        <span className="text-white font-mono">{load.toFixed(2)}</span>
                      </div>
                      <Progress
                        value={Math.min((load / metrics.cpu.cores) * 100, 100)}
                        className="h-2 bg-slate-700"
                      />
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-700/50">
                    <span className="text-slate-400">Per-core load</span>
                    <span className="text-white font-mono">
                      {(metrics ? metrics.cpu.loadAvg[0] / metrics.cpu.cores : 0).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
