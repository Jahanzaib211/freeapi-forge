import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TestTube, Loader2, CheckCircle2, XCircle, RefreshCw, Zap, Code, Info, Wifi } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PROVIDERS = [
  "groq", "gemini", "mistral", "cerebras", "sambanova", "cohere",
  "openrouter", "cloudflare", "ollama", "openai", "anthropic",
  "together", "deepinfra", "anyscale", "fireworks", "perplexity", "custom",
];

const PROVIDER_INFO: Record<string, { name: string; freeTier: boolean; apiBase: string; pricing: string }> = {
  groq: { name: "Groq", freeTier: true, apiBase: "https://api.groq.com/openai/v1", pricing: "Free tier available" },
  gemini: { name: "Google Gemini", freeTier: true, apiBase: "https://generativelanguage.googleapis.com/v1beta/openai", pricing: "Free tier available" },
  mistral: { name: "Mistral", freeTier: true, apiBase: "https://api.mistral.ai/v1", pricing: "Free tier available" },
  cerebras: { name: "Cerebras", freeTier: true, apiBase: "https://api.cerebras.ai/v1", pricing: "Free tier available" },
  sambanova: { name: "SambaNova", freeTier: true, apiBase: "https://api.sambanova.ai/v1", pricing: "Free tier available" },
  cohere: { name: "Cohere", freeTier: true, apiBase: "https://api.cohere.com/v2", pricing: "Free tier available" },
  openrouter: { name: "OpenRouter", freeTier: true, apiBase: "https://openrouter.ai/api/v1", pricing: "Free models available" },
  cloudflare: { name: "Cloudflare Workers AI", freeTier: true, apiBase: "https://api.cloudflare.com/client/v4", pricing: "Free tier available" },
  ollama: { name: "Ollama (Local)", freeTier: true, apiBase: "http://127.0.0.1:11434", pricing: "Free (local)" },
  openai: { name: "OpenAI", freeTier: false, apiBase: "https://api.openai.com/v1", pricing: "$2.50-10/1M tokens" },
  anthropic: { name: "Anthropic", freeTier: false, apiBase: "https://api.anthropic.com", pricing: "$3-15/1M tokens" },
  together: { name: "Together AI", freeTier: true, apiBase: "https://api.together.xyz/v1", pricing: "Free tier available" },
  deepinfra: { name: "DeepInfra", freeTier: true, apiBase: "https://api.deepinfra.com/v1/openai", pricing: "Free tier available" },
  anyscale: { name: "Anyscale", freeTier: true, apiBase: "https://api.endpoints.anyscale.com/v1", pricing: "Free tier available" },
  fireworks: { name: "Fireworks AI", freeTier: true, apiBase: "https://api.fireworks.ai/inference/v1", pricing: "Free tier available" },
  perplexity: { name: "Perplexity", freeTier: false, apiBase: "https://api.perplexity.ai", pricing: "$0.20-2/1M tokens" },
  custom: { name: "Custom", freeTier: false, apiBase: "", pricing: "Varies" },
};

const QUICK_ADD_MODELS = [
  { name: "groq-llama-3.3-70b", provider: "groq", modelId: "llama-3.3-70b-versatile", description: "Groq free - fast inference" },
  { name: "gemini-flash", provider: "gemini", modelId: "gemini-2.5-flash", description: "Google Gemini Flash - free" },
  { name: "mistral-large", provider: "mistral", modelId: "mistral-large-latest", description: "Mistral Large - free tier" },
  { name: "cerebras-llama", provider: "cerebras", modelId: "llama-3.3-70b", description: "Cerebras Llama - free" },
  { name: "sambanova-llama", provider: "sambanova", modelId: "Meta-Llama-3.3-70B-Instruct", description: "SambaNova Llama - free" },
  { name: "openrouter-free", provider: "openrouter", modelId: "meta-llama/llama-3.3-70b-instruct:free", description: "OpenRouter free models" },
  { name: "together-llama", provider: "together", modelId: "meta-llama/Llama-3.3-70B-Instruct-Turbo", description: "Together AI free tier" },
  { name: "deepinfra-llama", provider: "deepinfra", modelId: "meta-llama/Meta-Llama-3.3-70B-Instruct", description: "DeepInfra free tier" },
];

export default function ModelManager() {
  const [modelName, setModelName] = useState("");
  const [provider, setProvider] = useState("groq");
  const [modelId, setModelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latency: number }>>({});
  const [testingAll, setTestingAll] = useState(false);

  const modelsQuery = trpc.models.list.useQuery(undefined, { refetchInterval: 5000 });
  const configQuery = trpc.models.config.useQuery(undefined, { refetchInterval: 5000 });
  const customProvidersQuery = trpc.customProviders.list.useQuery(undefined, { refetchInterval: 10000 });
  const addMutation = trpc.models.add.useMutation();
  const removeMutation = trpc.models.remove.useMutation();
  const testMutation = trpc.models.test.useMutation();
  const utils = trpc.useUtils();

  const handleAdd = async () => {
    if (!modelName || !modelId) {
      toast.error("Model name and model ID are required");
      return;
    }

    try {
      const result = await addMutation.mutateAsync({
        modelName,
        provider,
        modelId,
        apiKey: apiKey || undefined,
        apiBase: apiBase || undefined,
      });

      if (result.success) {
        toast.success(`Model "${modelName}" added! Restarting LiteLLM...`);
        setModelName("");
        setModelId("");
        setApiKey("");
        setApiBase("");

        setTimeout(() => {
          utils.models.list.invalidate();
          utils.models.config.invalidate();
        }, 3000);
      } else {
        toast.error("Model already exists or failed to add");
      }
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    }
  };

  const handleQuickAdd = async (quickModel: typeof QUICK_ADD_MODELS[0]) => {
    try {
      const result = await addMutation.mutateAsync({
        modelName: quickModel.name,
        provider: quickModel.provider,
        modelId: quickModel.modelId,
        apiBase: PROVIDER_INFO[quickModel.provider]?.apiBase,
      });

      if (result.success) {
        toast.success(`Added "${quickModel.name}"! Restarting LiteLLM...`);
        setTimeout(() => {
          utils.models.list.invalidate();
          utils.models.config.invalidate();
        }, 3000);
      } else {
        toast.error(`"${quickModel.name}" already exists`);
      }
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    }
  };

  const handleRemove = async (name: string) => {
    try {
      const result = await removeMutation.mutateAsync({ modelName: name });
      if (result.success) {
        toast.success(`Model "${name}" removed`);
        setTimeout(() => {
          utils.models.list.invalidate();
          utils.models.config.invalidate();
        }, 3000);
      }
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    }
  };

  const handleTest = async (name: string) => {
    setTesting(name);
    try {
      const result = await testMutation.mutateAsync({ modelName: name });
      setTestResults((prev) => ({ ...prev, [name]: result }));
      if (result.success) {
        toast.success(`${name}: OK (${result.latency}ms)`);
      } else {
        toast.error(`${name}: Failed - ${result.error || "Unknown error"}`);
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  const handleTestAll = async () => {
    setTestingAll(true);
    const models = modelsQuery.data || [];
    let successCount = 0;
    let failCount = 0;

    for (const model of models) {
      try {
        const result = await testMutation.mutateAsync({ modelName: model.name });
        setTestResults((prev) => ({ ...prev, [model.name]: result }));
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setTestingAll(false);
    toast.success(`Test complete: ${successCount} passed, ${failCount} failed`);
  };

  const models = modelsQuery.data || [];
  const config = configQuery.data || [];
  const configuredProviders = Array.from(new Set(models.map(m => m.provider)));
  const customProviders = customProvidersQuery.data || [];
  const hasCustomProviders = customProviders.length > 0;
  const activeCustomProviders = customProviders.filter((p) => p.enabled === 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-5xl font-bold text-white tracking-tight">Model Manager</h1>
            {hasCustomProviders && (
              <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/50 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Standalone Mode ({activeCustomProviders.length} provider{activeCustomProviders.length !== 1 ? "s" : ""} active)
              </Badge>
            )}
          </div>
          <p className="text-slate-400 text-lg">Add, remove, and test LLM models — no code required</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Model
              </CardTitle>
              <CardDescription>Connect any LLM provider directly to LiteLLM</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Model Name (alias)</label>
                  <Input
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="my-model"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Provider</label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p}>
                          <div className="flex items-center gap-2">
                            <span>{PROVIDER_INFO[p]?.name || p}</span>
                            {PROVIDER_INFO[p]?.freeTier && (
                              <Badge className="bg-green-600/20 text-green-400 border-green-600/50 text-xs px-1.5 py-0.5">
                                Free
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {PROVIDER_INFO[provider] && (
                    <p className="text-xs text-slate-500 mt-1">
                      {PROVIDER_INFO[provider].pricing} · {configuredProviders.includes(provider) ? "✓ Configured" : "Not configured"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Model ID</label>
                  <Input
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder="llama-3.3-70b-versatile"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">API Key (optional)</label>
                  <Input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    type="password"
                    placeholder="sk-..."
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-400 mb-1 block">API Base URL (optional, for local/custom)</label>
                  <Input
                    value={apiBase}
                    onChange={(e) => setApiBase(e.target.value)}
                    placeholder={PROVIDER_INFO[provider]?.apiBase || "http://127.0.0.1:11434/v1"}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <Button
                onClick={handleAdd}
                disabled={addMutation.isPending || !modelName || !modelId}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Model & Restart LiteLLM
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Add Providers
              </CardTitle>
              <CardDescription>One-click add for common free providers</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
              {QUICK_ADD_MODELS.map((quickModel) => (
                <div key={quickModel.name} className="p-3 bg-slate-700/30 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{quickModel.name}</div>
                    <div className="text-xs text-slate-400 truncate">{quickModel.description}</div>
                    <div className="text-xs text-slate-500 font-mono mt-1">
                      {quickModel.modelId}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300 shrink-0"
                    onClick={() => handleQuickAdd(quickModel)}
                    disabled={addMutation.isPending || models.some(m => m.name === quickModel.name)}
                  >
                    {models.some(m => m.name === quickModel.name) ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <Card className="xl:col-span-2 bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Configured Models ({models.length})</CardTitle>
                  <CardDescription>From LiteLLM config — live from proxy</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                    onClick={handleTestAll}
                    disabled={testingAll || models.length === 0}
                  >
                    {testingAll ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <TestTube className="w-3 h-3 mr-1" />}
                    Test All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                    onClick={() => utils.models.list.invalidate()}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-slate-700/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Name</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Model</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Provider</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Test</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((model) => (
                      <tr key={model.name} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 text-sm text-white font-medium">{model.name}</td>
                        <td className="p-4 text-sm text-slate-300 font-mono">{model.model}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {model.provider}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {testResults[model.name] ? (
                            testResults[model.name].success ? (
                              <Badge className="bg-green-600/20 text-green-400 border-green-600/50">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {testResults[model.name].latency}ms
                              </Badge>
                            ) : (
                              <Badge className="bg-red-600/20 text-red-400 border-red-600/50">
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                              </Badge>
                            )
                          ) : (
                            <Badge className="bg-slate-600/20 text-slate-400 border-slate-600/50">
                              Untested
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          {testing === model.name ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 h-7"
                              onClick={() => handleTest(model.name)}
                            >
                              <TestTube className="w-3 h-3 mr-1" />
                              Test
                            </Button>
                          )}
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600/50 text-red-400 hover:bg-red-900/20 h-7"
                            onClick={() => handleRemove(model.name)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white flex items-center gap-2">
                <Info className="w-5 h-5" />
                Provider Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {PROVIDERS.filter(p => p !== "custom").map((p) => {
                const info = PROVIDER_INFO[p];
                const isConfigured = configuredProviders.includes(p);
                return (
                  <div key={p} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/20">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-slate-500'}`} />
                      <span className="text-sm text-slate-300">{info.name}</span>
                      {info.freeTier && (
                        <Badge className="bg-green-600/20 text-green-400 border-green-600/50 text-xs px-1.5 py-0.5">
                          Free
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{isConfigured ? "Active" : "Not added"}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-white" />
              <div>
                <CardTitle className="text-white">LiteLLM Config</CardTitle>
                <CardDescription>Current YAML configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <pre className="bg-slate-900/50 rounded-lg p-4 overflow-x-auto text-sm font-mono text-slate-300 max-h-[400px] overflow-y-auto">
              {config.length > 0 ? JSON.stringify(config, null, 2) : "No models configured"}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}