import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

interface Mcp {
  id: number; slug: string; name: string; description: string; category: string;
  icon: string; tier: string; installCount: number; rating: number; reviewCount: number;
  tools: string; author: string; featured: number; installed: boolean;
}

export default function McpExplorer() {
  const { getToken } = useAuth();
  const token = getToken();
  const [mcps, setMcps] = useState<Mcp[]>([]);
  const [featured, setFeatured] = useState<Mcp[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tier, setTier] = useState("");
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>({ name: "free", maxMcpServers: 10 });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [listRes, featRes, planRes] = await Promise.all([
        fetch(`/api/trpc/mcpExplorer.list?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/trpc/mcpExplorer.featured`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/trpc/mcpExplorer.currentPlan`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (listRes.ok) { const d = await listRes.json(); setMcps(d.result?.data?.json?.items || []); }
      if (featRes.ok) { const d = await featRes.json(); setFeatured(d.result?.data?.json || []); }
      if (planRes.ok) { const d = await planRes.json(); setPlan(d.result?.data?.json || plan); }
    } catch {}
    setLoading(false);
  }

  async function search() {
    setLoading(true);
    try {
      const params: any = {};
      if (query) params.query = query;
      if (category) params.category = category;
      if (tier) params.tier = tier;
      const res = await fetch(`/api/trpc/mcpExplorer.list?input=${encodeURIComponent(JSON.stringify({ json: params }))}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setMcps(d.result?.data?.json?.items || []); }
    } catch {}
    setLoading(false);
  }

  async function installMcp(id: number) {
    try {
      await fetch("/api/trpc/mcpExplorer.install?batch=1", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: { registryId: id } }]),
      });
      loadAll();
    } catch {}
  }

  const tierBadge = (t: string) => {
    if (t === "free") return <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400">Free</span>;
    if (t === "pro") return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">Pro 💎</span>;
    return <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">Enterprise 🔒</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🔌 MCP Explorer</h1>
          <p className="text-gray-400 mt-1">Discover and install AI tool integrations. {plan.name} plan: {plan.maxMcpServers} max servers.</p>
        </div>
        <a href="/my-mcps" className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700">
          My MCPs ({mcps.filter(m => m.installed).length})
        </a>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Search MCP servers..." className="flex-1 px-4 py-2 bg-[#111827] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFB2]" />
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 bg-[#111827] border border-gray-700 rounded-lg text-white text-sm">
          <option value="">All Categories</option>
          <option value="developer-tools">Developer Tools</option>
          <option value="data">Data</option>
          <option value="search">Search</option>
          <option value="communication">Communication</option>
          <option value="ai">AI</option>
          <option value="automation">Automation</option>
          <option value="security">Security</option>
          <option value="productivity">Productivity</option>
          <option value="database">Database</option>
          <option value="file-management">File Management</option>
        </select>
        <select value={tier} onChange={e => setTier(e.target.value)}
          className="px-3 py-2 bg-[#111827] border border-gray-700 rounded-lg text-white text-sm">
          <option value="">All Tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <button onClick={search} className="px-4 py-2 bg-[#00FFB2] text-black rounded-lg text-sm font-medium">Search</button>
      </div>

      {/* Featured */}
      {featured.length > 0 && !query && !category && !tier && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">⭐ Featured MCP Servers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map(mcp => (
              <div key={mcp.id} className="bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{mcp.icon}</span>
                  <div>
                    <p className="text-white font-medium">{mcp.name}</p>
                    <p className="text-xs text-gray-500">{mcp.category}</p>
                  </div>
                  {tierBadge(mcp.tier)}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span>⭐ {mcp.rating}</span>
                  <span>📊 {(mcp.installCount / 1000).toFixed(1)}k installs</span>
                </div>
                {mcp.installed ? (
                  <span className="text-[#00FFB2] text-xs">✓ Installed</span>
                ) : (
                  <button onClick={() => installMcp(mcp.id)}
                    className="w-full py-1.5 bg-[#00FFB2]/10 text-[#00FFB2] border border-[#00FFB2]/30 rounded text-xs hover:bg-[#00FFB2]/20">
                    Install
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All MCPs */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">All MCP Servers ({mcps.length})</h2>
        <div className="space-y-2">
          {mcps.map(mcp => (
            <div key={mcp.id} className="bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl mt-1">{mcp.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <a href={`/mcp/${mcp.slug}`} className="text-white font-medium hover:text-[#00FFB2]">{mcp.name}</a>
                      {tierBadge(mcp.tier)}
                      <span className="text-xs text-gray-600">{mcp.author}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{mcp.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>⭐ {mcp.rating} ({mcp.reviewCount})</span>
                      <span>📊 {(mcp.installCount / 1000).toFixed(1)}k installs</span>
                      <span>🎯 {mcp.category}</span>
                      {mcp.tools && <span>🛠️ {JSON.parse(mcp.tools).length} tools</span>}
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  {mcp.installed ? (
                    <span className="text-[#00FFB2] text-sm">✓ Installed</span>
                  ) : mcp.tier === "free" || plan.name !== "free" ? (
                    <button onClick={() => installMcp(mcp.id)}
                      className="px-4 py-1.5 bg-[#00FFB2] text-black rounded text-sm font-medium hover:bg-[#00cc8e]">
                      Install
                    </button>
                  ) : (
                    <span className="text-gray-500 text-sm">Upgrade to Pro</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {mcps.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">No MCP servers found</div>
          )}
        </div>
      </div>
    </div>
  );
}
