import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Plus,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Play,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    pre: "bg-blue-600/20 text-blue-400 border-blue-600/50",
    during: "bg-yellow-600/20 text-yellow-400 border-yellow-600/50",
    post: "bg-purple-600/20 text-purple-400 border-purple-600/50",
  };
  const icons: Record<string, any> = {
    pre: ShieldCheck,
    during: ShieldAlert,
    post: ShieldX,
  };
  const Icon = icons[type] || Shield;
  return (
    <Badge className={`${colors[type] || colors.pre} text-[10px]`}>
      <Icon className="w-2.5 h-2.5 mr-1" />
      {type} call
    </Badge>
  );
}

export default function Guardrails() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGuardrail, setSelectedGuardrail] = useState<any>(null);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<{ passed: boolean; detections: { type: string; detail: string }[] } | null>(null);
  const [testing, setTesting] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("pre");
  const [piiPattern, setPiiPattern] = useState("");
  const [injectionPattern, setInjectionPattern] = useState("");
  const [toxicityKeywords, setToxicityKeywords] = useState("");

  const listQuery = trpc.guardrails.guardrails.list.useQuery(undefined);
  const policiesQuery = trpc.guardrails.policies.list.useQuery(undefined);
  const utils = trpc.useUtils();

  const createMut = trpc.guardrails.guardrails.create.useMutation({
    onSuccess: () => {
      utils.guardrails.guardrails.list.invalidate();
      setShowCreate(false);
      setNewName("");
      setPiiPattern("");
      setInjectionPattern("");
      setToxicityKeywords("");
    },
  });

  const testGuardrail = () => {
    if (!testInput || !selectedGuardrail) return;
    setTesting(true);
    setTestResult(null);

    const detections: { type: string; detail: string }[] = [];
    const config = selectedGuardrail.config ? JSON.parse(selectedGuardrail.config) : {};

    if (config.piiDetection) {
      const piiPatterns = [/\b\d{3}-\d{2}-\d{4}\b/g, /\b\d{16}\b/g, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g];
      for (const pattern of piiPatterns) {
        const matches = testInput.match(pattern);
        if (matches) {
          detections.push({ type: "PII", detail: `Detected: ${matches[0]}` });
        }
      }
    }

    if (config.injectionBlocking) {
      const injectionPatterns = [/ignore previous/i, /system prompt/i, /ignore all/i, /disregard/i, /override/i];
      for (const pattern of injectionPatterns) {
        if (pattern.test(testInput)) {
          detections.push({ type: "Injection", detail: `Pattern matched: ${pattern.source}` });
        }
      }
    }

    if (config.customPatterns && Array.isArray(config.customPatterns)) {
      for (const keyword of config.customPatterns) {
        if (testInput.toLowerCase().includes(keyword.toLowerCase())) {
          detections.push({ type: "Toxicity", detail: `Keyword detected: ${keyword}` });
        }
      }
    }

    setTimeout(() => {
      setTestResult({ passed: detections.length === 0, detections });
      setTesting(false);
    }, 500);
  };

  const guardrails = listQuery.data || [];
  const policies = policiesQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              Guardrails
            </h1>
            <p className="text-slate-400 text-lg">
              Content safety & input/output validation
            </p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Guardrail
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Guardrails list */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Guardrails
                  <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/50 text-xs ml-auto">
                    {guardrails.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider p-4">Name</th>
                        <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider p-4">Type</th>
                        <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider p-4">Rules</th>
                        <th className="text-center text-[10px] text-slate-400 uppercase tracking-wider p-4">Status</th>
                        <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guardrails.map((g: any) => (
                        <tr
                          key={g.id}
                          className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer"
                          onClick={() => setSelectedGuardrail(g)}
                        >
                          <td className="p-4">
                            <span className="text-sm text-white">{g.name}</span>
                          </td>
                          <td className="p-4">
                            <TypeBadge type={g.type} />
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1 flex-wrap">
                              {g.pii && (
                                <Badge className="bg-red-600/20 text-red-400 border-red-600/50 text-[10px]">PII</Badge>
                              )}
                              {g.injection && (
                                <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/50 text-[10px]">Injection</Badge>
                              )}
                              {g.toxicity && (
                                <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/50 text-[10px]">Toxicity</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              className={
                                g.enabled
                                  ? "bg-green-600/20 text-green-400 border-green-600/50 text-[10px]"
                                  : "bg-slate-600/20 text-slate-400 border-slate-600/50 text-[10px]"
                              }
                            >
                              {g.enabled ? "Active" : "Disabled"}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-blue-400 hover:text-blue-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGuardrail(g);
                              }}
                            >
                              <Shield className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {guardrails.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                            No guardrails configured
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Policies */}
          <div>
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mb-6">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white text-base">Policies</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {policies.map((policy: any) => (
                  <div
                    key={policy.id}
                    className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30"
                  >
                    <p className="text-xs text-white font-medium mb-1">{policy.name}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {policy.guardrails?.map((gr: string) => (
                        <Badge key={gr} className="bg-blue-600/20 text-blue-400 border-blue-600/50 text-[10px]">
                          {gr}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {policy.teams?.map((t: string) => (
                        <Badge key={t} className="bg-slate-600/20 text-slate-400 border-slate-600/50 text-[10px]">
                          Team: {t}
                        </Badge>
                      ))}
                      {policy.keys?.map((k: string) => (
                        <Badge key={k} className="bg-slate-600/20 text-slate-400 border-slate-600/50 text-[10px]">
                          Key: {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {policies.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No policies defined</p>
                )}
              </CardContent>
            </Card>

            {/* Test panel */}
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Play className="w-4 h-4 text-green-400" />
                  Test Guardrail
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <Textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Enter test input..."
                  className="bg-slate-700 border-slate-600 text-white text-xs min-h-[80px]"
                />
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                  onClick={testGuardrail}
                  disabled={!testInput || !selectedGuardrail || testing}
                >
                  {testing ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3 mr-2" />
                  )}
                  Run Test
                </Button>
                {testResult && (
                  <div className="p-3 bg-slate-900 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      {testResult.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-xs font-medium ${testResult.passed ? "text-green-400" : "text-red-400"}`}>
                        {testResult.passed ? "Passed" : "Blocked"}
                      </span>
                    </div>
                    {testResult.detections?.map((d: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <AlertTriangle className="w-3 h-3 text-yellow-400" />
                        <span className="text-slate-300">{d.type}: {d.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Guardrail</DialogTitle>
              <DialogDescription className="text-slate-400">
                Define content safety rules for API calls
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="my-guardrail"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type</label>
                <div className="flex gap-2">
                  {(["pre", "during", "post"] as const).map((t) => (
                    <Button
                      key={t}
                      variant="outline"
                      size="sm"
                      className={`border-slate-600 ${
                        newType === t
                          ? "bg-blue-600/20 text-blue-400 border-blue-600/50"
                          : "text-slate-400"
                      }`}
                      onClick={() => setNewType(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-slate-400 font-medium">Rules</p>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">PII Patterns (regex)</label>
                  <Input
                    value={piiPattern}
                    onChange={(e) => setPiiPattern(e.target.value)}
                    placeholder="\b\d{3}-\d{2}-\d{4}\b"
                    className="bg-slate-700 border-slate-600 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Injection Patterns (regex)</label>
                  <Input
                    value={injectionPattern}
                    onChange={(e) => setInjectionPattern(e.target.value)}
                    placeholder="ignore previous|system prompt"
                    className="bg-slate-700 border-slate-600 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Toxicity Keywords (comma-separated)</label>
                  <Input
                    value={toxicityKeywords}
                    onChange={(e) => setToxicityKeywords(e.target.value)}
                    placeholder="harmful, offensive, ..."
                    className="bg-slate-700 border-slate-600 text-white text-xs"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() =>
                  createMut.mutate({
                    name: newName,
                    type: newType as any,
                    config: {
                      piiDetection: !!piiPattern,
                      injectionBlocking: !!injectionPattern,
                      customPatterns: toxicityKeywords
                        ? toxicityKeywords.split(",").map((k) => k.trim())
                        : undefined,
                    },
                  })
                }
                disabled={!newName || createMut.isPending}
              >
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Guardrail Detail Dialog */}
        <Dialog open={!!selectedGuardrail} onOpenChange={() => setSelectedGuardrail(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                {selectedGuardrail?.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Guardrail configuration and rules
              </DialogDescription>
            </DialogHeader>
            {selectedGuardrail && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TypeBadge type={selectedGuardrail.type} />
                  <Badge
                    className={
                      selectedGuardrail.enabled
                        ? "bg-green-600/20 text-green-400 border-green-600/50 text-[10px]"
                        : "bg-slate-600/20 text-slate-400 border-slate-600/50 text-[10px]"
                    }
                  >
                    {selectedGuardrail.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                {selectedGuardrail.rules && (
                  <div className="space-y-2">
                    {selectedGuardrail.rules.pii && (
                      <div className="p-3 bg-slate-900 rounded-lg">
                        <p className="text-[10px] text-red-400 mb-1">PII Pattern</p>
                        <code className="text-xs text-slate-300">{selectedGuardrail.rules.pii}</code>
                      </div>
                    )}
                    {selectedGuardrail.rules.injection && (
                      <div className="p-3 bg-slate-900 rounded-lg">
                        <p className="text-[10px] text-orange-400 mb-1">Injection Pattern</p>
                        <code className="text-xs text-slate-300">{selectedGuardrail.rules.injection}</code>
                      </div>
                    )}
                    {selectedGuardrail.rules.toxicity && (
                      <div className="p-3 bg-slate-900 rounded-lg">
                        <p className="text-[10px] text-yellow-400 mb-1">Toxicity Keywords</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedGuardrail.rules.toxicity.map((kw: string, i: number) => (
                            <Badge key={i} className="bg-yellow-600/20 text-yellow-400 border-yellow-600/50 text-[10px]">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
