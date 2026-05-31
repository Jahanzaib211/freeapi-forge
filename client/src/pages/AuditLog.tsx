import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

interface AuditEntry {
  id: number;
  userId: number | null;
  teamId: number | null;
  action: string;
  details: string | null;
  createdAt: string;
}

export default function AuditLogPage() {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const token = getToken();

  useEffect(() => {
    loadLogs();
  }, [page, filter]);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        input: JSON.stringify({
          json: { limit: 50, offset: page * 50 },
        }),
      });
      const res = await fetch(`/api/trpc/audit.list?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.result?.data?.json?.items || data.result?.data?.json || [];
        setLogs(Array.isArray(items) ? items : []);
      }
    } catch {}
    setLoading(false);
  }

  const filtered = filter
    ? logs.filter(l => l.action.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-gray-400 mt-1">Immutable record of all system actions</p>
        </div>
        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-[#00FFB2] text-black font-medium rounded-lg text-sm hover:bg-[#00cc8e]"
        >
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by action..."
          className="flex-1 max-w-md px-4 py-2 bg-[#111827] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFB2]"
        />
        <span className="text-gray-500 text-sm self-center">{filtered.length} entries</span>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs text-gray-400 uppercase tracking-wider p-4">Time</th>
              <th className="text-left text-xs text-gray-400 uppercase tracking-wider p-4">Action</th>
              <th className="text-left text-xs text-gray-400 uppercase tracking-wider p-4">User</th>
              <th className="text-left text-xs text-gray-400 uppercase tracking-wider p-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">No audit entries found</td>
              </tr>
            ) : (
              filtered.map(log => (
                <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                  <td className="p-4 text-sm text-gray-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {log.userId || "system"}
                  </td>
                  <td className="p-4 text-sm text-gray-500 max-w-xs truncate">
                    {log.details || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-3 py-1 bg-gray-800 text-white rounded text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-3 py-1 text-gray-400 text-sm">Page {page + 1}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={filtered.length < 50}
          className="px-3 py-1 bg-gray-800 text-white rounded text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
