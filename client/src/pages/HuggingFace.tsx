import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  HardDrive,
  MemoryStick,
  Gauge,
  Brain,
  ArrowDownToLine,
  Loader2,
  RefreshCw,
  Box,
  Server,
  StopCircle,
  Eye,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function formatBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function formatNumber(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${bytesPerSec} B/s`;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return "Almost done";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function CircularGauge({
  value,
  max,
  label,
  sublabel,
  color,
  icon: Icon,
}: {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const colorMap: Record<string, { stroke: string; text: string; bg: string }> = {
    green: { stroke: "#22c55e", text: "text-green-400", bg: "bg-green-500/10" },
    blue: { stroke: "#3b82f6", text: "text-blue-400", bg: "bg-blue-500/10" },
    amber: { stroke: "#f59e0b", text: "text-amber-400", bg: "bg-amber-500/10" },
    red: { stroke: "#ef4444", text: "text-red-400", bg: "bg-red-500/10" },
    purple: { stroke: "#a855f7", text: "text-purple-400", bg: "bg-purple-500/10" },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`flex flex-col items-center p-3 rounded-xl ${c.bg} border border-slate-700/30`}>
      <div className="relative w-[88px] h-[88px] mb-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-700/50" />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={c.stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={`w-3.5 h-3.5 ${c.text} mb-0.5`} />
          <span className={`text-xs font-bold ${c.text}`}>{Math.round(pct)}%</span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-[11px] text-slate-300 mt-0.5">{sublabel}</span>
    </div>
  );
}

function CompatBadge({ level }: { level: "full" | "offload" | "unavailable" }) {
  if (level === "full") {
    return (
      <Badge className="bg-green-600/20 text-green-400 border-green-600/50 text-[10px] gap-1">
        <CheckCircle2 className="w-3 h-3" /> Full GPU
      </Badge>
    );
  }
  if (level === "offload") {
    return (
      <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/50 text-[10px] gap-1">
        <AlertTriangle className="w-3 h-3" /> CPU Offload
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-600/20 text-red-400 border-red-600/50 text-[10px] gap-1">
      <XCircle className="w-3 h-3" /> Not Compatible
    </Badge>
  );
}

function ModelCard({
  model,
  onPull,
  onViewDetails,
  onCancel,
}: {
  model: any;
  onPull: (modelId: string) => void;
  onViewDetails: (modelId: string) => void;
  onCancel: (modelId: string) => void;
}) {
  const compatQuery = trpc.huggingface.compatibility.useQuery(
    { modelId: model.id },
    { refetchInterval: 30000 }
  );

  const progressQuery = trpc.huggingface.progress.useQuery(
    { modelId: model.id },
    { refetchInterval: 1000 }
  );

  const compat = compatQuery.data;
  const progress = progressQuery.data;
  const isDownloading = progress?.status === "downloading";
  const isCompleted = progress?.status === "completed";

  const gradBg = !compat
    ? "from-slate-800/30 to-slate-800/30"
    : compat.level === "full"
      ? "from-green-900/20 via-slate-800/30 to-slate-800/30"
      : compat.level === "offload"
        ? "from-amber-900/20 via-slate-800/30 to-slate-800/30"
        : "from-red-900/20 via-slate-800/30 to-slate-800/30";

  const pipelineIcons: Record<string, string> = {
    "text-generation": "\uD83D\uDCA1",
    "image-generation": "\uD83C\uDFA8",
    "text-classification": "\uD83D\uDCCB",
    "question-answering": "\u2753",
    "fill-mask": "\uD83E\uDD14",
    "summarization": "\uD83D\uDCC4",
    "translation": "\uD83C\uDF10",
    "conversational": "\uD83D\uDCAC",
  };

  return (
    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur hover:border-slate-600/50 transition-all group overflow-hidden">
      <div className={`h-1 w-full bg-gradient-to-r ${gradBg}`} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{pipelineIcons[model.pipeline_tag] || "\uD83E\uDD16"}</span>
              <CardTitle className="text-white text-sm truncate">{model.name}</CardTitle>
            </div>
            <p className="text-[11px] text-slate-500 font-mono truncate">{model.id}</p>
          </div>
          {compat && <CompatBadge level={compat.level} />}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {formatNumber(model.downloads)}
          </span>
          <span>\u2B50 {formatNumber(model.likes)}</span>
          {model.pipeline_tag && (
            <Badge variant="outline" className="border-slate-600 text-slate-500 text-[9px]">
              {model.pipeline_tag}
            </Badge>
          )}
        </div>

        {model.tags && model.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {model.tags.slice(0, 4).map((tag: string) => (
              <span key={tag} className="px-1.5 py-0.5 bg-slate-700/40 rounded text-[9px] text-slate-400">
                {tag}
              </span>
            ))}
            {model.tags.length > 4 && (
              <span className="text-[9px] text-slate-500">+{model.tags.length - 4}</span>
            )}
          </div>
        )}

        {compat && (
          <div className="grid grid-cols-3 gap-1.5">
            <div className="text-center p-1.5 bg-slate-900/40 rounded">
              <div className="text-[9px] text-slate-500 uppercase">VRAM</div>
              <div className={`text-[11px] font-bold ${compat.vramNeeded <= compat.vramAvailable ? "text-green-400" : "text-amber-400"}`}>
                {compat.vramNeeded > 0 ? formatBytes(compat.vramNeeded) : "N/A"}
              </div>
            </div>
            <div className="text-center p-1.5 bg-slate-900/40 rounded">
              <div className="text-[9px] text-slate-500 uppercase">RAM</div>
              <div className={`text-[11px] font-bold ${compat.ramNeeded <= compat.ramAvailable ? "text-green-400" : "text-amber-400"}`}>
                {compat.ramNeeded > 0 ? formatBytes(compat.ramNeeded) : "N/A"}
              </div>
            </div>
            <div className="text-center p-1.5 bg-slate-900/40 rounded">
              <div className="text-[9px] text-slate-500 uppercase">Disk</div>
              <div className={`text-[11px] font-bold ${compat.diskNeeded <= compat.diskAvailable ? "text-green-400" : "text-red-400"}`}>
                {compat.diskNeeded > 0 ? formatBytes(compat.diskNeeded) : "N/A"}
              </div>
            </div>
          </div>
        )}

        {compat && compat.warnings.length > 0 && (
          <div className="space-y-0.5">
            {compat.warnings.slice(0, 2).map((w: string, i: number) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-400">
                <AlertTriangle className="w-3 h-3 mt-px shrink-0" />
                <span className="line-clamp-1">{w}</span>
              </div>
            ))}
          </div>
        )}

        {isDownloading && progress && (
          <div className="space-y-2 p-2.5 bg-slate-900/50 rounded-lg border border-slate-700/30">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Downloading...</span>
              <span className="text-white font-mono">{progress.percentage.toFixed(1)}%</span>
            </div>
            <Progress value={progress.percentage} className="h-1.5" />
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>{formatBytes(progress.downloaded / (1024 * 1024))} / {formatBytes(progress.total / (1024 * 1024))}</span>
              <span>{formatSpeed(progress.speed)} | ETA: {formatEta(progress.eta)}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-red-600/50 text-red-400 hover:bg-red-600/10 h-7 text-[11px]"
              onClick={() => onCancel(model.id)}
            >
              <StopCircle className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2 p-2 bg-green-600/10 rounded-lg border border-green-600/30 text-green-400 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="truncate">Downloaded to {progress.filePath?.split("/").slice(-2, -1)[0]}</span>
          </div>
        )}

        <div className="flex gap-2">
          {!isDownloading && !isCompleted && (
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-[11px]"
              onClick={() => onPull(model.id)}
            >
              <ArrowDownToLine className="w-3 h-3 mr-1" />
              Pull Model
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8 text-[11px]"
            onClick={() => onViewDetails(model.id)}
          >
            <Eye className="w-3 h-3 mr-1" />
            Details
          </Button>
          <a
            href={`https://huggingface.co/${model.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8 w-8 p-0"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailModal({
  modelId,
  open,
  onClose,
}: {
  modelId: string;
  open: boolean;
  onClose: () => void;
}) {
  const detailsQuery = trpc.huggingface.details.useQuery(
    { modelId },
    { enabled: open && !!modelId }
  );
  const filesQuery = trpc.huggingface.files.useQuery(
    { modelId },
    { enabled: open && !!modelId }
  );
  const compatQuery = trpc.huggingface.compatibility.useQuery(
    { modelId },
    { enabled: open && !!modelId }
  );

  const details = detailsQuery.data;
  const files = filesQuery.data || [];
  const compat = compatQuery.data;

  const ggufFiles = files.filter((f: any) => f.isGGUF);
  const otherFiles = files.filter((f: any) => !f.isGGUF);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-blue-400" />
            {details?.name || modelId}
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-mono text-xs">
            {modelId}
          </DialogDescription>
        </DialogHeader>

        {detailsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : details ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-slate-300">
                <Download className="w-3.5 h-3.5" />
                {formatNumber(details.downloads)} downloads
              </div>
              <div className="text-sm text-slate-300">\u2B50 {formatNumber(details.likes)}</div>
              {details.pipeline_tag && (
                <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                  {details.pipeline_tag}
                </Badge>
              )}
              {details.model_type && (
                <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                  {details.model_type}
                </Badge>
              )}
            </div>

            {compat && (
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-blue-400" />
                  Hardware Compatibility
                </h3>
                <CompatBadge level={compat.level} />
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-slate-800/50 rounded-lg">
                    <div className="text-[10px] text-slate-400 uppercase">VRAM</div>
                    <div className={`text-sm font-bold ${compat.vramNeeded <= compat.vramAvailable ? "text-green-400" : "text-amber-400"}`}>
                      {formatBytes(compat.vramNeeded)} / {formatBytes(compat.vramAvailable)}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-slate-800/50 rounded-lg">
                    <div className="text-[10px] text-slate-400 uppercase">RAM</div>
                    <div className={`text-sm font-bold ${compat.ramNeeded <= compat.ramAvailable ? "text-green-400" : "text-amber-400"}`}>
                      {formatBytes(compat.ramNeeded)} / {formatBytes(compat.ramAvailable)}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-slate-800/50 rounded-lg">
                    <div className="text-[10px] text-slate-400 uppercase">Disk</div>
                    <div className={`text-sm font-bold ${compat.diskNeeded <= compat.diskAvailable ? "text-green-400" : "text-red-400"}`}>
                      {formatBytes(compat.diskNeeded)} / {formatBytes(compat.diskAvailable)}
                    </div>
                  </div>
                </div>
                {compat.warnings.length > 0 && (
                  <div className="space-y-1">
                    {compat.warnings.map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-amber-400">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        {w}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-400">{compat.recommendation}</p>
              </div>
            )}

            {ggufFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Box className="w-4 h-4 text-purple-400" />
                  GGUF Files ({ggufFiles.length})
                </h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {ggufFiles.map((f: any) => (
                    <div key={f.filename} className="flex items-center justify-between p-2 bg-slate-900/30 rounded-lg text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Box className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="text-slate-300 truncate font-mono">{f.filename}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className="border-slate-600 text-[9px] text-slate-400">
                          {f.quantization}
                        </Badge>
                        <span className="text-slate-500 w-16 text-right">{f.sizeHuman}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  Other Files ({otherFiles.length})
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {otherFiles.slice(0, 20).map((f: any) => (
                    <div key={f.filename} className="flex items-center justify-between p-2 bg-slate-900/30 rounded-lg text-[11px]">
                      <span className="text-slate-300 truncate font-mono">{f.filename}</span>
                      <span className="text-slate-500 shrink-0 ml-2">{f.sizeHuman}</span>
                    </div>
                  ))}
                  {otherFiles.length > 20 && (
                    <p className="text-[10px] text-slate-500 text-center py-1">
                      +{otherFiles.length - 20} more files
                    </p>
                  )}
                </div>
              </div>
            )}

            {details.description && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
                <div className="text-xs text-slate-400 whitespace-pre-wrap line-clamp-6 bg-slate-900/30 p-3 rounded-lg">
                  {details.description}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">Failed to load model details</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function HuggingFace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [detailModelId, setDetailModelId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        setDebouncedQuery(searchQuery.trim());
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const searchQueryResult = trpc.huggingface.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  const hardwareQuery = trpc.huggingface.hardware.useQuery();
  const installedQuery = trpc.huggingface.installed.useQuery();

  const pullMutation = trpc.huggingface.pull.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Download started");
      } else {
        toast.error(data.error || "Failed to start download");
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const cancelMutation = trpc.huggingface.cancelPull.useMutation({
    onSuccess: () => toast.info("Download cancelled"),
  });

  const hardware = hardwareQuery.data;
  const models = searchQueryResult.data || [];

  const filteredModels = models.filter((m: any) => {
    if (typeFilter === "all") return true;
    if (typeFilter === "text") return m.pipeline_tag === "text-generation" || m.tags?.includes("text-generation");
    if (typeFilter === "image") return m.pipeline_tag === "image-generation" || m.tags?.some((t: string) => t.includes("image"));
    if (typeFilter === "code") return m.tags?.some((t: string) => t.includes("code") || t.includes("coding"));
    return true;
  });

  const handlePull = (modelId: string) => {
    pullMutation.mutate({ modelId });
  };

  const handleCancel = (modelId: string) => {
    cancelMutation.mutate({ modelId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1 tracking-tight flex items-center gap-3">
              <Brain className="w-9 h-9 text-blue-400" />
              HuggingFace Model Hub
            </h1>
            <p className="text-slate-400 text-sm">
              Browse, check compatibility, and pull models directly
            </p>
          </div>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => hardwareQuery.refetch()}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${hardwareQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh Hardware
          </Button>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mb-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search HuggingFace models... (e.g. llama, qwen, gemma, mistral)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="flex gap-1">
                {([
                  { key: "all", label: "All" },
                  { key: "text", label: "Text" },
                  { key: "image", label: "Image" },
                  { key: "code", label: "Code" },
                ] as const).map((f) => (
                  <Button
                    key={f.key}
                    size="sm"
                    variant={typeFilter === f.key ? "default" : "outline"}
                    className={typeFilter === f.key ? "bg-blue-600 h-9" : "border-slate-600 text-slate-400 h-9"}
                    onClick={() => setTypeFilter(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {hardware && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <CircularGauge
              value={hardware.gpuAvailable ? hardware.gpuVRAMFree : 0}
              max={hardware.gpuAvailable ? hardware.gpuVRAM : 100}
              label="GPU VRAM"
              sublabel={hardware.gpuAvailable ? `${hardware.gpuName.split(" ").slice(-1)[0]} ${formatBytes(hardware.gpuVRAMFree)} free` : "No GPU"}
              color={hardware.gpuAvailable && hardware.gpuVRAMFree > 4096 ? "green" : hardware.gpuAvailable ? "amber" : "red"}
              icon={Cpu}
            />
            <CircularGauge
              value={hardware.ramAvailable}
              max={hardware.ramTotal}
              label="System RAM"
              sublabel={`${formatBytes(hardware.ramAvailable)} free of ${formatBytes(hardware.ramTotal)}`}
              color={hardware.ramAvailable > 16384 ? "green" : hardware.ramAvailable > 8192 ? "blue" : "amber"}
              icon={MemoryStick}
            />
            <CircularGauge
              value={hardware.diskFree}
              max={hardware.diskFree + 50000}
              label="Disk Space"
              sublabel={`${formatBytes(hardware.diskFree)} available`}
              color={hardware.diskFree > 100000 ? "green" : hardware.diskFree > 50000 ? "blue" : "amber"}
              icon={HardDrive}
            />
            <CircularGauge
              value={hardware.cpuCores}
              max={hardware.cpuCores * 2}
              label="CPU Cores"
              sublabel={`${hardware.cpuCores} threads`}
              color="purple"
              icon={Gauge}
            />
          </div>
        )}

        {!debouncedQuery && (
          <div className="text-center py-16">
            <Brain className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-400 mb-2">Search for models</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Type a model name like <span className="font-mono text-slate-400">llama</span>,{" "}
              <span className="font-mono text-slate-400">qwen</span>,{" "}
              <span className="font-mono text-slate-400">gemma</span>, or{" "}
              <span className="font-mono text-slate-400">mistral</span> to browse available models
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {["llama 3.1", "qwen 2.5", "gemma 2", "mistral", "phi-3", "codestral", "deepseek", "yi"].map((q) => (
                <Button
                  key={q}
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-400 hover:bg-slate-700/50 text-xs"
                  onClick={() => setSearchQuery(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {debouncedQuery && searchQueryResult.isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        )}

        {debouncedQuery && !searchQueryResult.isLoading && filteredModels.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No models found for &quot;{debouncedQuery}&quot;</p>
          </div>
        )}

        {filteredModels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredModels.map((model: any) => (
              <ModelCard
                key={model.id}
                model={model}
                onPull={handlePull}
                onViewDetails={(id) => setDetailModelId(id)}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}

        {installedQuery.data && installedQuery.data.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Installed Models ({installedQuery.data.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {installedQuery.data.map((m: any) => (
                <Card key={m.path} className="bg-slate-800/20 border-slate-700/30">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{m.path}</p>
                    </div>
                    <Badge variant="outline" className="border-green-600/50 text-green-400 text-[10px] shrink-0 ml-2">
                      {m.sizeHuman}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <DetailModal
        modelId={detailModelId || ""}
        open={!!detailModelId}
        onClose={() => setDetailModelId(null)}
      />
    </div>
  );
}
