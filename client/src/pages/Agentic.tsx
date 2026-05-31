import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Bot,
  Cpu,
  Wrench,
  Server,
  DollarSign,
  Play,
  Send,
  Loader2,
  MessageSquare,
  Settings,
  Circle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Agentic() {
  const [createOpen, setCreateOpen] = useState(false);
  const [testAgentId, setTestAgentId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [formName, setFormName] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formBudget, setFormBudget] = useState("10");

  const agentsQuery = trpc.agents?.list?.useQuery(undefined) ?? { data: undefined, isLoading: false };
  const modelsQuery = trpc.models.list.useQuery(undefined);

  const agents = (agentsQuery.data as any[]) ?? [];
  const models = modelsQuery.data ?? [];
  const toolsList = ["search", "code_exec", "web_browse", "file_read", "file_write", "wiki", "calculator"];
  const mcpList = ["filesystem", "postgres", "github", "slack", "notion"];

  const handleCreate = () => {
    setCreateOpen(false);
    setFormName("");
    setFormPrompt("");
    setFormModel("");
    setFormBudget("10");
  };

  const handleTestSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput, timestamp: new Date() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const agent = agents.find((a: any) => a.id === testAgentId);
      const response = await fetch("/api/stream/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          model: agent?.model || "gpt-4o",
          temperature: 0.7,
          maxTokens: 1024,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) fullContent += content;
            } catch {}
          }
        }
      }

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullContent || "No response received.", timestamp: new Date() },
      ]);
    } catch (error: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message}`, timestamp: new Date() },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Agentic</h1>
            <p className="text-slate-400 text-lg">Create, manage, and test AI agents</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">Create Agent</DialogTitle>
                <DialogDescription>Configure a new AI agent with tools and MCP servers.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-slate-300">Name</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="My Agent" className="bg-slate-700 border-slate-600 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-slate-300">System Prompt</Label>
                  <Textarea value={formPrompt} onChange={(e) => setFormPrompt(e.target.value)} placeholder="You are a helpful assistant..." rows={4} className="bg-slate-700 border-slate-600 text-white mt-1 resize-none" />
                </div>
                <div>
                  <Label className="text-slate-300">Model</Label>
                  <Select value={formModel} onValueChange={setFormModel}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {models.map((m: any) => (
                        <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Tools</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {toolsList.map((t) => (
                      <Badge key={t} variant="outline" className="border-slate-600 text-slate-300 cursor-pointer hover:bg-slate-700">
                        <Wrench className="w-3 h-3 mr-1" /> {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">MCP Servers</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {mcpList.map((s) => (
                      <Badge key={s} variant="outline" className="border-slate-600 text-slate-300 cursor-pointer hover:bg-slate-700">
                        <Server className="w-3 h-3 mr-1" /> {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Monthly Budget ($)</Label>
                  <Input type="number" value={formBudget} onChange={(e) => setFormBudget(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-slate-600 text-slate-300">Cancel</Button>
                <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {agents.map((agent: any) => (
            <Card key={agent.id} className="bg-slate-800/30 border-slate-700/50 backdrop-blur hover:border-slate-600/50 transition-all">
              <CardHeader className="border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-400" />
                    <CardTitle className="text-white text-lg">{agent.name}</CardTitle>
                  </div>
                  <Badge className={agent.status === "active" ? "bg-green-600/20 text-green-400 border-green-600/50" : "bg-yellow-600/20 text-yellow-400 border-yellow-600/50"}>
                    <Circle className="w-2 h-2 mr-1 fill-current" /> {agent.status}
                  </Badge>
                </div>
                <CardDescription className="text-slate-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> {agent.model}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Tools</span>
                  <span className="text-white font-medium">{agent.tools?.length ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">MCP Servers</span>
                  <span className="text-white font-medium">{agent.mcpServers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Budget</span>
                  <span className="text-white font-medium">${agent.budget}/mo</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setTestAgentId(agent.id); setChatMessages([]); }}>
                    <Play className="w-3 h-3 mr-1" /> Test
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                    <Settings className="w-3 h-3 mr-1" /> Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {testAgentId && (
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-white">Agent Test - {agents.find((a: any) => a.id === testAgentId)?.name}</CardTitle>
                </div>
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setTestAgentId(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80 overflow-y-auto mb-4 space-y-3 pr-4">
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <p>Send a message to test this agent</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-lg px-4 py-3 rounded-lg ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-slate-700 text-slate-100 rounded-bl-none"}`}>
                        <div className="text-sm">{msg.content}</div>
                        <div className="text-xs opacity-60 mt-1">{msg.timestamp.toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-slate-700 border-slate-600 text-white"
                  onKeyDown={(e) => { if (e.key === "Enter") handleTestSend(); }}
                />
                <Button onClick={handleTestSend} disabled={chatLoading || !chatInput.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
