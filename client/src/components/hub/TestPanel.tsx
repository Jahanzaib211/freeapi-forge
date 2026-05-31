import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { X, Send, Loader2, Zap, Clock, Hash, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  tokens?: number;
  latency?: number;
}

interface TestPanelProps {
  modelName: string;
  modelId: string;
  provider: string;
  pool: string;
  onClose: () => void;
}

export default function TestPanel({ modelName, modelId, provider, pool, onClose }: TestPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [paramsOpen, setParamsOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreaming("");

    const allMsgs = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
    const startTime = Date.now();
    let fullContent = "";
    let tokenCount = 0;

    try {
      const response = await fetch("/api/stream/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMsgs, model: modelId, temperature, maxTokens }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setLoading(false); return; }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) { fullContent += content; tokenCount++; setStreaming(fullContent); }
            } catch {}
          }
        }
      }
    } catch {}

    if (fullContent) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: fullContent,
        tokens: tokenCount,
        latency: Date.now() - startTime,
      }]);
    }
    setStreaming("");
    setLoading(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-[1600px] mx-auto">
        <Card className="bg-slate-900/95 border-slate-700 border-t-2 border-t-blue-500/50 rounded-t-2xl rounded-b-none shadow-2xl backdrop-blur-xl">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-blue-400" />
                <div>
                  <span className="text-sm font-medium text-white">{modelName}</span>
                  <span className="text-xs text-slate-500 ml-2">{provider} · {pool}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setParamsOpen(!paramsOpen)}>
                  {paramsOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronUp className="h-3 w-3 mr-1" />}
                  Params
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setMessages([])}>
                  Clear
                </Button>
                <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Parameter sliders */}
            {paramsOpen && (
              <div className="px-5 py-3 border-b border-slate-800 grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Temperature</span><span className="font-mono">{temperature.toFixed(1)}</span>
                  </div>
                  <Slider value={[temperature]} min={0} max={2} step={0.1} onValueChange={([v]) => setTemperature(v)} className="[&>span]:bg-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Max Tokens</span><span className="font-mono">{maxTokens}</span>
                  </div>
                  <Slider value={[maxTokens]} min={50} max={8192} step={50} onValueChange={([v]) => setMaxTokens(v)} className="[&>span]:bg-blue-500" />
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="max-h-[45vh] overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 && !streaming && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Test {modelName} directly</p>
                  <p className="text-xs mt-1">Send a message to see the latency, token count, and response quality.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    msg.role === "user" ? "bg-blue-600/30 text-white" : "bg-slate-800 text-slate-200"
                  )}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.role === "assistant" && msg.tokens && (
                      <div className="flex gap-3 mt-2 pt-2 border-t border-slate-700/50 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{msg.tokens} tok</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{msg.latency}ms</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${((msg.tokens / 1000) * 0.002).toFixed(5)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-slate-800 text-slate-200">
                    <span className="whitespace-pre-wrap">{streaming}</span>
                    <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse align-middle" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-3 border-t border-slate-800 flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Test ${modelName}...`}
                className="flex-1 bg-slate-800 border-slate-700 text-white text-sm"
                disabled={loading}
              />
              <Button size="sm" onClick={handleSend} disabled={loading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 h-9">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
