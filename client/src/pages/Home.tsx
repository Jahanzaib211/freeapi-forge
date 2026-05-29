import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  Activity, BarChart3, BookOpen, Brain, Cpu, Database,
  DollarSign, Globe, Key, Layers, Lock, MessageSquare,
  Moon, Shield, Settings, Sun, Users,
} from "lucide-react";

export default function Home() {
  const healthQuery = trpc.health.detailed.useQuery(undefined, { refetchInterval: 5000 });
  const providersQuery = trpc.providers.status.useQuery(undefined, { refetchInterval: 5000 });
  const liveStatsQuery = trpc.analytics.liveStats.useQuery(undefined, { refetchInterval: 5000 });
  const statsQuery = trpc.systemMonitor.stats.useQuery(undefined, { refetchInterval: 5000 });

  const health = healthQuery.data;
  const providers = providersQuery.data || [];
  const healthyProviders = providers.filter(p => p.enabled && p.circuitState === "closed").length;
  const stats = liveStatsQuery.data;
  const systemStats = statsQuery.data;

  const cpuPercent = systemStats ? Math.round(systemStats.cpu.totalUsage) : null;
  const ramPercent = systemStats ? Math.round(systemStats.memory.usedPercent) : null;
  const gpuPercent = systemStats && systemStats.gpu.length > 0
    ? Math.round(systemStats.gpu.reduce((sum, g) => sum + g.utilizationGpu, 0) / systemStats.gpu.length)
    : null;

  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-[1200px] mx-auto p-6">\n        {/* Hero */}
        <div className="mb-10 text-center page-enter">
          <div className="flex items-center justify-center gap-4 mb-6">
            <img
              src="https://avatars.githubusercontent.com/u/695416?v=4"
              alt="Jahanzaib Ali"
              className="h-20 w-20 rounded-full border-2 border-slate-700 shadow-lg"
            />
          </div>
          <h1 className="text-6xl font-bold mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Forge Studio
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-2">
            AI Lab Control Center
          </p>
          <a
            href="https://github.com/Jahanzaib211"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-blue-400 transition-colors"
          >
            github.com/Jahanzaib211
          </a>

          <div className="flex items-center justify-center gap-3 mt-6 mb-4 flex-wrap">
            <Badge className={`px-4 py-2 text-sm ${
              health?.status === "healthy"
                ? "bg-green-600/20 text-green-400 border-green-600/50"
                : health?.status === "degraded"
                  ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/50"
                  : "bg-slate-600/20 text-slate-400 border-slate-600/50"
            }`}>
              <Activity className="w-4 h-4 mr-2" />
              {health?.status === "healthy" ? "System Healthy" : health?.status === "degraded" ? "Degraded" : "Checking..."}
            </Badge>
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/50 px-4 py-2 text-sm">
              <Cpu className="w-4 h-4 mr-2" />
              {healthyProviders}/{providers.filter(p => p.enabled).length} Providers Active
            </Badge>
            <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/50 px-4 py-2 text-sm">
              <Database className="w-4 h-4 mr-2" />
              {health?.database === "connected" ? "PostgreSQL" : "DB Offline"}
            </Badge>
            <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/50 px-4 py-2 text-sm">
              <DollarSign className="w-4 h-4 mr-2" />
              {stats?.totalRequests || 0} Total Requests
            </Badge>
          </div>

          {systemStats && (
            <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
              <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/50 px-3 py-1.5 text-xs font-mono">
                <Cpu className="w-3 h-3 mr-1.5" />
                CPU {cpuPercent}%
              </Badge>
              {gpuPercent !== null && (
                <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/50 px-3 py-1.5 text-xs font-mono">
                  <Activity className="w-3 h-3 mr-1.5" />
                  GPU {gpuPercent}%
                </Badge>
              )}
              <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/50 px-3 py-1.5 text-xs font-mono">
                <Activity className="w-3 h-3 mr-1.5" />
                RAM {ramPercent}%
              </Badge>
            </div>
          )}
        </div>

        {/* AI LAB Section */}
        <SectionHeader label="AI LAB" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/lab">
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700/50 hover:border-blue-500/50 transition-all cursor-pointer group ring-1 ring-blue-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">AI Lab Hub</CardTitle>
                  <Cpu className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">Unified model catalog</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  All models in one place — cloud APIs, custom providers, local Ollama/llama.cpp.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Playground</CardTitle>
                  <MessageSquare className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">Streaming chat with analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Test any model with streaming token-by-token output and live metrics.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/inference">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Inference Lab</CardTitle>
                  <Cpu className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">Direct inference with GPU config</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Connect directly to llama.cpp or Ollama with GPU offloading controls.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* GOVERNANCE Section */}
        <SectionHeader label="GOVERNANCE" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/virtual-keys">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Virtual Keys</CardTitle>
                  <Key className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">API key management & budgets</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Create API keys with spending limits, rate limits, and model restrictions.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/guardrails">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Guardrails</CardTitle>
                  <Shield className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">Content safety & filtering</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  PII detection, prompt injection blocking, and toxicity filtering.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/budgets">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Budgets</CardTitle>
                  <DollarSign className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">Spending limits & tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Set monthly budgets per team with real-time spend tracking.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* SYSTEM Section */}
        <SectionHeader label="SYSTEM" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/system-monitor">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">System Monitor</CardTitle>
                  <Activity className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">Real-time system metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  CPU, GPU, RAM, and AI process monitoring with live WebSocket updates.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/usage">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Usage & Analytics</CardTitle>
                  <BarChart3 className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">Token usage & cost data</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Detailed breakdowns by model, provider, team, and time period.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/providers">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Provider Health</CardTitle>
                  <Shield className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">Circuit breaker & health</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Monitor circuit breaker state, quality scores, and provider uptime.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* TOOLS Section */}
        <SectionHeader label="TOOLS" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Link href="/mcp-servers">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">MCP Servers</CardTitle>
                  <Globe className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">Model Context Protocol</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Connect and manage MCP-compatible tool servers for agentic workflows.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/api-reference">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">API Reference</CardTitle>
                  <BookOpen className="w-5 h-5 text-zinc-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">Interactive API docs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  OpenAPI documentation with request/response examples for all endpoints.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/settings">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Settings</CardTitle>
                  <Settings className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform" />
                </div>
                <CardDescription className="text-slate-400">System configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Global settings, integrations, themes, and system preferences.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="text-center text-slate-500 text-sm">
          <p>Forge Studio v3.0.0 · github.com/Jahanzaib211</p>
          <p className="mt-2">LiteLLM: :5050 · API: :5051 · llama.cpp: :8081 · Ollama: :11434</p>
          <p className="mt-2">
            <a href="https://www.alilabsx.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
              www.alilabsx.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase">{label}</span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}
