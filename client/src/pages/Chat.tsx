import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

interface Message {
  id: number;
  role: string;
  content: string;
  model?: string;
  provider?: string;
  totalTokens?: number;
  costUsd?: number;
  latencyMs?: number;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  model: string | null;
  messageCount: number;
  lastMessage: string | null;
  updatedAt: string;
}

export default function ChatPage() {
  const { user, getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState("fast-8b");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = getToken();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    try {
      const res = await fetch("/api/trpc/chat.listConversations?input=%7B%22json%22%3A%7B%7D%7D", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.result?.data?.json || []);
      }
    } catch {}
  }

  async function loadMessages(convId: number) {
    setActiveConvId(convId);
    try {
      const res = await fetch(`/api/trpc/chat.getMessages?input=${encodeURIComponent(JSON.stringify({ json: { conversationId: convId } }))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.result?.data?.json || []);
      }
    } catch {}
  }

  async function createConversation() {
    try {
      const res = await fetch("/api/trpc/chat.createConversation?batch=1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify([{ json: { title: "New Chat", model: selectedModel } }]),
      });
      if (res.ok) {
        const data = await res.json();
        const newConv = data[0]?.result?.data?.json;
        if (newConv) {
          setConversations(prev => [{ ...newConv, lastMessage: null, messageCount: 0, updatedAt: new Date().toISOString() }, ...prev]);
          setActiveConvId(newConv.id);
          setMessages([]);
        }
      }
    } catch {}
  }

  async function sendMessage() {
    if (!input.trim() || !activeConvId || sending) return;

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/trpc/chat.sendMessage?batch=1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify([{
          json: {
            conversationId: activeConvId,
            content: userMsg.content,
            model: selectedModel,
          },
        }]),
      });

      if (res.ok) {
        const data = await res.json();
        const result = data[0]?.result?.data?.json;
        if (result?.assistantMessage) {
          setMessages(prev => [...prev, {
            ...result.assistantMessage,
            createdAt: new Date().toISOString(),
          }]);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: "Error: Failed to get response",
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
      loadConversations();
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-3 border-b border-gray-800">
          <button
            onClick={createConversation}
            className="w-full py-2 px-3 bg-[#00FFB2] text-black font-medium rounded-lg text-sm hover:bg-[#00cc8e] transition-colors"
          >
            + New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => loadMessages(conv.id)}
              className={`w-full text-left p-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                activeConvId === conv.id ? "bg-gray-800/50 border-l-2 border-l-[#00FFB2]" : ""
              }`}
            >
              <p className="text-sm text-white truncate">{conv.title}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {conv.lastMessage || "No messages yet"}
              </p>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-gray-500 text-sm p-4 text-center">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConvId ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-[#00FFB2] text-black"
                      : "bg-[#1e293b] text-gray-200 border border-gray-700"
                  }`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    {msg.role === "assistant" && msg.totalTokens && (
                      <p className="text-xs text-gray-500 mt-2">
                        {msg.totalTokens} tokens · ${msg.costUsd?.toFixed(4) || "0"} · {msg.latencyMs}ms
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-[#1e293b] border border-gray-700 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <div className="w-2 h-2 bg-[#00FFB2] rounded-full animate-pulse" />
                      AI is thinking...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-800 p-4">
              <div className="flex gap-3">
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="px-3 py-2 bg-[#1e293b] border border-gray-700 rounded-lg text-white text-sm"
                >
                  <option value="fast-8b">Fast 8B</option>
                  <option value="chat">Chat</option>
                  <option value="coding">Coding</option>
                  <option value="fast">Fast</option>
                  <option value="local">Local</option>
                </select>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFB2]"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="px-4 py-2 bg-[#00FFB2] text-black font-medium rounded-lg hover:bg-[#00cc8e] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Forge Chat</h2>
              <p className="text-gray-400 mb-4">Start a new conversation with AI models</p>
              <button
                onClick={createConversation}
                className="px-6 py-3 bg-[#00FFB2] text-black font-semibold rounded-lg hover:bg-[#00cc8e]"
              >
                Start Chatting
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
