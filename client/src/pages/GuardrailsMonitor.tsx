import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, XCircle, Activity, RefreshCw, Loader2 } from "lucide-react";

export default function GuardrailsMonitor() {
  const eventsQuery = trpc.guardrails.guardrails.monitorEvents.useQuery(
    { limit: 50 },
    { refetchInterval: 10000 }
  );

  const data = eventsQuery.data;
  const totalChecks = data?.totalChecks || 0;
  const totalBlocks = data?.blocks || 0;
  const totalWarnings = data?.warnings || 0;
  const passRate = data?.passRate || 100;
  const events = data?.events || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Guardrails Monitor
            </h1>
            <p className="text-slate-400 mt-1">Live guardrail execution results and policy enforcement</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => eventsQuery.refetch()} disabled={eventsQuery.isFetching}>
            <RefreshCw className={eventsQuery.isFetching ? "animate-spin h-4 w-4 mr-2" : "h-4 w-4 mr-2"} />
            Refresh
          </Button>
        </div>

        {eventsQuery.isLoading ? (
          <div className="text-center py-20 text-slate-500">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin opacity-30" />
            <p>Loading guardrail data...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Total Checks</span>
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{totalChecks}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Blocks</span>
                    <XCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{totalBlocks}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Warnings</span>
                    <Shield className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{totalWarnings}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Pass Rate</span>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{passRate}%</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <CardTitle className="text-sm">Recent Guardrail Events</CardTitle>
                </div>
                <CardDescription>Last {events.length} guardrail check results</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {events.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>No guardrail events yet</p>
                    <p className="text-xs mt-1">Events will appear when guardrails process requests</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Time</th>
                          <th className="text-left p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Source</th>
                          <th className="text-left p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Level</th>
                          <th className="text-left p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((e: any) => (
                          <tr key={e.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                              {new Date(e.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="p-3 text-xs text-slate-300 max-w-[150px] truncate">{e.source}</td>
                            <td className="p-3">
                              <Badge className={
                                e.level === "error" ? "text-[10px] bg-red-500/10 text-red-400 border-red-500/30" :
                                e.level === "warn" ? "text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                                "text-[10px] bg-slate-500/10 text-slate-400 border-slate-500/30"
                              }>
                                {e.level}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs text-slate-400 max-w-[300px] truncate">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
