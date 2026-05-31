import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Users, User, DollarSign, Loader2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Teams() {
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formBudget, setFormBudget] = useState("10");

  const utils = trpc.useContext();
  const teamsQuery = trpc.organizations.teams.listWithBudget.useQuery();
  const createMutation = trpc.organizations.teams.create.useMutation({
    onSuccess: () => {
      utils.organizations.teams.listWithBudget.invalidate();
      setCreateOpen(false);
      setFormName("");
      setFormBudget("10");
    },
  });
  const deleteMutation = trpc.organizations.teams.delete.useMutation({
    onSuccess: () => {
      utils.organizations.teams.listWithBudget.invalidate();
    },
  });

  const teams = teamsQuery.data ?? [];
  const totalBudget = teams.reduce((a, t) => a + t.monthlyLimitUsd, 0);
  const totalSpend = teams.reduce((a, t) => a + t.currentSpendUsd, 0);

  const handleCreate = () => {
    if (!formName.trim()) return;
    createMutation.mutate({
      name: formName.trim(),
      monthlyBudgetUsd: parseInt(formBudget) || 10,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              Teams
            </h1>
            <p className="text-slate-400 text-lg">
              Manage teams and their budgets
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create Team</DialogTitle>
                <DialogDescription>
                  Set up a new team with budget limits.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-slate-300">Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="My Team"
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Monthly Budget ($)</Label>
                  <Input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Teams</span>
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{teams.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Budget</span>
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white">
                ${totalBudget.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Monthly Spend</span>
                <DollarSign className="w-5 h-5 text-green-400" />
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
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white">All Teams</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {teamsQuery.isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-300">Name</TableHead>
                    <TableHead className="text-slate-300">Owner</TableHead>
                    <TableHead className="text-slate-300">Budget</TableHead>
                    <TableHead className="text-slate-300">
                      Monthly Spend
                    </TableHead>
                    <TableHead className="text-slate-300">Usage</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.length === 0 ? (
                    <TableRow className="border-slate-700/50">
                      <TableCell
                        colSpan={6}
                        className="text-center text-slate-400 py-8"
                      >
                        No teams created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams.map((team) => {
                      const pct =
                        team.monthlyLimitUsd > 0
                          ? (team.currentSpendUsd / team.monthlyLimitUsd) * 100
                          : 0;
                      return (
                        <TableRow
                          key={team.id}
                          className="border-slate-700/50 hover:bg-slate-700/30"
                        >
                          <TableCell className="font-medium text-white">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-400" />
                              {team.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            <User className="w-3 h-3 inline mr-1" />
                            {team.ownerName}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            ${team.monthlyLimitUsd.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            $
                            {team.currentSpendUsd.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    pct > 80
                                      ? "bg-red-500"
                                      : pct > 50
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-slate-400">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:bg-red-700/50 hover:text-red-400 hover:border-red-600"
                              onClick={() =>
                                deleteMutation.mutate({ id: team.id })
                              }
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
