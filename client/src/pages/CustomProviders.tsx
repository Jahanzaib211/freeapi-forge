import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, TestTube, CheckCircle2, XCircle, Globe, Key, RefreshCw, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CustomProviders() {
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; latencyMs: number; response?: string; error?: string }>>({});
  const [manualModels, setManualModels] = useState("");

  const providersQuery = trpc.customProviders.list.useQuery(undefined, { refetchInterval: 10000 });
  const addMutation = trpc.customProviders.add.useMutation();
  const deleteMutation = trpc.customProviders.delete.useMutation();
  const toggleMutation = trpc.customProviders.toggleEnabled.useMutation();
  const testMutation = trpc.customProviders.test.useMutation();
  const modelsQuery = trpc.customProviders.models.useQuery(
    { apiUrl, apiKey },
    { enabled: false }
  );
  const utils = trpc.useUtils();

  const handleFetchModels = async () => {
    if (!apiUrl || !apiKey) {
      toast.error("Enter URL and API key first");
      return;
    }
    setFetchingModels(true);
    try {
      const result = await utils.client.customProviders.models.query({ apiUrl, apiKey });
      setDiscoveredModels(result);
      if (result.length === 0) {
        toast.error("No models found. Check URL and key.");
      } else {
        toast.success(`Found ${result.length} model(s)`);
      }
    } catch (err: any) {
      toast.error(`Failed to fetch models: ${err.message}`);
      setDiscoveredModels([]);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleAdd = async () => {
    if (!name || !apiUrl || !apiKey) {
      toast.error("Name, URL, and API key are required");
      return;
    }
    try {
      const modelsToSend = discoveredModels.length > 0 
        ? discoveredModels.join(",") 
        : manualModels || undefined;
      const result = await addMutation.mutateAsync({
        name,
        apiUrl,
        apiKey,
        models: modelsToSend,
      });
      toast.success(`Provider "${name}" added with ${result.models.length} model(s)`);
      setName("");
      setApiUrl("");
      setApiKey("");
      setDiscoveredModels([]);
      utils.customProviders.list.invalidate();
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: number, provName: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success(`Deleted "${provName}"`);
      utils.customProviders.list.invalidate();
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    }
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id, enabled: !enabled });
      utils.customProviders.list.invalidate();
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const result = await testMutation.mutateAsync({ id });
      setTestResults((prev) => ({ ...prev, [id]: result }));
      if (result.success) {
        toast.success(`Test OK (${result.latencyMs}ms): "${result.response}"`);
      } else {
        toast.error(`Test failed: ${result.error}`);
      }
    } catch (err: any) {
      toast.error(`Test failed: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const providers = providersQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Custom Providers</h1>
          <p className="text-slate-400 text-lg">Paste any OpenAI-compatible API URL + key — it just works</p>
        </div>

        {/* Explainer Banner */}
        <Card className="mb-8 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-600/30 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0 mt-0.5">
                <Globe className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">How Custom Providers Work</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Connect any OpenAI-compatible API (OpenRouter, Together, LocalAI, vLLM, etc.) by pasting the base URL and API key.
                  Models are auto-discovered and routed through your provider when enabled. Custom providers take priority over built-in LiteLLM routes —
                  when a custom provider matches a model name, it handles the request directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Provider Form */}
        <Card className="mb-8 bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Custom Provider
            </CardTitle>
            <CardDescription>Paste any OpenAI-compatible endpoint URL and API key</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Provider Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Custom Provider"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block flex items-center gap-1">
                  <Globe className="w-3 h-3" /> API Base URL
                </label>
                <Input
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-400 mb-1 block flex items-center gap-1">
                  <Key className="w-3 h-3" /> API Key
                </label>
                <div className="relative">
                  <Input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    className="bg-slate-700 border-slate-600 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={handleFetchModels}
                disabled={fetchingModels || !apiUrl || !apiKey}
              >
                {fetchingModels ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Auto-Detect Models
              </Button>
              <Button
                onClick={handleAdd}
                disabled={addMutation.isPending || !name || !apiUrl || !apiKey}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Provider
              </Button>
            </div>

            {discoveredModels.length === 0 && (
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Or enter models manually (comma-separated)</label>
                <Input
                  value={manualModels}
                  onChange={(e) => setManualModels(e.target.value)}
                  placeholder="claude-3-opus, claude-3-sonnet, gpt-4"
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Use this if auto-detect fails. Enter model IDs exactly as the provider expects.</p>
              </div>
            )}

            {discoveredModels.length > 0 && (
              <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <p className="text-sm text-slate-400 mb-2">Discovered {discoveredModels.length} model(s):</p>
                <div className="flex flex-wrap gap-1">
                  {discoveredModels.map((m) => (
                    <Badge key={m} variant="outline" className="border-slate-600 text-slate-300 text-xs">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider List */}
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white">Configured Providers ({providers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {providers.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No custom providers yet</p>
                <p className="text-sm">Add a provider above to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                {providers.map((p) => {
                  const modelCount = p.models.split(",").filter(Boolean).length;
                  const isEnabled = p.enabled === 1;
                  const testResult = testResults[p.id];

                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isEnabled
                          ? "bg-slate-800/50 border-slate-700/50"
                          : "bg-slate-900/30 border-slate-800/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-white font-semibold text-base">{p.name}</h3>
                          <p className="text-slate-500 text-xs font-mono mt-0.5 truncate max-w-[200px]">
                            {p.apiUrl}
                          </p>
                        </div>
                        <Badge
                          className={
                            isEnabled
                              ? "bg-green-600/20 text-green-400 border-green-600/50"
                              : "bg-slate-600/20 text-slate-400 border-slate-600/50"
                          }
                        >
                          {isEnabled ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
                        <span>{modelCount} model(s)</span>
                        <span>·</span>
                        <span>Created {new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>

                      {testResult && (
                        <div className={`p-2 rounded-lg mb-3 text-xs ${
                          testResult.success ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300"
                        }`}>
                          {testResult.success ? (
                            <span>
                              <CheckCircle2 className="w-3 h-3 inline mr-1" />
                              {testResult.latencyMs}ms — "{testResult.response}"
                            </span>
                          ) : (
                            <span>
                              <XCircle className="w-3 h-3 inline mr-1" />
                              {testResult.error}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 h-8 flex-1"
                          onClick={() => handleTest(p.id)}
                          disabled={testingId === p.id}
                        >
                          {testingId === p.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <TestTube className="w-3 h-3 mr-1" />
                          )}
                          Test
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-8 flex-1 ${
                            isEnabled
                              ? "border-amber-600/50 text-amber-400 hover:bg-amber-900/20"
                              : "border-green-600/50 text-green-400 hover:bg-green-900/20"
                          }`}
                          onClick={() => handleToggle(p.id, isEnabled)}
                        >
                          {isEnabled ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600/50 text-red-400 hover:bg-red-900/20 h-8"
                          onClick={() => handleDelete(p.id, p.name)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
