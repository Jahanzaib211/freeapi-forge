import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Cpu, HardDrive, RefreshCw, Play, Layers, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const sourceConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  ollama: { icon: <Brain className="h-4 w-4" />, label: "Ollama", color: "border-blue-500/30 bg-blue-500/5" },
  "llama-cpp": { icon: <Cpu className="h-4 w-4" />, label: "llama.cpp", color: "border-purple-500/30 bg-purple-500/5" },
  gguf: { icon: <HardDrive className="h-4 w-4" />, label: "GGUF", color: "border-green-500/30 bg-green-500/5" },
  huggingface: { icon: <Layers className="h-4 w-4" />, label: "HF Cache", color: "border-yellow-500/30 bg-yellow-500/5" },
};

export default function LocalScanner() {
  const scanQuery = trpc.catalog.local.scan.useQuery(undefined, { refetchInterval: 30000 });
  const registerMutation = trpc.models.add.useMutation();
  const utils = trpc.useUtils();

  const models = scanQuery.data || [];

  const handleRegister = async (model: any) => {
    const provider = model.source === "ollama" ? "ollama" : "openai";
    const apiBase = model.source === "ollama" ? "http://127.0.0.1:11434" : model.source === "llama-cpp" ? "http://127.0.0.1:8081/v1" : undefined;
    try {
      await registerMutation.mutateAsync({
        modelName: model.name,
        provider,
        modelId: model.name,
        apiBase: apiBase || "",
      });
      toast.success(`Registered ${model.name} to LiteLLM`);
      utils.models.list.invalidate();
    } catch (e: any) {
      toast.error(`Failed: ${e?.message || "Unknown error"}`);
    }
  };

  const formatSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    return `${(bytes / 1e3).toFixed(1)} KB`;
  };

  return (
    <Card className="bg-slate-900/30 border-slate-800 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Local Models</span>
            <span className="text-xs text-slate-500">
              {models.length} found
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => scanQuery.refetch()} disabled={scanQuery.isFetching}>
            <RefreshCw className={cn("h-3 w-3 mr-1", scanQuery.isFetching && "animate-spin")} />
            Scan
          </Button>
        </div>

        {scanQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Scanning...
          </div>
        ) : models.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">
            No local models detected. Click Scan to search for Ollama, llama.cpp, and GGUF models.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {models.map((m: any) => {
              const cfg = sourceConfig[m.source] || sourceConfig.gguf;
              return (
                <Card
                  key={`${m.source}:${m.name}`}
                  className={cn("shrink-0 w-48 border card-lift", cfg.color)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium text-white truncate max-w-[100px]">{m.name}</span>
                      <Badge className={cn("text-[9px] shrink-0", m.status === "running" ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-slate-500/15 text-slate-400 border-slate-500/30")}>
                        {m.status || "found"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2">
                      {cfg.icon}
                      <span>{cfg.label}</span>
                      {m.size && <span>· {formatSize(m.size)}</span>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] w-full"
                      onClick={() => handleRegister(m)}
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3 mr-1" />
                      )}
                      Register
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
