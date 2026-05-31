import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function WorkflowMonitor() {
  const { getToken } = useAuth();
  const token = getToken();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [nodeRuns, setNodeRuns] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/trpc/workflowRouter.list", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setWorkflows(d.result?.data?.json || []); }
    } catch {}
  }

  async function loadRuns(wfId: number) {
    try {
      const res = await fetch(`/api/trpc/workflowRouter.runs?input=${encodeURIComponent(JSON.stringify({ json: { workflowId: wfId } }))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { const d = await res.json(); setRuns(d.result?.data?.json || []); }
    } catch {}
  }

  async function loadRunDetail(runId: number) {
    try {
      const res = await fetch(`/api/trpc/workflowRouter.runDetail?input=${encodeURIComponent(JSON.stringify({ json: { runId } }))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        const data = d.result?.data?.json || {};
        setSelectedRun(data.run);
        setNodeRuns(data.nodes || []);
      }
    } catch {}
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { success: "text-green-500 bg-green-500/10 border-green-500/30", failed: "text-red-500 bg-red-500/10 border-red-500/30", running: "text-blue-500 bg-blue-500/10 border-blue-500/30 animate-pulse", pending: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30" };
    return <span className={`px-2 py-0.5 text-xs rounded border ${colors[s] || "text-muted-foreground bg-muted border-border"}`}>{s}</span>;
  };

  const activeWf = workflows.filter(w => w.status === "active").length;
  const pausedWf = workflows.filter(w => w.status === "paused").length;
  const failedWf = workflows.filter(w => w.status === "archived").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">⚡ Workflow Monitor</h1>
          <p className="text-muted-foreground mt-1">Monitor execution runs and health</p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Refresh</button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-500">{activeWf}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Paused</p>
          <p className="text-2xl font-bold text-yellow-500">{pausedWf}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Errored</p>
          <p className="text-2xl font-bold text-red-500">{failedWf}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow list */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">Workflows</h2>
          <div className="space-y-2">
            {workflows.map(wf => (
              <div key={wf.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer" onClick={() => loadRuns(wf.id)}>
                <div>
                  <p className="text-sm text-foreground font-medium">{wf.name}</p>
                  <p className="text-xs text-muted-foreground">{wf.triggerType} · {wf.totalRuns} runs</p>
                </div>
                {statusBadge(wf.status)}
              </div>
            ))}
            {workflows.length === 0 && <p className="text-muted-foreground text-sm">No workflows yet</p>}
          </div>
        </div>

        {/* Run list */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">Recent Runs</h2>
          <div className="space-y-2 overflow-y-auto max-h-96">
            {runs.map(run => (
              <div key={run.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer" onClick={() => loadRunDetail(run.id)}>
                <div>
                  <p className="text-xs text-foreground">{new Date(run.startedAt).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{run.triggerType} · {run.completedNodes}/{run.totalNodes} nodes</p>
                </div>
                {statusBadge(run.status)}
              </div>
            ))}
            {runs.length === 0 && <p className="text-muted-foreground text-sm">No runs yet</p>}
          </div>
        </div>

        {/* Run detail */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">Run Detail</h2>
          {selectedRun ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Status</span>
                {statusBadge(selectedRun.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trigger</span>
                <span className="text-sm text-foreground">{selectedRun.triggerType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm text-foreground">{(selectedRun.durationMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cost</span>
                <span className="text-sm text-foreground">${(selectedRun.costUsd / 1_000_000).toFixed(4)}</span>
              </div>
              {selectedRun.error && <p className="text-xs text-red-500 mt-2">{selectedRun.error}</p>}

              <h3 className="text-sm font-medium text-foreground mt-4 mb-2">Node Execution Chain</h3>
              <div className="space-y-1">
                {nodeRuns.map(nr => (
                  <div key={nr.id} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                    <div className={`w-2 h-2 rounded-full ${nr.status === "success" ? "bg-green-500" : nr.status === "failed" ? "bg-red-500" : nr.status === "running" ? "bg-blue-500 animate-pulse" : "bg-yellow-500"}`} />
                    <span className="text-foreground flex-1 truncate">{nr.nodeName || nr.nodeId}</span>
                    {statusBadge(nr.status)}
                    {nr.durationMs > 0 && <span className="text-muted-foreground">{nr.durationMs}ms</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Select a run to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
