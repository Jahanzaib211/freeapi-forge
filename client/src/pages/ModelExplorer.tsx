import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, XCircle, TestTube, Loader2, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ModelExplorer() {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latency: number }>>({});

  const modelsQuery = trpc.models.list.useQuery(undefined, { refetchInterval: 10000 });
  const modelStatsQuery = trpc.analytics.modelStats.useQuery(undefined, { refetchInterval: 10000 });
  const testMutation = trpc.models.test.useMutation();

  const models = modelsQuery.data || [];
  const statsMap = new Map((modelStatsQuery.data || []).map((s) => [s.model, s]));

  const filteredModels = models.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.model.toLowerCase().includes(search.toLowerCase());
    const matchesProvider = providerFilter === "all" || m.provider === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const providers = Array.from(new Set(models.map((m) => m.provider)));

  const handleTest = async (name: string) => {
    setTesting(name);
    try {
      const result = await testMutation.mutateAsync({ modelName: name });
      setTestResults((prev) => ({ ...prev, [name]: result }));
      if (result.success) {
        toast.success(`${name}: OK (${result.latency}ms)`);
      } else {
        toast.error(`${name}: Failed`);
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Model Explorer</h1>
          <p className="text-slate-400 text-lg">Browse all models with live health status and usage stats</p>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search models..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={providerFilter === "all" ? "default" : "outline"}
                  className={providerFilter === "all" ? "bg-blue-600" : "border-slate-600 text-slate-300"}
                  onClick={() => setProviderFilter("all")}
                >
                  All
                </Button>
                {providers.map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={providerFilter === p ? "default" : "outline"}
                    className={providerFilter === p ? "bg-blue-600" : "border-slate-600 text-slate-300"}
                    onClick={() => setProviderFilter(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map((model) => {
            const stats = statsMap.get(model.model) || statsMap.get(model.name);
            const testResult = testResults[model.name];

            return (
              <Card key={model.name} className="bg-slate-800/30 border-slate-700/50 backdrop-blur hover:border-slate-600/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base">{model.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        testResult?.success
                          ? "bg-green-600/20 text-green-400 border-green-600/50"
                          : testResult && !testResult.success
                            ? "bg-red-600/20 text-red-400 border-red-600/50"
                            : "border-slate-600 text-slate-400"
                      }
                    >
                      {testResult?.success ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" />{testResult.latency}ms</>
                      ) : testResult ? (
                        <><XCircle className="w-3 h-3 mr-1" />Failed</>
                      ) : (
                        model.provider
                      )}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-400 font-mono text-xs">{model.model}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {model.apiBase && (
                    <div className="text-xs text-slate-500 font-mono">{model.apiBase}</div>
                  )}

                  {stats && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-slate-700/30 rounded">
                        <div className="text-xs text-slate-400">Requests</div>
                        <div className="text-sm font-semibold text-white">{stats.requestCount}</div>
                      </div>
                      <div className="p-2 bg-slate-700/30 rounded">
                        <div className="text-xs text-slate-400">Success</div>
                        <div className={`text-sm font-semibold ${stats.successRate > 90 ? "text-green-400" : stats.successRate > 70 ? "text-yellow-400" : "text-red-400"}`}>
                          {stats.successRate.toFixed(0)}%
                        </div>
                      </div>
                      <div className="p-2 bg-slate-700/30 rounded">
                        <div className="text-xs text-slate-400">Avg Latency</div>
                        <div className="text-sm font-semibold text-white">{stats.avgLatencyMs.toFixed(0)}ms</div>
                      </div>
                      <div className="p-2 bg-slate-700/30 rounded">
                        <div className="text-xs text-slate-400">Tokens</div>
                        <div className="text-sm font-semibold text-white">{stats.totalTokens.toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => handleTest(model.name)}
                    disabled={testing === model.name}
                  >
                    {testing === model.name ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <TestTube className="w-3 h-3 mr-1" />
                    )}
                    Test Model
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
