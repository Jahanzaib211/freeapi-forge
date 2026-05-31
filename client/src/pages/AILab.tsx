import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Plus, FlaskConical, Plug, Search, Zap } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  type: string;
  status: string;
  modelCount: number;
  connected: boolean;
}

interface ProviderModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  contextLength: number;
}

interface RegistryProvider {
  key: string;
  name: string;
  url: string;
  defaultApiKeyEnv: string;
}

interface FreeProvider {
  name: string;
  description: string;
  url: string;
  models: number;
}

function trpcFetch(token: string | null) {
  return async (url: string, options?: RequestInit) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  };
}

function trpcQuery(token: string | null, path: string, input?: Record<string, any>) {
  const params = input
    ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : "?input=%7B%7D";
  return trpcFetch(token)(`/api/trpc/${path}${params}`);
}

function trpcMutate(token: string | null, path: string, input: Record<string, any>) {
  return trpcFetch(token)(`/api/trpc/${path}?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ json: input }]),
  });
}

export default function AILab() {
  const { getToken } = useAuth();
  const token = getToken();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [freeProviders, setFreeProviders] = useState<FreeProvider[]>([]);
  const [registryProviders, setRegistryProviders] = useState<RegistryProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [freeLoading, setFreeLoading] = useState(true);
  const [registryLoading, setRegistryLoading] = useState(true);

  const [newProviderKey, setNewProviderKey] = useState("");
  const [newProviderApiKey, setNewApiKey] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  const [searchModels, setSearchModels] = useState("");

  useEffect(() => {
    if (!token) return;
    loadProviders();
    loadFreeProviders();
    loadRegistry();
  }, [token]);

  async function loadProviders() {
    setLoading(true);
    try {
      const data = await trpcQuery(token, "aiLab.getConnectedProviders");
      setProviders(data?.result?.data?.json || []);
    } catch {}
    setLoading(false);
  }

  async function loadFreeProviders() {
    setFreeLoading(true);
    try {
      const data = await trpcQuery(token, "aiLab.freeProviders");
      setFreeProviders(data?.result?.data?.json || []);
    } catch {}
    setFreeLoading(false);
  }

  async function loadRegistry() {
    setRegistryLoading(true);
    try {
      const data = await trpcQuery(token, "aiLab.listRegistryProviders");
      setRegistryProviders(data?.result?.data?.json || []);
    } catch {}
    setRegistryLoading(false);
  }

  async function handleAddProvider() {
    if (!newProviderKey || !newProviderApiKey) {
      setAddError("Select a provider and enter an API key.");
      return;
    }
    setAdding(true);
    setAddError("");
    setAddSuccess("");
    try {
      const data = await trpcMutate(token, "aiLab.addProvider", {
        providerKey: newProviderKey,
        apiKey: newProviderApiKey,
      });
      if (data) {
        setAddSuccess("Provider added successfully.");
        setNewProviderKey("");
        setNewApiKey("");
        loadProviders();
      } else {
        setAddError("Failed to add provider.");
      }
    } catch {
      setAddError("An error occurred while adding the provider.");
    }
    setAdding(false);
  }

  async function handleEnableFree(name: string) {
    setAddError("");
    setAddSuccess("");
    try {
      const data = await trpcMutate(token, "aiLab.addProvider", {
        providerKey: name,
        apiKey: "",
      });
      if (data) {
        setAddSuccess(`${name} enabled successfully.`);
        loadProviders();
      }
    } catch {
      setAddError("Failed to enable provider.");
    }
  }

  const connectedProviders = providers.filter((p) => p.connected);
  const connectedModels = providers.reduce((sum, p) => sum + (p.modelCount || 0), 0);
  const filteredModels = (() => {
    const allModels: ProviderModel[] = [];
    providers.forEach((p) => {
      if (p.connected) {
        allModels.push({
          id: p.id,
          name: p.name,
          provider: p.type,
          capabilities: [],
          contextLength: 0,
        });
      }
    });
    if (!searchModels) return allModels;
    return allModels.filter(
      (m) =>
        m.name.toLowerCase().includes(searchModels.toLowerCase()) ||
        m.provider.toLowerCase().includes(searchModels.toLowerCase())
    );
  })();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🧪 AI Lab</h1>
        <p className="text-muted-foreground mt-1">Connect providers, discover free models, and compare performance</p>
      </div>

      <Tabs defaultValue="models" className="space-y-6">
        <TabsList>
          <TabsTrigger value="models">
            <FlaskConical className="w-4 h-4 mr-2" /> Models
          </TabsTrigger>
          <TabsTrigger value="providers">
            <Plug className="w-4 h-4 mr-2" /> Providers
          </TabsTrigger>
          <TabsTrigger value="discover">
            <Zap className="w-4 h-4 mr-2" /> Discover
          </TabsTrigger>
          <TabsTrigger value="compare">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Compare
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Connected Providers</CardDescription>
                <CardTitle className="text-3xl">{connectedProviders.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Available Models</CardDescription>
                <CardTitle className="text-3xl">{connectedModels}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Free Enabled</CardDescription>
                <CardTitle className="text-3xl">{freeProviders.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Models</CardTitle>
                  <CardDescription>All models across connected providers</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search models..."
                    value={searchModels}
                    onChange={(e) => setSearchModels(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Loading models...</p>
              ) : filteredModels.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No models found. Add a provider to get started.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredModels.map((m) => (
                    <Card key={m.id} className="border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{m.name}</CardTitle>
                          <Badge variant="outline">{m.provider}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-muted-foreground">Connected</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Connected Providers</CardTitle>
                <CardDescription>Providers with active API keys</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : connectedProviders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No providers connected yet. Add one below.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {connectedProviders.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <p className="text-foreground font-medium">{p.name}</p>
                          <p className="text-sm text-muted-foreground">{p.type} · {p.modelCount} model{p.modelCount !== 1 ? "s" : ""}</p>
                        </div>
                        <Badge variant="outline" className="text-green-500 border-green-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Provider</CardTitle>
                <CardDescription>Connect a provider by selecting from the registry and entering your API key</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Provider</label>
                  <Select value={newProviderKey} onValueChange={setNewProviderKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider..." />
                    </SelectTrigger>
                    <SelectContent>
                      {registryLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : registryProviders.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No registry providers available
                        </SelectItem>
                      ) : (
                        registryProviders.map((rp) => (
                          <SelectItem key={rp.key} value={rp.key}>
                            {rp.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">API Key</label>
                  <Input
                    value={newProviderApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="sk-..."
                    type="password"
                  />
                </div>
                {addError && (
                  <p className="text-sm text-red-500">{addError}</p>
                )}
                {addSuccess && (
                  <p className="text-sm text-green-500">{addSuccess}</p>
                )}
                <Button onClick={handleAddProvider} disabled={adding || !newProviderKey || !newProviderApiKey} className="w-full">
                  {adding ? "Adding..." : (
                    <>
                      <Plus className="w-4 h-4 mr-2" /> Add Provider
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registry Providers</CardTitle>
              <CardDescription>Available providers in the registry</CardDescription>
            </CardHeader>
            <CardContent>
              {registryLoading ? (
                <p className="text-muted-foreground text-center py-4">Loading registry...</p>
              ) : registryProviders.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No registry providers available.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {registryProviders.map((rp) => (
                    <Card key={rp.key} className="border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{rp.name}</CardTitle>
                        <CardDescription className="text-xs font-mono">{rp.url}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discover" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Free Providers</CardTitle>
              <CardDescription>Quickly enable free-tier providers for experimentation</CardDescription>
            </CardHeader>
            <CardContent>
              {freeLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading free providers...</p>
              ) : freeProviders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No free providers available. Check back later.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {freeProviders.map((fp) => (
                    <Card key={fp.name} className="border-border">
                      <CardHeader>
                        <CardTitle className="text-base">{fp.name}</CardTitle>
                        <CardDescription>{fp.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{fp.models} model{fp.models !== 1 ? "s" : ""}</span>
                          <Button size="sm" variant="outline" onClick={() => handleEnableFree(fp.name)}>
                            <Zap className="w-3 h-3 mr-1" /> Enable
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Comparison</CardTitle>
              <CardDescription>Compare models side-by-side across latency, cost, and quality metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">Model comparison coming soon</p>
                <p className="text-sm">Select models and run benchmark prompts to compare performance.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
