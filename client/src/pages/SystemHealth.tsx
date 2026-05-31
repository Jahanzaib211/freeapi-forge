import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Server, Wifi, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function SystemHealth() {
  const healthQuery = trpc.health.detailed.useQuery(undefined, { refetchInterval: 3000 });
  const providersQuery = trpc.providers.status.useQuery(undefined, { refetchInterval: 3000 });

  const health = healthQuery.data;
  const providers = providersQuery.data || [];

  const healthyProviders = providers.filter(p => p.enabled && p.circuitState === "closed").length;
  const totalProviders = providers.filter(p => p.enabled).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">System Health</h1>
          <p className="text-slate-400 text-lg">Real-time infrastructure monitoring</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Server className="w-8 h-8 text-blue-400" />
                {healthQuery.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : health?.status === "healthy" ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div className="text-sm text-slate-400 mb-1">API Status</div>
              <div className="text-2xl font-bold text-white">
                {health?.status || "Checking..."}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : ""}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Database className="w-8 h-8 text-purple-400" />
                {healthQuery.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : health?.database === "connected" ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div className="text-sm text-slate-400 mb-1">PostgreSQL</div>
              <div className="text-2xl font-bold text-white">
                {health?.database || "Checking..."}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Port 5434 • forge_studio
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8 text-red-400" />
                {healthQuery.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : health?.redis === "connected" ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div className="text-sm text-slate-400 mb-1">Redis</div>
              <div className="text-2xl font-bold text-white">
                {health?.redis || "Checking..."}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Port 6379 • DB 1
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Wifi className="w-8 h-8 text-green-400" />
                {providersQuery.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : healthyProviders === totalProviders ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-yellow-400" />
                )}
              </div>
              <div className="text-sm text-slate-400 mb-1">LiteLLM Proxy</div>
              <div className="text-2xl font-bold text-white">
                {healthyProviders}/{totalProviders}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Providers healthy
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white">Infrastructure Details</CardTitle>
              <CardDescription>Connection information and configuration</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-400">Database URL</span>
                <span className="text-sm font-mono text-slate-300">postgresql://localhost:5434/forge_studio</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-400">Redis URL</span>
                <span className="text-sm font-mono text-slate-300">redis://localhost:6379/1</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-400">LiteLLM Proxy</span>
                <span className="text-sm font-mono text-slate-300">http://localhost:5050</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-400">API Port</span>
                <span className="text-sm font-mono text-slate-300">5051</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-400">Environment</span>
                <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/50">
                  {import.meta.env.MODE || "development"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white">Provider Health Breakdown</CardTitle>
              <CardDescription>Individual provider status</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {providers.slice(0, 8).map((provider) => (
                <div key={provider.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {provider.circuitState === "closed" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm font-medium text-white">{provider.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={provider.enabled ? "default" : "secondary"}
                      className={provider.enabled ? "bg-green-600/20 text-green-400 border-green-600/50" : ""}
                    >
                      {provider.enabled ? "Active" : "Disabled"}
                    </Badge>
                    {provider.failureCount > 0 && (
                      <Badge className="bg-red-600/20 text-red-400 border-red-600/50">
                        {provider.failureCount} failures
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
