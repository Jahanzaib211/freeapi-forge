import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Edit2,
  Check,
  X,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Budgets() {
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [newLimit, setNewLimit] = useState("");

  const utils = trpc.useContext();
  const budgetsQuery = trpc.organizations.budgets.list.useQuery();
  const updateLimitMutation =
    trpc.organizations.budgets.updateLimit.useMutation({
      onSuccess: () => {
        utils.organizations.budgets.list.invalidate();
        setEditingTeam(null);
        setNewLimit("");
      },
    });

  const budgets = budgetsQuery.data ?? [];
  const totalBudget = budgets.reduce((a, b) => a + b.monthlyLimitUsd, 0);
  const totalSpend = budgets.reduce((a, b) => a + b.currentSpendUsd, 0);
  const overBudget = budgets.filter(
    (b) => b.currentSpendUsd > b.monthlyLimitUsd,
  ).length;

  const forecast = useMemo(() => {
    if (budgets.length < 3) return { projected: 0, avgDaily: 0, confidence: "low" as const };
    const dailyData = budgets.map((b, i) => ({
      date: `day-${i}`,
      spend: b.currentSpendUsd,
    }));
    const avg = dailyData.reduce((s, d) => s + d.spend, 0) / dailyData.length;
    return {
      projected: avg * 30,
      avgDaily: avg,
      confidence: dailyData.length >= 14 ? "high" as const : dailyData.length >= 7 ? "medium" as const : "low" as const,
    };
  }, [budgets]);

  const handleUpdateLimit = (teamId: number) => {
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit < 1) return;
    updateLimitMutation.mutate({ teamId, monthlyLimitUsd: limit });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
            Budgets
          </h1>
          <p className="text-slate-400 text-lg">
            Monitor and manage team budget limits
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Budget</span>
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">
                ${totalBudget.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Spend</span>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">
                $
                {totalSpend.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Remaining</span>
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white">
                $
                {Math.max(0, totalBudget - totalSpend).toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Over Budget</span>
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-3xl font-bold text-white">{overBudget}</div>
              <div className="text-xs text-slate-500 mt-1">teams</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-slate-400">Monthly Spend Forecast</span>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                forecast.confidence === "high"
                  ? "bg-green-600/20 text-green-400"
                  : forecast.confidence === "medium"
                  ? "bg-yellow-600/20 text-yellow-400"
                  : "bg-red-600/20 text-red-400"
              }`}>
                {forecast.confidence} confidence
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Projected Spend</div>
                <div className="text-2xl font-bold text-white">
                  ${forecast.projected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Avg Daily</div>
                <div className="text-2xl font-bold text-white">
                  ${forecast.avgDaily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Based on</div>
                <div className="text-2xl font-bold text-white">
                  {budgets.length} data points
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white">
              Budget Limits by Team
            </CardTitle>
            <CardDescription>
              Current month budget utilization
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {budgetsQuery.isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-300">Team</TableHead>
                    <TableHead className="text-slate-300">
                      Monthly Limit
                    </TableHead>
                    <TableHead className="text-slate-300">
                      Current Spend
                    </TableHead>
                    <TableHead className="text-slate-300">Remaining</TableHead>
                    <TableHead className="text-slate-300">
                      Utilization
                    </TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.length === 0 ? (
                    <TableRow className="border-slate-700/50">
                      <TableCell
                        colSpan={6}
                        className="text-center text-slate-400 py-8"
                      >
                        No budget data available. Create teams to set budgets.
                      </TableCell>
                    </TableRow>
                  ) : (
                    budgets.map((budget) => {
                      const pct =
                        budget.monthlyLimitUsd > 0
                          ? (budget.currentSpendUsd /
                              budget.monthlyLimitUsd) *
                            100
                          : 0;
                      const remaining = Math.max(
                        0,
                        budget.monthlyLimitUsd - budget.currentSpendUsd,
                      );
                      const isOver =
                        budget.currentSpendUsd > budget.monthlyLimitUsd;

                      return (
                        <TableRow
                          key={budget.teamId}
                          className="border-slate-700/50 hover:bg-slate-700/30"
                        >
                          <TableCell className="font-medium text-white">
                            {budget.teamName}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {editingTeam === budget.teamId ? (
                              <div className="flex gap-2 items-center">
                                <Input
                                  type="number"
                                  value={newLimit}
                                  onChange={(e) => setNewLimit(e.target.value)}
                                  className="w-24 bg-slate-700 border-slate-600 text-white h-8"
                                  placeholder="Limit"
                                />
                                <Button
                                  size="sm"
                                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    handleUpdateLimit(budget.teamId)
                                  }
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-slate-400"
                                  onClick={() => setEditingTeam(null)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <span>
                                ${budget.monthlyLimitUsd.toLocaleString()}
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            className={isOver ? "text-red-400" : "text-slate-300"}
                          >
                            $
                            {budget.currentSpendUsd.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell
                            className={
                              isOver ? "text-red-400" : "text-green-400"
                            }
                          >
                            $
                            {remaining.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    pct > 100
                                      ? "bg-red-500"
                                      : pct > 80
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`text-xs ${
                                  pct > 100
                                    ? "text-red-400"
                                    : pct > 80
                                      ? "text-yellow-400"
                                      : "text-slate-400"
                                }`}
                              >
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {!editingTeam || editingTeam !== budget.teamId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                onClick={() => {
                                  setEditingTeam(budget.teamId);
                                  setNewLimit(
                                    budget.monthlyLimitUsd.toString(),
                                  );
                                }}
                              >
                                <Edit2 className="w-3 h-3 mr-1" /> Edit Limit
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })
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
