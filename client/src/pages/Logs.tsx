import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Logs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const requestsQuery = trpc.requests.list.useQuery({ teamId: "default", limit: 50, offset: 0 }, { refetchInterval: 10000 });

  const requests = requestsQuery.data?.requests ?? [];

  const filteredRequests = requests.filter((r: any) => {
    const matchesSearch = r.id.toLowerCase().includes(searchQuery.toLowerCase()) || r.taskType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesModel = modelFilter === "all" || r.provider === modelFilter;
    return matchesSearch && matchesStatus && matchesModel;
  });

  const exportCSV = () => {
    const headers = ["ID", "Provider", "Task Type", "Tokens", "Cost", "Status", "Timestamp"];
    const rows = filteredRequests.map((r: any) => [r.id, r.provider, r.taskType, r.tokens, r.costUsd, r.status, r.timestamp]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "request-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Logs</h1>
            <p className="text-slate-400 text-lg">Request history and audit trail</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="bg-slate-800/30 border-slate-700/50 text-white pl-10 backdrop-blur"
            />
          </div>
          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-40 bg-slate-800/30 border-slate-700/50 text-white backdrop-blur">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all">All Models</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="meta">Meta</SelectItem>
              <SelectItem value="mistral">Mistral</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-slate-800/30 border-slate-700/50 text-white backdrop-blur">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardContent className="p-0">
            {requestsQuery.isLoading ? (
              <div className="flex justify-center p-12"><Activity className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-slate-300">Timestamp</TableHead>
                    <TableHead className="text-slate-300">Model</TableHead>
                    <TableHead className="text-slate-300">Tokens</TableHead>
                    <TableHead className="text-slate-300">Cost</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req: any) => (
                    <>
                      <TableRow
                        key={req.id}
                        className="border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === req.id ? null : req.id)}
                      >
                        <TableCell>
                          {expandedRow === req.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          <Clock className="w-3 h-3 inline mr-1 text-slate-500" />
                          {new Date(req.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-white font-medium">{req.provider}</TableCell>
                        <TableCell className="text-slate-300">{req.tokens?.toLocaleString()}</TableCell>
                        <TableCell className="text-slate-300">${req.costUsd?.toFixed(4)}</TableCell>
                        <TableCell>
                          <Badge className={req.status === "success" ? "bg-green-600/20 text-green-400 border-green-600/50" : "bg-red-600/20 text-red-400 border-red-600/50"}>
                            {req.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {expandedRow === req.id && (
                        <TableRow key={`${req.id}-detail`} className="border-slate-700/50">
                          <TableCell colSpan={6} className="bg-slate-900/50 p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-400 block mb-1">Request ID</span>
                                <span className="text-white font-mono">{req.id}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-1">Task Type</span>
                                <span className="text-white">{req.taskType}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-1">Provider</span>
                                <span className="text-white">{req.provider}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-1">Status</span>
                                <Badge className={req.status === "success" ? "bg-green-600/20 text-green-400 border-green-600/50" : "bg-red-600/20 text-red-400 border-red-600/50"}>
                                  {req.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-4">
                              <span className="text-slate-400 block mb-1 text-sm">Full Request Details</span>
                              <pre className="bg-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-x-auto">
{JSON.stringify({
  id: req.id,
  model: req.provider,
  taskType: req.taskType,
  tokens: req.tokens,
  costUsd: req.costUsd,
  status: req.status,
  timestamp: req.timestamp,
}, null, 2)}
                              </pre>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                  {filteredRequests.length === 0 && (
                    <TableRow className="border-slate-700/50">
                      <TableCell colSpan={6} className="text-center text-slate-400 py-8">No logs found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
