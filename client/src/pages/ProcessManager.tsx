import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Server,
  RefreshCw,
  Play,
  Square,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

function formatUptime(ms: number): string {
  if (!ms) return "—";
  const seconds = Math.floor((Date.now() - ms) / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ProcessManager() {
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logLines, setLogLines] = useState(50);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const logsQuery = trpc.systemMonitor.pm2.logs.useQuery(
    { name: selectedLog || "", lines: logLines },
    { enabled: !!selectedLog }
  );

  const listQuery = trpc.systemMonitor.pm2.list.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const utils = trpc.useUtils();

  const restartMut = trpc.systemMonitor.pm2.restart.useMutation({
    onSuccess: () => utils.systemMonitor.pm2.list.invalidate(),
  });
  const stopMut = trpc.systemMonitor.pm2.stop.useMutation({
    onSuccess: () => utils.systemMonitor.pm2.list.invalidate(),
  });
  const startMut = trpc.systemMonitor.pm2.start.useMutation({
    onSuccess: () => utils.systemMonitor.pm2.list.invalidate(),
  });
  const deleteMut = trpc.systemMonitor.pm2.delete.useMutation({
    onSuccess: () => {
      utils.systemMonitor.pm2.list.invalidate();
      setDeleteTarget(null);
    },
  });
  const processes = listQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              Process Manager
            </h1>
            <p className="text-slate-400 text-lg">PM2 process management</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => listQuery.refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => listQuery.refetch()}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mb-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider p-4">Name</th>
                    <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider p-4">Status</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider p-4">CPU</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider p-4">Memory</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider p-4">Restarts</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider p-4">Uptime</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider p-4">PID</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((proc: any) => (
                    <tr
                      key={proc.name}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Server className="w-3 h-3 text-slate-400" />
                          <span className="text-sm text-white font-medium">{proc.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={
                            proc.status === "online"
                              ? "bg-green-600/20 text-green-400 border-green-600/50"
                              : "bg-red-600/20 text-red-400 border-red-600/50"
                          }
                        >
                          {proc.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right text-xs text-white font-mono">
                        {proc.cpu?.toFixed(1) || "0"}%
                      </td>
                      <td className="p-4 text-right text-xs text-white font-mono">
                        {proc.memory ? `${(proc.memory / 1024 / 1024).toFixed(1)} MB` : "—"}
                      </td>
                      <td className="p-4 text-right text-xs text-slate-300">{proc.restarts || 0}</td>
                      <td className="p-4 text-right text-xs text-slate-400">{formatUptime(proc.uptime)}</td>
                      <td className="p-4 text-right text-xs text-slate-400 font-mono">{proc.pid}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          {proc.status === "online" ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
                                onClick={() => restartMut.mutate(proc.name)}
                                disabled={restartMut.isPending}
                                title="Restart"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
                                onClick={() => stopMut.mutate(proc.name)}
                                disabled={stopMut.isPending}
                                title="Stop"
                              >
                                <Square className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-900/20"
                              onClick={() => startMut.mutate(proc.name)}
                              disabled={startMut.isPending}
                              title="Start"
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                            onClick={() => setSelectedLog(proc.name)}
                            title="View Logs"
                          >
                            <FileText className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => setDeleteTarget(proc.name)}
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {processes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 text-sm">
                        No processes running
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Log Viewer Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Logs — {selectedLog}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Last {logLines} lines of output
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 mb-3">
              <Input
                type="number"
                value={logLines}
                onChange={(e) => setLogLines(Number(e.target.value) || 50)}
                className="w-24 bg-slate-700 border-slate-600 text-white"
                min={10}
                max={500}
              />
              <span className="text-xs text-slate-400">lines</span>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 max-h-[50vh] overflow-auto font-mono text-xs text-slate-300">
              {logsQuery.isLoading ? (
                <p className="text-slate-500">Loading logs...</p>
              ) : logsQuery.data && logsQuery.data.length > 0 ? (
                <pre className="whitespace-pre-wrap">{logsQuery.data.map((log: any) => log.message).join("\n")}</pre>
              ) : (
                <p className="text-slate-500">No logs available. Select a process and click View Logs.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Delete Process</DialogTitle>
              <DialogDescription className="text-slate-400">
                Are you sure you want to delete <strong className="text-white">{deleteTarget}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteTarget && deleteMut.mutate({ name: deleteTarget })}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
