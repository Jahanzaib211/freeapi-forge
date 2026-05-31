import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Play, Loader2, Terminal, Code2, Clock, Copy, Check, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface SandboxPanelProps {
  onClose: () => void;
  initialCode?: string;
  initialLanguage?: string;
}

export default function SandboxPanel({ onClose, initialCode = "", initialLanguage = "python" }: SandboxPanelProps) {
  const [tab, setTab] = useState<"code" | "terminal">("code");
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; duration: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const languagesQuery = trpc.sandbox.languages.useQuery();
  const executeMutation = trpc.sandbox.execute.useMutation();
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const languages = languagesQuery.data || [];

  const handleRun = async () => {
    if (!code.trim()) return;
    setRunning(true);
    setOutput("");
    setResult(null);
    try {
      const res = await executeMutation.mutateAsync({ language, code });
      setOutput(res.output || "(no output)");
      setResult({ success: res.success, duration: res.duration });
    } catch (e: any) {
      setOutput(`Error: ${e?.message || "Unknown error"}`);
      setResult({ success: false, duration: 0 });
    }
    setRunning(false);
  };

  const startTerminal = async () => {
    if (termInstance.current) return;
    setTab("terminal");

    setTimeout(async () => {
      try {
        const { Terminal: XTerm } = await import("xterm");
        const { FitAddon } = await import("@xterm/addon-fit");

        const term = new XTerm({
          cursorBlink: true,
          theme: { background: "#0f172a", foreground: "#e2e8f0", cursor: "#60a5fa" },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current!);
        fitAddon.fit();

        termInstance.current = term;

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(`${protocol}://${window.location.host}/ws/terminal`);
        wsRef.current = ws;

        ws.onopen = () => term.writeln("\x1b[1;32m✓ Terminal connected\x1b[0m\r");
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "stdout" || msg.type === "stderr") term.write(msg.data);
            else if (msg.type === "exit") term.writeln(`\r\n\x1b[1;33m[Process exited with code ${msg.code}]\x1b[0m`);
            else if (msg.type === "error") term.writeln(`\r\n\x1b[1;31m[Error: ${msg.data}]\x1b[0m`);
          } catch {}
        };

        term.onData((data: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "stdin", data }));
          }
        });

        term.onResize(({ rows, cols }) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "resize", rows, cols }));
          }
        });
      } catch {}
    }, 100);
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      termInstance.current?.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-[1600px] mx-auto">
        <Card className="bg-slate-900/98 border-slate-700 border-t-2 border-t-cyan-500/50 rounded-t-2xl rounded-b-none shadow-2xl backdrop-blur-xl">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Sandbox</span>
                <div className="flex bg-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setTab("code")}
                    className={cn("px-3 py-1 text-xs rounded-md transition-colors", tab === "code" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}
                  >
                    <Code2 className="h-3 w-3 inline mr-1" /> Code Runner
                  </button>
                  <button
                    onClick={startTerminal}
                    className={cn("px-3 py-1 text-xs rounded-md transition-colors", tab === "terminal" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}
                  >
                    <Terminal className="h-3 w-3 inline mr-1" /> Terminal
                  </button>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {tab === "code" ? (
              <div>
                {/* Language selector + Run */}
                <div className="flex items-center gap-3 px-5 py-2 border-b border-slate-800">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white"
                  >
                    {languages.map((l: any) => (
                      <option key={l.key} value={l.key}>{l.label}</option>
                    ))}
                  </select>
                  <Button size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700" onClick={handleRun} disabled={running}>
                    {running ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                    Run
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setCode(""); setOutput(""); setResult(null); }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                  {result && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Badge className={result.success ? "bg-green-500/15 text-green-400 border-green-500/30 text-[10px]" : "bg-red-500/15 text-red-400 border-red-500/30 text-[10px]"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />{result.duration}ms
                      </span>
                    </div>
                  )}
                </div>

                {/* Code Editor + Output */}
                <div className="flex h-[55vh]">
                  <div className="w-1/2 border-r border-slate-800">
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="// Write your code here..."
                      spellCheck={false}
                      className="w-full h-full bg-slate-950 text-green-400 font-mono text-xs p-4 resize-none outline-none"
                    />
                  </div>
                  <div className="w-1/2 relative">
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="text-slate-500 hover:text-white p-1"
                        title="Copy output"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <pre className="w-full h-full bg-slate-950 text-slate-300 font-mono text-xs p-4 overflow-auto whitespace-pre-wrap">
                      {running ? (
                        <span className="text-cyan-400 animate-pulse">Running...</span>
                      ) : (
                        output || <span className="text-slate-600">Output will appear here...</span>
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              /* Terminal */
              <div className="h-[60vh] p-2">
                <div ref={terminalRef} className="w-full h-full rounded-lg overflow-hidden" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
