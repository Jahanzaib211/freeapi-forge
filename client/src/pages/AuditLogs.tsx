import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ScrollText, RefreshCw, Search, Shield, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const actionColors: Record<string, string> = {
  CHAT_COMPLETION: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  UPDATE_BUDGET_LIMIT: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  UPDATE_PROVIDER: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  RESET_CIRCUIT_BREAKER: "bg-red-500/10 text-red-400 border-red-500/30",
  RESET_PROVIDER_HEALTH: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

export default function AuditLogs() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState("");
  const logsQuery = trpc.audit.list.useQuery(
    { limit: 100 },
    { refetchInterval: autoRefresh ? 10000 : false }
  );

  const logs = logsQuery.data?.logs || [];
  const total = logsQuery.data?.total || 0;

  const filtered = search
    ? logs.filter(
        (l: any) =>
          l.action?.toLowerCase().includes(search.toLowerCase()) ||
          l.userName?.toLowerCase().includes(search.toLowerCase()) ||
          l.details?.toLowerCase().includes(search.toLowerCase()) ||
          l.teamName?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const exportCSV = () => {
    const header = "Timestamp,Action,User,Team,Details\n";
    const rows = logs.map((l: any) =>
      `"${new Date(l.createdAt).toISOString()}","${l.action}","${l.userName || '-'}","${l.teamName || '-'}","${(l.details || '').replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Audit Logs
            </h1>
            <p className="text-slate-400 mt-1">
              {total} total events · tracking all system actions
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(autoRefresh && "border-green-600/50 text-green-400")}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")} />
              {autoRefresh ? "Live" : "Paused"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => logsQuery.refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {["CHAT_COMPLETION", "UPDATE_BUDGET_LIMIT", "UPDATE_PROVIDER", "RESET_CIRCUIT_BREAKER"].map((action) => {
            const count = logs.filter((l: any) => l.action === action).length;
            return (
              <Card key={action} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 truncate max-w-[120px]">{action.replace(/_/g, " ")}</span>
                    <span className="text-2xl font-bold text-white">{count}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by action, user, team, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-800"
          />
        </div>

        {/* Table */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-0">
            {logsQuery.isLoading ? (
              <div className="text-center py-20 text-slate-500">Loading audit logs...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No audit logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                      <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                      <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                      <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Team</th>
                      <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log: any) => (
                      <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <Badge className={cn("text-[10px] border", actionColors[log.action] || "bg-slate-500/10 text-slate-400 border-slate-500/30")}>
                            {log.action?.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-slate-300">{log.userName || "-"}</td>
                        <td className="p-3 text-xs text-slate-300">{log.teamName || "-"}</td>
                        <td className="p-3 text-xs text-slate-400 max-w-[300px] truncate">
                          {log.details || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
