import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

interface AgentRun {
  id: number;
  agentId: number;
  trigger: string;
  status: string;
  steps: number;
  toolCalls: string | null;
  totalCost: number;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

interface Approval {
  id: number;
  agentRunId: number;
  toolName: string;
  params: string | null;
  status: string;
  createdAt: string;
}

export default function AgentActivity() {
  const { getToken } = useAuth();
  const token = getToken();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [runsRes, appRes] = await Promise.all([
        fetch(`/api/trpc/agentBuilder.list?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/trpc/agentBuilder.getPendingApprovals?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (runsRes.ok) {
        const data = await runsRes.json();
        const agents = data.result?.data?.json || [];
        // Get runs for first agent
        if (agents.length > 0) {
          const runRes = await fetch(
            `/api/trpc/agentBuilder.getRuns?input=${encodeURIComponent(JSON.stringify({ json: { agentId: agents[0].id } }))}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (runRes.ok) {
            const runData = await runRes.json();
            setRuns(runData.result?.data?.json || []);
          }
        }
      }
      if (appRes.ok) {
        const data = await appRes.json();
        setApprovals(data.result?.data?.json || []);
      }
    } catch {}
  }

  async function approveTool(id: number, approved: boolean) {
    try {
      await fetch("/api/trpc/agentBuilder.approveTool?batch=1", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: { id, approved } }]),
      });
      loadData();
    } catch {}
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Activity</h1>
          <p className="text-gray-400 mt-1">Run history, approvals, and live execution traces</p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-[#00FFB2] text-black rounded-lg text-sm font-medium hover:bg-[#00cc8e]">
          Refresh
        </button>
      </div>

      {/* Pending Approvals */}
      {approvals.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-yellow-400 mb-3">⏳ Pending Approvals ({approvals.length})</h2>
          <div className="space-y-2">
            {approvals.map(ap => (
              <div key={ap.id} className="flex items-center justify-between bg-[#0a0a0f] rounded-lg p-3">
                <div>
                  <p className="text-white text-sm font-medium">{ap.toolName}</p>
                  <p className="text-gray-500 text-xs">{ap.params}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveTool(ap.id, true)}
                    className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs">Approve</button>
                  <button onClick={() => approveTool(ap.id, false)}
                    className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs">Deny</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run History */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Run History</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800/50">
              <th className="text-left text-xs text-gray-400 uppercase p-4">Time</th>
              <th className="text-left text-xs text-gray-400 uppercase p-4">Trigger</th>
              <th className="text-left text-xs text-gray-400 uppercase p-4">Status</th>
              <th className="text-left text-xs text-gray-400 uppercase p-4">Steps</th>
              <th className="text-left text-xs text-gray-400 uppercase p-4">Cost</th>
              <th className="text-left text-xs text-gray-400 uppercase p-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(run => (
              <tr key={run.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 cursor-pointer"
                onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}>
                <td className="p-4 text-sm text-gray-400">{new Date(run.startedAt).toLocaleString()}</td>
                <td className="p-4 text-sm text-gray-400">{run.trigger}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    run.status === "success" ? "bg-green-500/10 text-green-400" :
                    run.status === "failed" ? "bg-red-500/10 text-red-400" :
                    run.status === "timeout" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-blue-500/10 text-blue-400"
                  }`}>{run.status}</span>
                </td>
                <td className="p-4 text-sm text-gray-400">{run.steps}</td>
                <td className="p-4 text-sm text-gray-400">${(run.totalCost / 1_000_000).toFixed(4)}</td>
                <td className="p-4 text-sm text-gray-500 max-w-xs truncate">{run.error || "-"}</td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No runs yet. Create and trigger an agent.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Run Detail Panel */}
      {selectedRun && selectedRun.toolCalls && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Step-by-Step Trace</h2>
          <div className="space-y-3">
            {(() => {
              try {
                const calls = JSON.parse(selectedRun.toolCalls);
                return calls.map((tc: any, i: number) => (
                  <div key={i} className="bg-[#0a0a0f] border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-[#00FFB2] font-mono">Step {i + 1}</span>
                      <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded">{tc.name}</span>
                      {tc.duration && <span className="text-xs text-gray-500">{tc.duration}ms</span>}
                    </div>
                    {tc.params && Object.keys(tc.params).length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Params:</p>
                        <pre className="text-xs text-gray-400 font-mono bg-gray-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(tc.params, null, 2)}
                        </pre>
                      </div>
                    )}
                    {tc.result && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Result:</p>
                        <pre className="text-xs text-gray-400 font-mono bg-gray-900 p-2 rounded overflow-x-auto max-h-32">
                          {tc.result.slice(0, 500)}
                        </pre>
                      </div>
                    )}
                    {tc.error && <p className="text-xs text-red-400 mt-1">Error: {tc.error}</p>}
                  </div>
                ));
              } catch { return <p className="text-gray-500 text-sm">Raw trace: {selectedRun.toolCalls?.slice(0, 500)}</p>; }
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
