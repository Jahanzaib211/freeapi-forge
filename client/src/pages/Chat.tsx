import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AIChatBox, type Message } from "@/components/AIChatBox";

export default function ChatPage() {
  const { user, getToken } = useAuth();
  const token = getToken();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState("fast-8b");
  const [mcpTools, setMcpTools] = useState<string[]>([]);
  const [showTools, setShowTools] = useState(false);
  const [hasProviders, setHasProviders] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(true);

  useEffect(() => { loadConversations(); loadMcpTools(); checkProviders(); }, []);

  async function checkProviders() {
    setProvidersLoading(true);
    try {
      const res = await fetch("/api/trpc/providers.status", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        const data = d.result?.data?.json || d.result?.data || {};
        setHasProviders(Array.isArray(data) ? data.length > 0 : !!data);
      }
    } catch { setHasProviders(false); }
    setProvidersLoading(false);
  }

  async function loadConversations() {
    try {
      const res = await fetch(`/api/trpc/chat.listConversations?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { const d = await res.json(); setConversations(d.result?.data?.json || []); }
    } catch {}
  }

  async function loadMcpTools() {
    try {
      const res = await fetch("/api/trpc/mcpExplorer.getTools", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setConversations(d.result?.data?.json || []); }
    } catch {}
  }

  async function loadMessages(convId: number) {
    setActiveConvId(convId); setLoading(true);
    try {
      const res = await fetch(`/api/trpc/chat.getMessages?input=${encodeURIComponent(JSON.stringify({ json: { conversationId: convId } }))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        const msgs = d.result?.data?.json || [];
        setMessages(msgs.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })));
      }
    } catch {}
    setLoading(false);
  }

  async function createConversation() {
    try {
      const res = await fetch("/api/trpc/chat.createConversation?batch=1", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: { title: "New Chat", model: selectedModel } }]),
      });
      if (res.ok) {
        const d = await res.json();
        const conv = d[0]?.result?.data?.json;
        if (conv) {
          setConversations((prev: any) => [{ ...conv, messageCount: 0 }, ...prev]);
          setActiveConvId(conv.id);
          setMessages([]);
        }
      }
    } catch {}
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConvId || sending) return;
    setMessages(m => [...m, { role: "user", content }]);
    setSending(true);

    try {
      const res = await fetch("/api/trpc/chat.sendMessage?batch=1", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: { conversationId: activeConvId, content, model: selectedModel } }]),
      });
      if (res.ok) {
        const d = await res.json();
        const result = d[0]?.result?.data?.json;
        if (result?.assistantMessage) {
          setMessages(m => [...m, { role: "assistant", content: result.assistantMessage.content }]);
        }
      }
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Error: Failed to get response" }]);
    } finally { setSending(false); loadConversations(); }
  }, [activeConvId, sending, token, selectedModel]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <div className="w-72 border-r border-border flex flex-col bg-card">
        <div className="p-3 border-b border-border">
          <button onClick={createConversation}
            className="w-full py-2 px-3 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:opacity-90">
            + New Chat
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <input placeholder="Search conversations..." className="flex-1 px-2 py-1 bg-muted border border-border rounded text-xs text-foreground" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv: any) => (
            <button key={conv.id} onClick={() => loadMessages(conv.id)}
              className={`w-full text-left p-3 border-b border-border/50 hover:bg-muted transition-colors ${
                activeConvId === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
              }`}>
              <p className="text-sm text-foreground truncate">{conv.title}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{conv.lastMessage || "No messages yet"}</p>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-muted-foreground text-sm p-4 text-center">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {activeConvId ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                className="px-3 py-1.5 bg-muted border border-border rounded-lg text-sm text-foreground">
                <option value="fast-8b">Fast 8B</option><option value="chat">Chat</option>
                <option value="coding">Coding</option><option value="fast">Fast</option>
                <option value="local">Local</option>
              </select>
              <div className="relative">
                <button onClick={() => setShowTools(!showTools)}
                  className="px-3 py-1.5 bg-muted border border-border rounded-lg text-xs text-muted-foreground">
                  🔧 {mcpTools.length}
                </button>
                {showTools && (
                  <div className="absolute top-full mt-1 left-0 w-64 bg-card border border-border rounded-lg shadow-xl p-3 max-h-48 overflow-y-auto z-50">
                    <p className="text-xs text-muted-foreground font-medium mb-2">MCP Tools</p>
                    {mcpTools.length === 0 ? (
                      <p className="text-xs text-muted-foreground/70">None installed. Browse MCP Explorer.</p>
                    ) : mcpTools.map((t, i) => (
                      <p key={i} className="text-xs text-foreground py-0.5">{t}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="ml-auto text-xs text-muted-foreground">{messages.length} messages</div>
            </div>

            {/* Provider warning banner */}
            {!hasProviders && !providersLoading && (
              <div className="mx-4 mt-3 px-4 py-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg flex items-center gap-3">
                <span className="text-yellow-400 text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">No providers connected</p>
                  <p className="text-xs text-muted-foreground">Connect a provider to start chatting with AI models.</p>
                </div>
                <a href="/ai-lab?tab=providers" className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 whitespace-nowrap">
                  Go to AI Lab
                </a>
              </div>
            )}

            {/* Messages */}
            <AIChatBox
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={sending}
              placeholder="Type a message..."
              
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl mb-3">💬</p>
              <h2 className="text-xl font-semibold text-foreground mb-2">Forge Chat</h2>
              <p className="text-muted-foreground mb-4">Start a conversation with AI models</p>
              <button onClick={createConversation}
                className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90">
                Start Chatting
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
