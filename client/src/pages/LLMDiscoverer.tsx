import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Download,
  Play,
  HardDrive,
  Cpu,
  Folder,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function ModelCard({
  model,
  onRegister,
  onLoad,
}: {
  model: any;
  onRegister?: () => void;
  onLoad?: () => void;
}) {
  return (
    <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-slate-500/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white font-medium truncate">{model.name}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{model.source}</p>
        </div>
        <Badge
          className={
            model.status === "loaded"
              ? "bg-green-600/20 text-green-400 border-green-600/50 text-[10px]"
              : "bg-slate-600/20 text-slate-400 border-slate-600/50 text-[10px]"
          }
        >
          {model.status || "available"}
        </Badge>
      </div>
      <div className="space-y-1.5 mb-3">
        {model.size && (
          <div className="flex justify-between">
            <span className="text-[10px] text-slate-400">Size</span>
            <span className="text-[10px] text-slate-300">{formatBytes(model.size)}</span>
          </div>
        )}
        {model.format && (
          <div className="flex justify-between">
            <span className="text-[10px] text-slate-400">Format</span>
            <span className="text-[10px] text-slate-300">{model.format}</span>
          </div>
        )}
        {model.quantization && (
          <div className="flex justify-between">
            <span className="text-[10px] text-slate-400">Quantization</span>
            <span className="text-[10px] text-slate-300">{model.quantization}</span>
          </div>
        )}
        {model.fileSize && (
          <div className="flex justify-between">
            <span className="text-[10px] text-slate-400">File Size</span>
            <span className="text-[10px] text-slate-300">{formatBytes(model.fileSize)}</span>
          </div>
        )}
        {model.estimatedVRAM && (
          <div className="flex justify-between">
            <span className="text-[10px] text-slate-400">Est. VRAM</span>
            <span className="text-[10px] text-slate-300">{model.estimatedVRAM}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {onRegister && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] border-slate-600 text-slate-300 hover:bg-slate-600"
            onClick={onRegister}
          >
            <Download className="w-3 h-3 mr-1" />
            Register to LiteLLM
          </Button>
        )}
        {onLoad && model.source === "ollama" && (
          <Button
            size="sm"
            className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onLoad}
          >
            <Play className="w-3 h-3 mr-1" />
            Load
          </Button>
        )}
      </div>
    </div>
  );
}

export default function LLMDiscoverer() {
  const { data: llms, isLoading, refetch } = trpc.systemMonitor.llms.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const utils = trpc.useUtils();
  const registerMut = trpc.models.add.useMutation({
    onSuccess: () => {
      utils.models.list.invalidate();
    },
  });

  const ollamaModels = llms?.filter((m: any) => m.source === "ollama") || [];
  const llamaCppModels = llms?.filter((m: any) => m.source === "llama-cpp") || [];
  const ggufFiles = llms?.filter((m: any) => m.source === "gguf") || [];
  const hfCache = llms?.filter((m: any) => m.source === "huggingface") || [];

  const groups = [
    { title: "Ollama", icon: Brain, models: ollamaModels, color: "text-blue-400" },
    { title: "llama.cpp", icon: Cpu, models: llamaCppModels, color: "text-purple-400" },
    { title: "GGUF Files", icon: HardDrive, models: ggufFiles, color: "text-green-400" },
    { title: "HuggingFace Cache", icon: Folder, models: hfCache, color: "text-yellow-400" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              LLM Discoverer
            </h1>
            <p className="text-slate-400 text-lg">
              Auto-detect local LLMs and model files
            </p>
          </div>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Scan
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-slate-400">Scanning for models...</div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.title}>
                <div className="flex items-center gap-2 mb-4">
                  <group.icon className={`w-5 h-5 ${group.color}`} />
                  <h2 className="text-xl font-semibold text-white">{group.title}</h2>
                  <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/50 text-xs">
                    {group.models.length}
                  </Badge>
                </div>
                {group.models.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.models.map((model: any, i: number) => (
                      <ModelCard
                        key={`${model.name}-${i}`}
                        model={model}
                        onRegister={() => {
                          if (model.source === "ollama") {
                            registerMut.mutate({
                              modelName: model.name,
                              provider: "ollama",
                              modelId: model.name,
                              apiBase: "http://127.0.0.1:11434",
                            });
                          } else if (model.source === "llama-cpp") {
                            registerMut.mutate({
                              modelName: model.name,
                              provider: "openai",
                              modelId: model.name,
                              apiBase: "http://127.0.0.1:8081/v1",
                            });
                          }
                        }}
                        onLoad={group.title === "Ollama" ? () => alert(`Use: ollama pull ${model.name}`) : undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-slate-800/20 border-slate-700/30">
                    <CardContent className="p-6 text-center text-slate-500 text-sm">
                      No {group.title.toLowerCase()} models found
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
