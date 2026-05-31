import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, RefreshCw, Zap, Activity, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ProviderMonitor() {
  const providersQuery = trpc.providers.status.useQuery(undefined, { refetchInterval: 2000 });
  const utils = trpc.useUtils();

  const resetCircuitBreaker = trpc.admin.resetCircuitBreaker.useMutation({
    onSuccess: () => {
      toast.success("Circuit breaker reset successfully");
      utils.providers.status.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to reset: ${err.message}`);
    },
  });

  const resetProviderHealth = trpc.admin.resetProviderHealth.useMutation({
    onSuccess: () => {
      toast.success("Provider health reset successfully");
      utils.providers.status.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to reset: ${err.message}`);
    },
  });

  const providers = providersQuery.data || [];
  const healthyCount = providers.filter(p => p.enabled && p.circuitState === "closed").length;
  const unhealthyCount = providers.filter(p => p.circuitState === "open").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Provider Monitor</h1>
          <p className="text-slate-400 text-lg">Real-time circuit breaker state & health metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-900/20 to-green-950/20 border-green-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 text-sm">Healthy Providers</span>
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-4xl font-bold text-white">{healthyCount}</div>
              <div className="text-xs text-green-500 mt-1">Circuit closed, ready to route</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-900/20 to-red-950/20 border-red-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-red-400 text-sm">Circuit Open</span>
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-4xl font-bold text-white">{unhealthyCount}</div>
              <div className="text-xs text-red-500 mt-1">Failures detected, cooling down</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-950/20 border-blue-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-400 text-sm">Total Providers</span>
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-4xl font-bold text-white">{providers.length}</div>
              <div className="text-xs text-blue-500 mt-1">Configured in system</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <Card key={provider.id} className="bg-slate-800/30 border-slate-700/50 backdrop-blur hover:border-slate-600/50 transition-all">
              <CardHeader className="border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">{provider.name}</CardTitle>
                  <Badge
                    variant={provider.enabled ? "default" : "secondary"}
                    className={provider.enabled ? "bg-green-600/20 text-green-400 border-green-600/50" : ""}
                  >
                    {provider.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <CardDescription className="text-slate-400">
                  {provider.litellmEndpoint}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Circuit State</span>
                  <Badge
                    className={
                      provider.circuitState === "closed"
                        ? "bg-green-600/20 text-green-400 border-green-600/50"
                        : "bg-red-600/20 text-red-400 border-red-600/50"
                    }
                  >
                    {provider.circuitState === "closed" ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Closed
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Open
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Quality Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${provider.qualityScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-white">{provider.qualityScore}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Latency</span>
                  <span className="text-sm font-semibold text-white">{provider.latencyMs}ms</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Failures</span>
                  <span className={`text-sm font-semibold ${provider.failureCount > 0 ? "text-red-400" : "text-green-400"}`}>
                    {provider.failureCount}
                  </span>
                </div>

                {provider.rateLimitCooldown !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Rate Limit Cooldown</span>
                    <span className="text-sm font-semibold text-yellow-400">{provider.rateLimitCooldown}s</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => resetCircuitBreaker.mutate({ providerName: provider.name })}
                    disabled={resetCircuitBreaker.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset Circuit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => resetProviderHealth.mutate({ providerName: provider.name })}
                    disabled={resetProviderHealth.isPending}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    Reset Health
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
