import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Send, AlertCircle, CheckCircle2, Activity, TrendingUp, Zap, Database, Cpu, BarChart3 } from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type TaskType = "chat" | "coding" | "vision" | "fast" | "long_context" | "local";

interface Message {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  timestamp: Date;
  tokens?: number;
  latency?: number;
}

const COLORS = ["#00ff88", "#00aaff", "#ffaa00", "#ff4444", "#aa44ff", "#ff88cc"];

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("chat");
  const [selectedModel, setSelectedModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const liveStatsQuery = trpc.analytics.liveStats.useQuery(undefined, { refetchInterval: 5000 });
  const hourlyQuery = trpc.analytics.hourlyVolume.useQuery(undefined, { refetchInterval: 10000 });
  const topModelsQuery = trpc.analytics.topModels.useQuery({ limit: 5 }, { refetchInterval: 10000 });
  const providerPerfQuery = trpc.analytics.providerPerformance.useQuery(undefined, { refetchInterval: 10000 });
  const providersQuery = trpc.providers.status.useQuery(undefined, { refetchInterval: 3000 });
  const budgetQuery = trpc.budget.getMonthlySpend.useQuery({ teamId: "default" }, { refetchInterval: 5000 });
  const modelsQuery = trpc.catalog.getAll.useQuery(undefined, { refetchInterval: 10000 });

  const isLoading = liveStatsQuery.isLoading || hourlyQuery.isLoading || topModelsQuery.isLoading;

  const models = modelsQuery.data?.models || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreaming("");

    const allMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const startTime = Date.now();
    let fullContent = "";
    let tokenCount = 0;

    try {
      const response = await fetch("/api/stream/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          taskType,
          model: selectedModel || undefined,
          temperature: 0.7,
          maxTokens: 1024,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

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
              if (content) {
                fullContent += content;
                tokenCount++;
                setStreaming(fullContent);
              }
            } catch {}
          }
        }
      }

      const latency = Date.now() - startTime;
      const assistantMsg: Message = {
        role: "assistant",
        content: fullContent,
        provider: selectedModel || taskType,
        timestamp: new Date(),
        tokens: tokenCount,
        latency,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setStreaming("");
    }
  };

  const stats = liveStatsQuery.data;
  const budgetPercentage = budgetQuery.data?.percentageUsed || 0;
  const budgetColor = budgetPercentage > 80 ? "text-red-500" : budgetPercentage > 50 ? "text-yellow-500" : "text-green-500";
  const hourlyData = hourlyQuery.data || [];
  const topModels = topModelsQuery.data || [];
  const providerPerf = providerPerfQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => window.location.href = '/lab'}
                className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                ← Back to Hub
              </button>
            </div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Dashboard</h1>
            <p className="text-slate-400 text-lg">AI Lab Control Center • Live Analytics & Chat</p>
          </div>
          <Badge className="bg-green-600/20 text-green-400 border-green-600/50 px-3 py-1">
            <Activity className="w-3 h-3 mr-1" />
            {isLoading ? "Loading..." : "Live"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Today</span>
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.todayRequests || 0}</div>
              <div className="text-xs text-slate-500 mt-1">+{stats?.hourRequests || 0} last hour</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Tokens</span>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">{(stats?.totalTokens || 0).toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">All time</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Success Rate</span>
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white">{(stats?.successRate || 0).toFixed(1)}%</div>
              <div className="text-xs text-slate-500 mt-1">Last 24h</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Budget</span>
                <Database className="w-5 h-5 text-yellow-400" />
              </div>
              <div className={`text-3xl font-bold ${budgetColor}`}>
                ${budgetQuery.data?.currentSpend.toFixed(2) || "0.00"}
              </div>
              <div className="text-xs text-slate-500 mt-1">of ${budgetQuery.data?.monthlyLimit || 10}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base">Request Volume (24h)</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="count" stroke="#00ff88" strokeWidth={2} dot={{ fill: "#00ff88", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base">Top Models (7 days)</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topModels}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="model" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" height={50} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill="#00aaff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-full bg-slate-800/30 border-slate-700/50 backdrop-blur flex flex-col">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white">Chat Laboratory</CardTitle>
                <CardDescription>Streaming responses with real-time token tracking</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-6">
                <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-4 max-h-[500px]">
                  {messages.length === 0 && !streaming ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <p>Start a conversation — tokens stream in real-time</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                            msg.role === "user"
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-slate-700 text-slate-100 rounded-bl-none"
                          }`}>
                            {msg.role === "assistant" && msg.provider && (
                              <div className="text-xs text-slate-400 mb-1">{msg.provider}</div>
                            )}
                            <Streamdown>{msg.content}</Streamdown>
                            <div className="text-xs opacity-70 mt-2 flex items-center gap-3">
                              <span>{msg.timestamp.toLocaleTimeString()}</span>
                              {msg.tokens && <span>🔤 {msg.tokens}</span>}
                              {msg.latency && <span>⚡ {msg.latency}ms</span>}
                              {msg.tokens && msg.latency && (
                                <span>🚀 {((msg.tokens / (msg.latency / 1000))).toFixed(1)} tok/s</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {streaming && (
                        <div className="flex justify-start">
                          <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg bg-slate-700 text-slate-100 rounded-bl-none">
                            <Streamdown>{streaming + "▌"}</Streamdown>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                      <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="chat">Chat</SelectItem>
                        <SelectItem value="coding">Coding</SelectItem>
                        <SelectItem value="vision">Vision</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                        <SelectItem value="long_context">Long Context</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="flex-1 bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Or pick specific model..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 max-h-48">
                        {models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your message... (Ctrl+Enter to send)"
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 resize-none"
                      rows={3}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) sendMessage(); }}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={loading || !input.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-auto"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white text-lg">Budget Tracker</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-400">Monthly Spend</span>
                      <span className={`text-sm font-semibold ${budgetColor}`}>
                        ${budgetQuery.data?.currentSpend.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          budgetPercentage > 80 ? "bg-red-500" : budgetPercentage > 50 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-400">
                      <span>{budgetPercentage.toFixed(0)}%</span>
                      <span>${budgetQuery.data?.monthlyLimit || 10} limit</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white text-lg">Provider Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {providersQuery.data?.slice(0, 6).map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {provider.circuitState === "closed" ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className="text-xs font-medium text-white">{provider.name}</span>
                      </div>
                      <Badge variant={provider.enabled ? "default" : "secondary"} className="text-xs">
                        {provider.enabled ? "Active" : "Off"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {providerPerf.length > 0 && (
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white text-lg">Provider Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={providerPerf} dataKey="requests" nameKey="provider" cx="50%" cy="50%" outerRadius={60}
                        label={({ provider, percent }) => `${provider} ${(percent * 100).toFixed(0)}%`}>
                        {providerPerf.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
