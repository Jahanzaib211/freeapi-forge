import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Rocket, RefreshCw, CheckCircle2, XCircle, Clock, SkipForward,
  AlertTriangle, Bell, Eye, EyeOff, Trash2, GitBranch, Timer, User, Hash,
  ArrowUpRight,
} from "lucide-react";

interface Run {
  id: number; runId: number; runNumber: number | null;
  repoFullName: string; workflowName: string;
  status: string; conclusion: string | null;
  event: string | null; branch: string | null;
  commitSha: string | null; commitMessage: string | null;
  actor: string | null; durationMs: number;
  startedAt: string | null; completedAt: string | null;
  jobsJson: string | null; htmlUrl: string | null;
}

interface Alert {
  id: number; runId: number; alertType: string;
  severity: string; message: string; isRead: number;
  dismissedAt: string | null; createdAt: string;
}

interface Health {
  totalRuns: number; successRate: number; avgDurationMs: number;
  lastDeployStatus: string | null; lastDeployTime: string | null;
  failureCount: number; unreadAlerts: number;
}

interface TimelinePoint {
  runId: number; runNumber: number | null;
  conclusion: string | null; workflowName: string;
  startedAt: string | null; durationMs: number;
}

export default function DeploymentMonitor() {
  const { getToken } = useAuth();
  const token = getToken();

  const [runs, setRuns] = useState<Run[]>([]);
  const [totalRuns, setTotalRuns] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [repo, setRepo] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hasTokenConfigured, setHasTokenConfigured] = useState(false);

  const [tokenInput, setTokenInput] = useState("");
  const [expandedRun, setExpandedRun] = useState<number | null>(null);

  const apiHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const callTrpc = useCallback(async (path: string, input?: any, method = "GET") => {
    try {
      const res = input
        ? await fetch(`/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`, { headers: { Authorization: `Bearer ${token}` } })
        : await fetch(`/api/trpc/${path}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const d = await res.json();
      return d.result?.data?.json ?? d.result?.data ?? null;
    } catch { return null; }
  }, [token]);

  const loadHealth = useCallback(async () => {
    const h = await callTrpc("githubActions.getDeploymentHealth");
    if (h) setHealth(h);
    const t = await callTrpc("githubActions.hasToken");
    setHasTokenConfigured(!!t);
  }, [callTrpc]);

  const loadRuns = useCallback(async () => {
    const data = await callTrpc("githubActions.listRuns", {
      repo: repo || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
      perPage: 20,
    });
    if (data) { setRuns(data.runs || []); setTotalRuns(data.total || 0); }
  }, [callTrpc, repo, statusFilter, page]);

  const loadAlerts = useCallback(async () => {
    const data = await callTrpc("githubActions.getAlerts", { unreadOnly: false });
    if (data) setAlerts(data);
  }, [callTrpc]);

  const loadTimeline = useCallback(async () => {
    const data = await callTrpc("githubActions.getRunTimeline", { repo: repo || undefined });
    if (data) setTimeline(data);
  }, [callTrpc, repo]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadHealth(), loadRuns(), loadAlerts(), loadTimeline()]);
    setLoading(false);
  }, [loadHealth, loadRuns, loadAlerts, loadTimeline]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function doSync() {
    if (!repo) return;
    setSyncing(true);
    try {
      await fetch("/api/trpc/githubActions.syncRuns?batch=1", {
        method: "POST", headers: apiHeaders,
        body: JSON.stringify([{ json: { repo, count: 20 } }]),
      });
      await loadAll();
    } catch {}
    setSyncing(false);
  }

  async function saveToken() {
    if (!tokenInput) return;
    await fetch("/api/trpc/githubActions.saveToken?batch=1", {
      method: "POST", headers: apiHeaders,
      body: JSON.stringify([{ json: { token: tokenInput } }]),
    });
    setHasTokenConfigured(true);
    setTokenInput("");
  }

  async function markRead(alertId: number) {
    await fetch("/api/trpc/githubActions.markAlertRead?batch=1", {
      method: "POST", headers: apiHeaders,
      body: JSON.stringify([{ json: { alertId } }]),
    });
    loadAlerts();
  }

  async function dismissAlert(alertId: number) {
    await fetch("/api/trpc/githubActions.dismissAlert?batch=1", {
      method: "POST", headers: apiHeaders,
      body: JSON.stringify([{ json: { alertId } }]),
    });
    loadAlerts();
  }

  async function markAllRead() {
    await fetch("/api/trpc/githubActions.markAllAlertsRead?batch=1", {
      method: "POST", headers: apiHeaders,
    });
    loadAlerts();
  }

  const conclusionBadge = (c: string | null) => {
    if (c === "success") return <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Passed</Badge>;
    if (c === "failure") return <Badge className="bg-red-500/10 text-red-400 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
    if (c === "cancelled") return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><SkipForward className="w-3 h-3 mr-1" /> Cancelled</Badge>;
    if (c === "skipped") return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20"><SkipForward className="w-3 h-3 mr-1" /> Skipped</Badge>;
    return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> {c || "running"}</Badge>;
  };

  const statusDot = (c: string | null) => {
    if (c === "success") return <div className="w-2.5 h-2.5 rounded-full bg-green-500" />;
    if (c === "failure") return <div className="w-2.5 h-2.5 rounded-full bg-red-500" />;
    if (!c || c === "queued" || c === "in_progress") return <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />;
    return <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const severityIcon = (s: string) => {
    if (s === "critical") return <XCircle className="w-5 h-5 text-red-400" />;
    if (s === "warning") return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <Bell className="w-5 h-5 text-blue-400" />;
  };

  const severityBadge = (s: string) => {
    if (s === "critical") return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Critical</Badge>;
    if (s === "warning") return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Warning</Badge>;
    return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Info</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Deployments</h1>
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deployments</h1>
          <p className="text-muted-foreground mt-1">Monitor GitHub Actions workflow runs and deployment health</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-card border border-border p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Rocket className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="runs" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <GitBranch className="w-4 h-4 mr-2" /> Workflow Runs
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Bell className="w-4 h-4 mr-2" /> Alerts {health?.unreadAlerts ? `(${health.unreadAlerts})` : ""}
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: OVERVIEW ─────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {!hasTokenConfigured && (
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="py-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-foreground font-medium">GitHub token not configured</p>
                  <p className="text-muted-foreground text-sm">Add a GitHub token in the Settings tab to monitor deployment activity.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
                      <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2"
                        stroke={health && health.successRate >= 80 ? "#22c55e" : health && health.successRate >= 50 ? "#eab308" : "#ef4444"}
                        strokeDasharray={`${((health?.successRate || 0) / 100) * 97.4} 97.4`}
                        strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
                      {health?.successRate ?? 0}%
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{health?.totalRuns ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Total Runs (last 20)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Avg Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-muted-foreground" />
                  <span className="text-2xl font-bold text-foreground">{health ? formatDuration(health.avgDurationMs) : "--"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Failures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-2xl font-bold text-foreground">{health?.failureCount ?? 0}</span>
                  <span className="text-xs text-muted-foreground">of last {health?.totalRuns ?? 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Last Deploy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {health?.lastDeployStatus === "success"
                    ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                    : health?.lastDeployStatus === "failure"
                      ? <XCircle className="w-5 h-5 text-red-400" />
                      : <Clock className="w-5 h-5 text-muted-foreground" />}
                  <span className="font-medium text-foreground">
                    {health?.lastDeployStatus ? health.lastDeployStatus.charAt(0).toUpperCase() + health.lastDeployStatus.slice(1) : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Run Timeline (last {timeline.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No runs yet. Sync a repository to see the timeline.</p>
              ) : (
                <div className="flex items-end gap-1 h-24 overflow-x-auto pb-2">
                  {timeline.map((t, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 min-w-[20px] group relative" title={`${t.workflowName} #${t.runNumber}: ${t.conclusion || "running"}`}>
                      <div
                        className={`w-3 h-12 rounded-sm transition-colors cursor-pointer ${t.conclusion === "success" ? "bg-green-500/70" : t.conclusion === "failure" ? "bg-red-500/70" : "bg-yellow-500/70"}`}
                        style={{ height: Math.max(8, Math.min(48, (t.durationMs / 300000) * 48)) }}
                      />
                      <span className="text-[10px] text-muted-foreground">{t.runNumber}</span>
                      <div className="absolute bottom-full mb-1 hidden group-hover:block bg-card border border-border text-foreground text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                        {t.workflowName} #{t.runNumber}: {t.conclusion || "running"} - {formatDuration(t.durationMs)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: WORKFLOW RUNS ────────────────────────────────────────── */}
        <TabsContent value="runs" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              placeholder="e.g. Jahanzaib211/forge-studio"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              className="w-72 bg-card border-border"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-card border-border">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={doSync} disabled={syncing || !repo} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> Sync
            </Button>
          </div>

          {runs.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Rocket className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No workflow runs found. Enter a repository and click Sync.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Run #</TableHead>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Triggered By</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map(run => (
                      <>
                        <TableRow
                          key={run.id}
                          className="cursor-pointer hover:bg-card/50"
                          onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                        >
                          <TableCell>{statusDot(run.conclusion)}</TableCell>
                          <TableCell className="font-mono text-xs">#{run.runNumber}</TableCell>
                          <TableCell className="font-medium">{run.workflowName}</TableCell>
                          <TableCell>{conclusionBadge(run.conclusion)}</TableCell>
                          <TableCell>
                            {run.branch ? <Badge variant="outline" className="text-xs"><GitBranch className="w-3 h-3 mr-1" />{run.branch}</Badge> : "--"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDuration(run.durationMs)}</TableCell>
                          <TableCell>
                            {run.actor ? (
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <User className="w-3 h-3" /> {run.actor}
                              </span>
                            ) : "--"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {run.startedAt ? new Date(run.startedAt).toLocaleString() : "--"}
                          </TableCell>
                          <TableCell>
                            {run.htmlUrl && (
                              <a href={run.htmlUrl} target="_blank" rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={e => e.stopPropagation()}>
                                <ArrowUpRight className="w-4 h-4" />
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedRun === run.id && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-card/30 p-4">
                              <div className="space-y-2">
                                {run.commitMessage && (
                                  <div>
                                    <span className="text-xs text-muted-foreground">Commit:</span>
                                    <span className="text-sm text-foreground ml-2 font-mono">{run.commitMessage}</span>
                                  </div>
                                )}
                                {run.commitSha && (
                                  <div>
                                    <span className="text-xs text-muted-foreground">SHA:</span>
                                    <code className="text-xs bg-border/30 px-1.5 py-0.5 rounded ml-2">{run.commitSha.slice(0, 7)}</code>
                                  </div>
                                )}
                                {run.jobsJson ? (
                                  <div className="mt-3 space-y-2">
                                    <span className="text-xs font-medium text-muted-foreground">Jobs:</span>
                                    {(() => {
                                      try {
                                        const jobs = JSON.parse(run.jobsJson);
                                        return jobs.map((job: any, i: number) => (
                                          <div key={i} className="flex items-center gap-2 pl-4">
                                            {job.conclusion === "success" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                                            <span className="text-sm text-foreground">{job.name}</span>
                                            <span className="text-xs text-muted-foreground">({formatDuration(new Date(job.completed_at).getTime() - new Date(job.started_at).getTime())})</span>
                                          </div>
                                        ));
                                      } catch { return <span className="text-sm text-muted-foreground">Unable to parse jobs data</span>; }
                                    })()}
                                    <Button variant="ghost" size="sm" className="text-xs mt-1"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await fetch("/api/trpc/githubActions.syncRunJobs?batch=1", {
                                          method: "POST", headers: apiHeaders,
                                          body: JSON.stringify([{ json: { repo: run.repoFullName, runId: run.runId } }]),
                                        });
                                        loadRuns();
                                      }}>
                                      <RefreshCw className="w-3 h-3 mr-1" /> Refresh Jobs
                                    </Button>
                                  </div>
                                ) : (
                                  <Button variant="ghost" size="sm" className="text-xs"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await fetch("/api/trpc/githubActions.syncRunJobs?batch=1", {
                                        method: "POST", headers: apiHeaders,
                                        body: JSON.stringify([{ json: { repo: run.repoFullName, runId: run.runId } }]),
                                      });
                                      loadRuns();
                                    }}>
                                    <RefreshCw className="w-3 h-3 mr-1" /> Load Jobs
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {totalRuns > 20 && (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} ({(page-1)*20 + 1}-{Math.min(page*20, totalRuns)} of {totalRuns})</span>
              <Button variant="outline" size="sm" disabled={page * 20 >= totalRuns} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 3: ALERTS ───────────────────────────────────────────────── */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {alerts.filter(a => !a.isRead).length} unread, {alerts.length} total
            </p>
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <Eye className="w-4 h-4 mr-2" /> Mark All Read
            </Button>
          </div>

          {alerts.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400 opacity-30" />
                <p>No alerts. All deployments are healthy!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <Card key={alert.id} className={`border-border ${!alert.isRead ? "border-l-2 border-l-red-500" : "opacity-60"}`}>
                  <CardContent className="py-4 flex items-start gap-3">
                    {severityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {severityBadge(alert.severity)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{alert.message}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!alert.isRead && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markRead(alert.id)} title="Mark as read">
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => dismissAlert(alert.id)} title="Dismiss">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 4: SETTINGS ──────────────────────────────────────────────── */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>GitHub Token</CardTitle>
              <CardDescription>Personal access token with `repo` and `actions:read` scopes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  className="flex-1 bg-card border-border"
                />
                <Button onClick={saveToken} disabled={!tokenInput}>
                  {hasTokenConfigured ? "Update Token" : "Save Token"}
                </Button>
              </div>
              {hasTokenConfigured && (
                <p className="text-sm text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Token configured
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Create a token at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">github.com/settings/tokens</a>.
                Required scopes: <code className="text-xs bg-border/30 px-1 rounded">repo</code> (for private repos) or <code className="text-xs bg-border/30 px-1 rounded">public_repo</code> (for public repos only).
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
              <CardDescription>Manually sync workflow runs for a repository.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="owner/repo (e.g. Jahanzaib211/forge-studio)"
                  value={repo}
                  onChange={e => setRepo(e.target.value)}
                  className="flex-1 bg-card border-border"
                />
                <Button variant="outline" onClick={doSync} disabled={syncing || !repo} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                  Sync Runs
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Fetches the last 20 workflow runs and generates alerts for any failures.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
