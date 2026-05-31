import { useState, useEffect, useCallback, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type EventLevel = "error" | "warn" | "info" | "debug";

interface SystemEvent {
  id: number;
  level: string;
  source: string;
  message: string;
  stackTrace: string | null;
  metadata: string | null;
  createdAt: Date | string;
}

const levelConfig: Record<EventLevel, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  error: { color: "bg-red-600/20 text-red-400 border-red-600/50", icon: AlertCircle, label: "Error" },
  warn: { color: "bg-yellow-600/20 text-yellow-400 border-yellow-600/50", icon: AlertTriangle, label: "Warning" },
  info: { color: "bg-blue-600/20 text-blue-400 border-blue-600/50", icon: Info, label: "Info" },
  debug: { color: "bg-slate-600/20 text-slate-400 border-slate-600/50", icon: Bug, label: "Debug" },
};

export default function ErrorLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const eventsQuery = trpc.usage.systemEvents.useQuery(
    {
      level: levelFilter === "all" ? undefined : levelFilter,
      source: sourceFilter === "all" ? undefined : sourceFilter,
      limit: 100,
    },
    { refetchInterval: autoRefresh ? 5000 : false }
  );

  const countsQuery = trpc.usage.systemEventCounts.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const sourcesQuery = trpc.usage.systemEventSources.useQuery();

  const events = (eventsQuery.data?.events ?? []) as unknown as SystemEvent[];
  const counts = countsQuery.data ?? { error: 0, warn: 0, info: 0, debug: 0, total: 0 };
  const sources = sourcesQuery.data ?? [];

  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.message.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q) ||
      (e.stackTrace && e.stackTrace.toLowerCase().includes(q))
    );
  });

  const exportCSV = useCallback(() => {
    const headers = ["ID", "Level", "Source", "Message", "Timestamp", "Stack Trace"];
    const rows = filteredEvents.map((e) => [
      e.id,
      e.level,
      e.source,
      `"${e.message.replace(/"/g, '""')}"`,
      e.createdAt,
      e.stackTrace ? `"${e.stackTrace.replace(/"/g, '""')}"` : "",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "error-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEvents]);

  const formatTimestamp = (ts: Date | string) => {
    return new Date(ts).toLocaleString();
  };

  const getLevelBadge = (level: string) => {
    const config = levelConfig[level as EventLevel] || levelConfig.info;
    return (
      <Badge className={config.color}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Error Logs</h1>
            <p className="text-slate-400 text-lg">System events and error tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              className={autoRefresh ? "bg-green-600 hover:bg-green-700" : "border-slate-600 text-slate-300"}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
              Auto-refresh {autoRefresh ? "ON" : "OFF"}
            </Button>
            <Button onClick={exportCSV} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Level count badges */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {(["error", "warn", "info", "debug"] as EventLevel[]).map((level) => {
            const config = levelConfig[level];
            const Icon = config.icon;
            return (
              <Card
                key={level}
                className={`bg-slate-800/30 border-slate-700/50 backdrop-blur cursor-pointer transition-all hover:border-slate-500 ${
                  levelFilter === level ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setLevelFilter(levelFilter === level ? "all" : level)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-300 text-sm font-medium">{config.label}</span>
                    </div>
                    <span className="text-2xl font-bold text-white">{counts[level]}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300 text-sm font-medium">Total</span>
                </div>
                <span className="text-2xl font-bold text-white">{counts.total}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="bg-slate-800/30 border-slate-700/50 text-white pl-10 backdrop-blur"
            />
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-40 bg-slate-800/30 border-slate-700/50 text-white backdrop-blur">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-48 bg-slate-800/30 border-slate-700/50 text-white backdrop-blur">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => eventsQuery.refetch()}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Events Table */}
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardContent className="p-0">
            {eventsQuery.isLoading ? (
              <div className="flex justify-center p-12">
                <Activity className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-slate-300">Timestamp</TableHead>
                    <TableHead className="text-slate-300">Level</TableHead>
                    <TableHead className="text-slate-300">Source</TableHead>
                    <TableHead className="text-slate-300">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredEvents.map((event) => (
                    <Fragment key={event.id}>
                      <TableRow
                        className="border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}
                      >
                        <TableCell>
                          {expandedRow === event.id ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm whitespace-nowrap">
                          <Clock className="w-3 h-3 inline mr-1 text-slate-500" />
                          {formatTimestamp(event.createdAt)}
                        </TableCell>
                        <TableCell>{getLevelBadge(event.level)}</TableCell>
                        <TableCell className="text-white font-mono text-sm">{event.source}</TableCell>
                        <TableCell className="text-slate-300 max-w-[400px] truncate">{event.message}</TableCell>
                      </TableRow>
                      {expandedRow === event.id && (
                        <TableRow key={`${event.id}-detail`} className="border-slate-700/50">
                          <TableCell colSpan={5} className="bg-slate-900/50 p-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-400 block mb-1">Event ID</span>
                                  <span className="text-white font-mono">{event.id}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block mb-1">Source</span>
                                  <span className="text-white font-mono">{event.source}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block mb-1">Timestamp</span>
                                  <span className="text-white">{formatTimestamp(event.createdAt)}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-1 text-sm">Message</span>
                                <p className="text-white text-sm bg-slate-800 rounded-lg p-3">{event.message}</p>
                              </div>
                              {event.stackTrace && (
                                <div>
                                  <span className="text-slate-400 block mb-1 text-sm">Stack Trace</span>
                                  <pre className="bg-slate-800 rounded-lg p-3 text-xs text-red-300 font-mono overflow-x-auto max-h-64">
                                    {event.stackTrace}
                                  </pre>
                                </div>
                              )}
                              {event.metadata && (
                                <div>
                                  <span className="text-slate-400 block mb-1 text-sm">Metadata</span>
                                  <pre className="bg-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-x-auto">
                                    {JSON.stringify(JSON.parse(event.metadata), null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                  {filteredEvents.length === 0 && (
                    <TableRow className="border-slate-700/50">
                      <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                        No events found
                      </TableCell>
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
