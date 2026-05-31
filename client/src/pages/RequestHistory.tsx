import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Filter, Search, History } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function RequestHistory() {
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const requestsQuery = trpc.requests.list.useQuery(
    { teamId: "default", limit, offset },
    { refetchInterval: 5000 }
  );

  const requests = requestsQuery.data?.requests || [];
  const total = requestsQuery.data?.total || 0;

  const filteredRequests = requests.filter(req =>
    req.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.taskType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ["ID", "Provider", "Task Type", "Tokens", "Cost (USD)", "Status", "Timestamp"];
    const rows = filteredRequests.map(req => [
      req.id,
      req.provider,
      req.taskType,
      req.tokens,
      req.costUsd.toFixed(6),
      req.status,
      new Date(req.timestamp).toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `request_history_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Request History</h1>
            <p className="text-slate-400 text-lg">Complete audit log of all LLM requests</p>
          </div>
          <Button
            onClick={exportToCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by provider, task type, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              <Select value={limit.toString()} onValueChange={(v) => {
                setLimit(parseInt(v));
                setOffset(0);
              }}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Request Log
                </CardTitle>
                <CardDescription>
                  Showing {filteredRequests.length} of {total} requests
                </CardDescription>
              </div>
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/50">
                {total} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">ID</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Provider</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Task Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Tokens</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Cost (USD)</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 text-sm text-slate-400 font-mono">{req.id.slice(0, 8)}...</td>
                      <td className="p-4">
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          {req.provider}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-300">{req.taskType}</td>
                      <td className="p-4 text-sm text-slate-300">{req.tokens.toLocaleString()}</td>
                      <td className="p-4 text-sm text-slate-300">${req.costUsd.toFixed(6)}</td>
                      <td className="p-4">
                        <Badge
                          className={
                            req.status === "success"
                              ? "bg-green-600/20 text-green-400 border-green-600/50"
                              : "bg-red-600/20 text-red-400 border-red-600/50"
                          }
                        >
                          {req.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {new Date(req.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-700/50">
                <div className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
