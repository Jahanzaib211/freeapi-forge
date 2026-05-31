import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Wifi } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ProviderHealth() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const healthQuery = trpc.providerHealth.check.useQuery(undefined, {
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const healthData = healthQuery.data ?? [];
  const healthyCount = healthData.filter((h) => h.status === "healthy").length;
  const degradedCount = healthData.filter((h) => h.status === "degraded").length;
  const downCount = healthData.filter((h) => h.status === "down").length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "degraded":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "down":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Wifi className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-600/20 text-green-400 border-green-600/50";
      case "degraded":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/50";
      case "down":
        return "bg-red-600/20 text-red-400 border-red-600/50";
      default:
        return "bg-slate-600/20 text-slate-400 border-slate-600/50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              Provider Health
            </h1>
            <p className="text-slate-400 text-lg">
              Live status of all configured providers
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`border-slate-700 ${autoRefresh ? "text-green-400 border-green-600/50" : "text-slate-300"}`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
              Auto-refresh {autoRefresh ? "On" : "Off"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => healthQuery.refetch()}
              className="border-slate-700 text-slate-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-6">
              <div className="text-xs text-slate-400 mb-1">Total Providers</div>
              <div className="text-3xl font-bold text-white">{healthData.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-6">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-400" /> Healthy
              </div>
              <div className="text-3xl font-bold text-green-400">{healthyCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-6">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-yellow-400" /> Degraded
              </div>
              <div className="text-3xl font-bold text-yellow-400">{degradedCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-6">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-400" /> Down
              </div>
              <div className="text-3xl font-bold text-red-400">{downCount}</div>
            </CardContent>
          </Card>
        </div>

        {healthQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthData.map((provider) => (
              <Card key={provider.name} className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base font-mono">
                      {provider.name}
                    </CardTitle>
                    <Badge className={`${getStatusColor(provider.status)} text-[10px]`}>
                      {getStatusIcon(provider.status)}
                      <span className="ml-1">{provider.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-2">
                      <div className="text-[10px] text-slate-500">Latency</div>
                      <div className="text-sm font-bold text-white">{provider.latencyMs}ms</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2">
                      <div className="text-[10px] text-slate-500">Models</div>
                      <div className="text-sm font-bold text-white">{provider.modelsAvailable}</div>
                    </div>
                  </div>
                  {provider.error && (
                    <div className="mt-3 text-xs text-red-400 bg-red-900/20 rounded p-2">
                      {provider.error}
                    </div>
                  )}
                  <div className="mt-3 text-[10px] text-slate-500">
                    Checked: {new Date(provider.lastChecked).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
