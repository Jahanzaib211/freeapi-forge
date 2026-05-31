import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus,
  Building2,
  Users,
  DollarSign,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Organizations() {
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formBudget, setFormBudget] = useState("1000");

  const orgsQuery = trpc.organizations.organizations.list.useQuery(undefined);

  const orgs = (orgsQuery.data as any[]) ?? [
    { id: "1", name: "Acme Corp", teams: 5, members: 24, budget: 5000, spend: 2340 },
    { id: "2", name: "TechStart Inc", teams: 3, members: 12, budget: 2000, spend: 890 },
    { id: "3", name: "Research Lab", teams: 2, members: 8, budget: 3000, spend: 1560 },
  ];

  const handleCreate = () => {
    setCreateOpen(false);
    setFormName("");
    setFormBudget("1000");
  };

  const totalBudget = orgs.reduce((a: number, o: any) => a + o.budget, 0);
  const totalSpend = orgs.reduce((a: number, o: any) => a + o.spend, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Organizations</h1>
            <p className="text-slate-400 text-lg">Manage organizations, teams, and budgets</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create Organization</DialogTitle>
                <DialogDescription>Set up a new organization with budget limits.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-slate-300">Name</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="My Organization" className="bg-slate-700 border-slate-600 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-slate-300">Monthly Budget Limit ($)</Label>
                  <Input type="number" value={formBudget} onChange={(e) => setFormBudget(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-slate-600 text-slate-300">Cancel</Button>
                <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Organizations</span>
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{orgs.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Budget</span>
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white">${totalBudget.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Spend</span>
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">${totalSpend.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white">All Organizations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {orgsQuery.isLoading ? (
              <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-300">Name</TableHead>
                    <TableHead className="text-slate-300">Teams</TableHead>
                    <TableHead className="text-slate-300">Members</TableHead>
                    <TableHead className="text-slate-300">Budget</TableHead>
                    <TableHead className="text-slate-300">Spend</TableHead>
                    <TableHead className="text-slate-300">Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((org: any) => {
                    const pct = org.budget > 0 ? (org.spend / org.budget) * 100 : 0;
                    return (
                      <TableRow key={org.id} className="border-slate-700/50 hover:bg-slate-700/30">
                        <TableCell className="font-medium text-white">{org.name}</TableCell>
                        <TableCell className="text-slate-300">{org.teams}</TableCell>
                        <TableCell className="text-slate-300">{org.members}</TableCell>
                        <TableCell className="text-slate-300">${org.budget.toLocaleString()}</TableCell>
                        <TableCell className="text-slate-300">${org.spend.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-green-500"}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
