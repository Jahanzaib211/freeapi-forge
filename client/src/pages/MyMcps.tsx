import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

interface InstalledMcp {
  id: number; name: string; transport: string; url: string; status: string;
  toolCount: number; tenantId: number; createdAt: string; lastSeen: string | null;
}

export default function MyMcps() {
  const { getToken } = useAuth();
  const token = getToken();
  const [mcps, setMcps] = useState<InstalledMcp[]>([]);
  const [usage, setUsage] = useState<Record<number, any>>({});
  const [dailyUsage, setDailyUsage] = useState<Record<number, number>>({});

  useEffect(() => { loadMcps(); }, []);

  async function loadMcps() {
    try {
      const res = await fetch("/api/trpc/mcpExplorer.installed", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const list: InstalledMcp[] = data.result?.data?.json || [];
        setMcps(list);
        for (const mcp of list) {
          loadUsage(mcp.id);
        }
      }
    } catch {}
  }

  async function loadUsage(serverId: number) {
    try {
      const [usageRes, dailyRes] = await Promise.all([
        fetch(`/api/trpc/mcpExplorer.usage?input=${encodeURIComponent(JSON.stringify({ json: { serverId } }))}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/trpc/mcpExplorer.dailyUsage?input=${encodeURIComponent(JSON.stringify({ json: { serverId } }))}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (usageRes.ok) { const d = await usageRes.json(); setUsage(u => ({ ...u, [serverId]: d.result?.data?.json || {} })); }
      if (dailyRes.ok) { const d = await dailyRes.json(); setDailyUsage(u => ({ ...u, [serverId]: d.result?.data?.json || 0 })); }
    } catch {}
  }

  async function testConnection(id: number) {
    try {
      const res = await fetch("/api/trpc/mcpExplorer.testConnection?batch=1", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: { serverId: id } }]),
      });
      if (res.ok) loadMcps();
    } catch {}
  }

  async function uninstall(id: number) {
    try {
      await fetch("/api/trpc/mcpExplorer.uninstall?batch=1", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: { serverId: id } }]),
      });
      loadMcps();
    } catch {}
  }

  const statusBadge = (s: string) => {
    if (s === "connected") return <span className="flex items-center gap-1 text-green-400"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Connected</span>;
    if (s === "disconnected") return <span className="flex items-center gap-1 text-yellow-400"><span className="w-2 h-2 bg-yellow-400 rounded-full" /> Disconnected</span>;
    return <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 bg-red-400 rounded-full" /> Error</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My MCP Servers</h1>
          <p className="text-gray-400 mt-1">{mcps.length} installed. <a href="/mcp-explorer" className="text-[#00FFB2] hover:underline">Browse marketplace</a></p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mcps.map(mcp => {
          const u = usage[mcp.id] || {};
          const d = dailyUsage[mcp.id] || 0;
          return (
            <div key={mcp.id} className="bg-[#111827] border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium">{mcp.name}</h3>
                    {statusBadge(mcp.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span>🛠️ {mcp.toolCount} tools</span>
                    <span>📞 {u.calls || 0} total calls</span>
                    <span>📊 {u.successRate ? `${u.successRate.toFixed(0)}% success` : "N/A"}</span>
                    <span>📅 {d} calls today</span>
                    {u.avgLatency ? <span>⚡ {u.avgLatency}ms avg</span> : null}
                    {mcp.lastSeen ? <span>Last seen: {new Date(mcp.lastSeen).toLocaleDateString()}</span> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => testConnection(mcp.id)}
                    className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded text-xs hover:bg-blue-500/20">
                    Test
                  </button>
                  <button onClick={() => uninstall(mcp.id)}
                    className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-500/20">
                    Uninstall
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {mcps.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🔌</p>
            <p>No MCP servers installed yet.</p>
            <a href="/mcp-explorer" className="text-[#00FFB2] hover:underline mt-2 inline-block">Browse marketplace →</a>
          </div>
        )}
      </div>
    </div>
  );
}
