import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function TenantDashboard() {
  const { user, getToken } = useAuth();
  const token = getToken();
  const [stats, setStats] = useState<any>({ chats: 0, agents: 0, mcps: 0, budget: { used: 0, limit: 100, percent: 0 }, conversations: [], agentsList: [], mcpsList: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAllData(); }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [convRes, agentRes, mcpRes, budgetRes] = await Promise.allSettled([
        fetch(`/api/trpc/chat.listConversations?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/trpc/agentBuilder.list?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/trpc/mcpExplorer.installed`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/trpc/budgetManager.getStatus`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      let chats: any[] = [], agents: any[] = [], mcps: any[] = [], budget: any = { usedUsd: 0, limitUsd: 100, percentUsed: 0 };

      if (convRes.status === "fulfilled" && convRes.value.ok) {
        const d = await convRes.value.json();
        chats = d.result?.data?.json || [];
      }
      if (agentRes.status === "fulfilled" && agentRes.value.ok) {
        const d = await agentRes.value.json();
        agents = d.result?.data?.json || [];
      }
      if (mcpRes.status === "fulfilled" && mcpRes.value.ok) {
        const d = await mcpRes.value.json();
        mcps = d.result?.data?.json || [];
      }
      if (budgetRes.status === "fulfilled" && budgetRes.value.ok) {
        const d = await budgetRes.value.json();
        budget = d.result?.data?.json || { usedUsd: 0, limitUsd: 100, percentUsed: 0 };
      }
      setStats({ chats: chats.length, agents: agents.length, mcps: mcps.length, budget, conversations: chats.slice(0, 3), agentsList: agents.slice(0, 3), mcpsList: mcps });
    } catch {}
    setLoading(false);
  }

  const Card = ({ children, className }: any) => (
    <div className={`bg-card border border-border rounded-xl p-5 ${className || ""}`}>{children}</div>
  );

  const StatCard = ({ icon, label, value, subtext, color }: any) => (
    <Card>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xl">{icon}</span>
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{loading ? "..." : value}</p>
      {subtext && <p className="text-muted-foreground/70 text-xs mt-1">{subtext}</p>}
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.name || "User"}.</p>
        </div>
        <button onClick={loadAllData} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard icon="💬" label="Conversations" value={stats.chats} subtext="active this month" />
        <StatCard icon="🤖" label="Agents" value={stats.agents} subtext={`${stats.agentsList.filter((a: any) => a.status === "active").length} active`} />
        <StatCard icon="🔌" label="MCP Servers" value={stats.mcps} subtext="installed" />
        <StatCard icon="💰" label="Budget" value={`$${stats.budget.usedUsd?.toFixed(2) || "0.00"}`} subtext={`of $${stats.budget.limitUsd || 0}`} />
        <StatCard icon="👤" label="Role" value={user?.role || "user"} subtext={user?.email} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget */}
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4">💰 Budget</h2>
          {loading ? (
            <div className="h-24 bg-muted rounded animate-pulse" />
          ) : (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">${stats.budget.usedUsd?.toFixed(2) || "0.00"} used</span>
                <span className="text-muted-foreground">${stats.budget.limitUsd || 100} limit</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(stats.budget.percentUsed || 0, 100)}%` }} />
              </div>
              <p className="text-sm text-muted-foreground/70 mt-2">
                {stats.budget.percentUsed >= 100 ? "⚠️ Budget exceeded" : `📊 ${(stats.budget.percentUsed || 0).toFixed(0)}% used`}
              </p>
            </>
          )}
        </Card>

        {/* Active Agents */}
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4">🤖 Active Agents</h2>
          {loading ? (
            <div className="space-y-3">
              <div className="h-12 bg-muted rounded animate-pulse" />
              <div className="h-12 bg-muted rounded animate-pulse" />
            </div>
          ) : stats.agentsList.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground/70">
              <p>No agents yet</p>
              <a href="/agents" className="text-primary hover:underline text-sm mt-1 inline-block">Create your first agent →</a>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.agentsList.map((agent: any) => (
                <div key={agent.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-green-500 animate-pulse" : agent.status === "paused" ? "bg-yellow-500" : "bg-red-500"}`} />
                    <span className="text-sm text-foreground">{agent.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{agent.totalRuns || 0} runs</span>
                </div>
              ))}
              <a href="/agents" className="text-primary text-sm hover:underline block mt-2">Manage Agents →</a>
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4">📋 Recent Activity</h2>
          {loading ? (
            <div className="space-y-2">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          ) : (
            <div className="space-y-3">
              {stats.conversations.map((conv: any) => (
                <div key={conv.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground flex-1 truncate">{conv.title}</span>
                  <span className="text-muted-foreground/50 text-xs">{conv.messageCount || 0} msgs</span>
                </div>
              ))}
              {stats.conversations.length === 0 && <p className="text-muted-foreground/70 text-sm">No recent activity</p>}
              <a href="/chat" className="text-primary text-sm hover:underline block mt-2">View All →</a>
            </div>
          )}
        </Card>

        {/* MCP Status */}
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4">🔌 MCP Status</h2>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded animate-pulse" />
              <div className="h-8 bg-muted rounded animate-pulse" />
            </div>
          ) : stats.mcpsList.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground/70">
              <p>No MCP servers installed</p>
              <a href="/mcp-explorer" className="text-primary hover:underline text-sm mt-1 inline-block">Browse marketplace →</a>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.mcpsList.map((mcp: any) => (
                <div key={mcp.id} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${mcp.status === "connected" ? "bg-green-500" : "bg-yellow-500"}`} />
                  <span className="text-foreground">{mcp.name}</span>
                  <span className={`ml-auto text-xs ${mcp.status === "connected" ? "text-green-500" : "text-yellow-500"}`}>{mcp.status}</span>
                </div>
              ))}
              <a href="/mcp-explorer" className="text-primary text-sm hover:underline block mt-2">Manage MCPs →</a>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a href="/chat" className="block p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors border border-border">
            <p className="text-foreground font-medium">💬 New Chat</p>
            <p className="text-muted-foreground text-sm mt-1">Start conversation</p>
          </a>
          <a href="/agents" className="block p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors border border-border">
            <p className="text-foreground font-medium">🤖 Create Agent</p>
            <p className="text-muted-foreground text-sm mt-1">Build an AI agent</p>
          </a>
          <a href="/mcp-explorer" className="block p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors border border-border">
            <p className="text-foreground font-medium">🔌 Install MCP</p>
            <p className="text-muted-foreground text-sm mt-1">Add AI tools</p>
          </a>
          <a href="/virtual-keys" className="block p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors border border-border">
            <p className="text-foreground font-medium">🔑 API Keys</p>
            <p className="text-muted-foreground text-sm mt-1">Manage access</p>
          </a>
        </div>
      </Card>
    </div>
  );
}
