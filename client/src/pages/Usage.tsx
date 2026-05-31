import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  Zap,
  DollarSign,
  Activity,
  Calendar,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { trpc } from "@/lib/trpc";

const COLORS = ["#00ff88", "#00aaff", "#ffaa00", "#ff4444", "#aa44ff", "#ff88cc", "#44aaff", "#88ff44"];

export default function Usage() {
  const [dateRange, setDateRange] = useState("7d");

  const liveStatsQuery = trpc.analytics.liveStats.useQuery(undefined, { refetchInterval: 5000 });
  const topModelsQuery = trpc.analytics.topModels.useQuery({ limit: 10 }, { refetchInterval: 10000 });
  const modelStatsQuery = trpc.analytics.modelStats.useQuery(undefined, { refetchInterval: 10000 });
  const hourlyQuery = trpc.analytics.hourlyVolume.useQuery(undefined, { refetchInterval: 10000 });

  const stats = liveStatsQuery.data;
  const topModels = topModelsQuery.data ?? [];
  const modelStats = modelStatsQuery.data ?? [];
  const hourlyData = hourlyQuery.data ?? [];

  const tokenData = topModels.map((m: any) => ({
    model: m.model?.split("/").pop() || m.model,
    count: m.count,
  }));

  const costData = modelStats.map((m: any, i: number) => ({
    name: m.model?.split("/").pop() || m.model,
    value: m.totalCost || m.count || 0,
    fill: COLORS[i % COLORS.length],
  }));

  const successRate = stats?.successRate || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Usage</h1>
            <p className="text-slate-400 text-lg">Analytics and usage insights</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 bg-slate-800/30 border-slate-700/50 text-white backdrop-blur">
              <Calendar className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Requests</span>
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{(stats?.todayRequests || 0).toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">+{stats?.hourRequests || 0} last hour</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Tokens</span>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">{(stats?.totalTokens || 0).toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">All time</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Cost</span>
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white">${((stats?.totalTokens || 0) * 0.0000001).toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-1">Estimated</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Success Rate</span>
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white">{successRate.toFixed(1)}%</div>
              <div className="text-xs text-slate-500 mt-1">Last 24h</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base">Requests Over Time</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="count" stroke="#00ff88" strokeWidth={2} dot={{ fill: "#00ff88", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base">Tokens by Model</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tokenData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="model" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" height={50} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill="#00aaff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={costData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {costData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white text-base">Top Models</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topModels.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis type="category" dataKey="model" stroke="#94a3b8" fontSize={10} width={120} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill="#aa44ff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white">Per-Model Statistics</CardTitle>
            <CardDescription>Detailed breakdown by model</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-300">Model</TableHead>
                  <TableHead className="text-slate-300">Requests</TableHead>
                  <TableHead className="text-slate-300">Success Rate</TableHead>
                  <TableHead className="text-slate-300">Avg Latency</TableHead>
                  <TableHead className="text-slate-300">Total Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelStats.length === 0 ? (
                  <TableRow className="border-slate-700/50">
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">No model statistics available</TableCell>
                  </TableRow>
                ) : (
                  modelStats.map((m: any, i: number) => (
                    <TableRow key={i} className="border-slate-700/50 hover:bg-slate-700/30">
                      <TableCell className="font-medium text-white">{m.model}</TableCell>
                      <TableCell className="text-slate-300">{(m.count || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-600/20 text-green-400 border-green-600/50">{(m.successRate || 99).toFixed(1)}%</Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">{(m.avgLatency || 0).toFixed(0)}ms</TableCell>
                      <TableCell className="text-slate-300">{(m.totalTokens || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
