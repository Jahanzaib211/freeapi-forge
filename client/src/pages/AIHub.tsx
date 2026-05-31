import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Sparkles,
  Bot,
  ExternalLink,
  Copy,
  Check,
  Filter,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function AIHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const modelsQuery = trpc.models.list.useQuery(undefined);
  const agentsQuery = trpc.agents?.list?.useQuery(undefined) ?? { data: undefined };

  const models = modelsQuery.data ?? [];
  const agents = (agentsQuery.data as any[]) ?? [];
  const providers = Array.from(new Set(models.map((m: any) => m.provider)));

  const filteredModels = models.filter((m: any) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = providerFilter === "all" || m.provider === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const providerColors: Record<string, string> = {
    openai: "bg-green-600/20 text-green-400 border-green-600/50",
    anthropic: "bg-orange-600/20 text-orange-400 border-orange-600/50",
    meta: "bg-blue-600/20 text-blue-400 border-blue-600/50",
    mistral: "bg-purple-600/20 text-purple-400 border-purple-600/50",
    google: "bg-red-600/20 text-red-400 border-red-600/50",
    cohere: "bg-cyan-600/20 text-cyan-400 border-cyan-600/50",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
            <h1 className="text-5xl font-bold text-white tracking-tight">AI Hub</h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Discover and access available AI models. Use the API to integrate powerful language models into your applications.
          </p>
        </div>

        <div className="flex gap-4 mb-8 max-w-2xl mx-auto">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="bg-slate-800/30 border-slate-700/50 text-white pl-10 backdrop-blur"
            />
          </div>
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-48 bg-slate-800/30 border-slate-700/50 text-white backdrop-blur">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all">All Providers</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p} value={p}>{String(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {filteredModels.map((model: any, idx) => (
            <Card
              key={model.name}
              className="bg-slate-800/30 border-slate-700/50 backdrop-blur hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1 group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors">{model.name}</CardTitle>
                    <CardDescription className="text-slate-400 mt-1">{model.contextWindow?.toLocaleString()} ctx</CardDescription>
                  </div>
                  <Badge className={providerColors[model.provider] || "bg-slate-600/20 text-slate-400 border-slate-600/50"}>
                    {model.provider}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Status</span>
                    <Badge className={model.status === "ready" ? "bg-green-600/20 text-green-400 border-green-600/50" : "bg-yellow-600/20 text-yellow-400 border-yellow-600/50"}>
                      {model.status}
                    </Badge>
                  </div>
                  {model.pricing && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Pricing</span>
                      <span className="text-white text-xs">{model.pricing}</span>
                    </div>
                  )}
                  <div className="pt-2">
                    <div className="bg-slate-900/80 rounded-lg p-3 text-xs font-mono text-slate-300 relative group/code">
                      <code className="block overflow-x-auto whitespace-nowrap">
                        curl -X POST /v1/chat/completions \<br />
                        &nbsp;&nbsp;-d '{`{"model": "${model.name}"}`}'
                      </code>
                      <button
                        onClick={() => copyCode(`curl -X POST /v1/chat/completions -d '{"model": "${model.name}"}'`, idx)}
                        className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity"
                      >
                        {copiedIdx === idx ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-slate-400 hover:text-white" />}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {agents.length > 0 && (
          <>
            <div className="mb-6 flex items-center gap-2">
              <Bot className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Available Agents</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent: any) => (
                <Card key={agent.id} className="bg-slate-800/30 border-slate-700/50 backdrop-blur hover:border-blue-500/50 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-blue-400" />
                      <CardTitle className="text-white">{agent.name}</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400">{agent.model}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Status</span>
                      <Badge className={agent.status === "active" ? "bg-green-600/20 text-green-400 border-green-600/50" : "bg-slate-600/20 text-slate-400 border-slate-600/50"}>
                        {agent.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
