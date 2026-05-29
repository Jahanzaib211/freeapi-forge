import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Clock, Zap, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface BenchmarkResult {
  model: string;
  latencyMs: number;
  tokens: number;
  content: string;
  success: boolean;
  error?: string;
}

export default function Benchmark() {
  const [prompt, setPrompt] = useState("");
  const [models, setModels] = useState("gpt-4o,claude-3-5-sonnet");
  const [maxTokens, setMaxTokens] = useState("256");
  const [results, setResults] = useState<BenchmarkResult[]>([]);

  const runBenchmark = trpc.benchmark.run.useMutation({
    onSuccess: (data) => setResults(data as BenchmarkResult[]),
  });

  const handleRun = () => {
    const modelList = models
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    if (!prompt || modelList.length < 2) return;
    setResults([]);
    runBenchmark.mutate({
      prompt,
      models: modelList,
      maxTokens: parseInt(maxTokens) || 256,
    });
  };

  const fastest = results.length > 0
    ? results.filter((r) => r.success).sort((a, b) => a.latencyMs - b.latencyMs)[0]
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
            Model Benchmark
          </h1>
          <p className="text-slate-400 text-lg">
            Compare model performance side-by-side
          </p>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 mb-6">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Prompt</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter a prompt to test across models..."
                rows={3}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Models (comma-separated, 2-5)</label>
                <Input
                  value={models}
                  onChange={(e) => setModels(e.target.value)}
                  placeholder="gpt-4o, claude-3-5-sonnet"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Max Tokens</label>
                <Input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleRun}
                  disabled={!prompt || models.split(",").filter((m) => m.trim()).length < 2 || runBenchmark.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                >
                  {runBenchmark.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Run Benchmark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {results.map((result) => (
              <Card
                key={result.model}
                className={`bg-slate-800/30 border-slate-700/50 backdrop-blur ${
                  fastest?.model === result.model ? "ring-2 ring-green-500/50" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base font-mono">
                      {result.model}
                    </CardTitle>
                    <div className="flex gap-2">
                      {fastest?.model === result.model && (
                        <Badge className="bg-green-600/20 text-green-400 border-green-600/50 text-[10px]">
                          <Zap className="w-2 h-2 mr-1" />Fastest
                        </Badge>
                      )}
                      <Badge
                        className={
                          result.success
                            ? "bg-green-600/20 text-green-400 border-green-600/50 text-[10px]"
                            : "bg-red-600/20 text-red-400 border-red-600/50 text-[10px]"
                        }
                      >
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Latency</div>
                      <div className="text-lg font-bold text-white flex items-center gap-1">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {result.latencyMs}ms
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Tokens</div>
                      <div className="text-lg font-bold text-white">
                        {result.tokens}
                      </div>
                    </div>
                  </div>
                  {result.content && (
                    <div className="bg-slate-900/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                      <div className="text-xs text-slate-500 mb-1">Response</div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{result.content}</p>
                    </div>
                  )}
                  {result.error && (
                    <div className="bg-red-900/20 rounded-lg p-3">
                      <div className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {result.error}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
