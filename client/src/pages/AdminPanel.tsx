import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function AdminPanel() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [editingProvider, setEditingProvider] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const providersQuery = trpc.admin.getProviders.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const updateProviderMutation = trpc.admin.updateProvider.useMutation();
  const budgetQuery = trpc.budget.getMonthlySpend.useQuery({ teamId: "default" });
  const updateBudgetMutation = trpc.budget.updateLimit.useMutation();

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 max-w-md">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-white mb-2">Access Denied</h3>
                <p className="text-sm text-slate-400 mb-4">You need admin privileges to access this panel.</p>
                <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEditProvider = (provider: any) => {
    setEditingProvider(provider.id);
    setFormData({
      enabled: provider.enabled,
      qualityScore: provider.qualityScore,
      latencyMs: provider.latencyMs,
      costPerMToken: provider.costPerMToken,
    });
  };

  const handleSaveProvider = async (providerId: number) => {
    try {
      await updateProviderMutation.mutateAsync({
        providerId,
        ...formData,
      });
      setEditingProvider(null);
      providersQuery.refetch();
    } catch (error) {
      console.error("Failed to update provider:", error);
    }
  };

  const handleUpdateBudget = async (newLimit: number) => {
    try {
      await updateBudgetMutation.mutateAsync({
        teamId: "default",
        newLimit,
      });
      budgetQuery.refetch();
    } catch (error) {
      console.error("Failed to update budget:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-slate-400">Configure providers and manage budget limits</p>
        </div>

        {/* Budget Management */}
        <Card className="bg-slate-800 border-slate-700 mb-8">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Budget Configuration</CardTitle>
            <CardDescription>Set monthly spending limits for teams</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label className="text-slate-300 mb-2 block">Current Monthly Limit (USD)</Label>
                <div className="text-2xl font-bold text-white">${budgetQuery.data?.monthlyLimit || 10}</div>
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Current Spend (USD)</Label>
                <div className="text-2xl font-bold text-white">${budgetQuery.data?.currentSpend.toFixed(2) || "0.00"}</div>
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">New Limit (USD)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={budgetQuery.data?.monthlyLimit || 10}
                    className="bg-slate-700 border-slate-600 text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateBudget(parseFloat((e.target as HTMLInputElement).value));
                      }
                    }}
                  />
                  <Button
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      handleUpdateBudget(parseFloat(input.value));
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Provider Management */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Provider Configuration</CardTitle>
            <CardDescription>Manage LLM provider settings and health</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {providersQuery.isLoading ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-transparent">
                      <TableHead className="text-slate-300">Provider</TableHead>
                      <TableHead className="text-slate-300">Enabled</TableHead>
                      <TableHead className="text-slate-300">Quality Score</TableHead>
                      <TableHead className="text-slate-300">Latency (ms)</TableHead>
                      <TableHead className="text-slate-300">Cost/MToken</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providersQuery.data?.map((provider) => (
                      <TableRow key={provider.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="font-semibold text-white">{provider.name}</TableCell>
                        <TableCell>
                          {editingProvider === provider.id ? (
                            <Switch
                              checked={formData.enabled}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, enabled: checked })
                              }
                            />
                          ) : (
                            <Badge className={provider.enabled ? "bg-green-600" : "bg-slate-600"}>
                              {provider.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProvider === provider.id ? (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.qualityScore}
                              onChange={(e) =>
                                setFormData({ ...formData, qualityScore: parseInt(e.target.value) })
                              }
                              className="bg-slate-700 border-slate-600 text-white w-20"
                            />
                          ) : (
                            <span className="text-slate-300">{provider.qualityScore}%</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProvider === provider.id ? (
                            <Input
                              type="number"
                              min="0"
                              value={formData.latencyMs}
                              onChange={(e) =>
                                setFormData({ ...formData, latencyMs: parseInt(e.target.value) })
                              }
                              className="bg-slate-700 border-slate-600 text-white w-20"
                            />
                          ) : (
                            <span className="text-slate-300">{provider.latencyMs}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProvider === provider.id ? (
                            <Input
                              type="number"
                              min="0"
                              value={formData.costPerMToken}
                              onChange={(e) =>
                                setFormData({ ...formData, costPerMToken: parseInt(e.target.value) })
                              }
                              className="bg-slate-700 border-slate-600 text-white w-20"
                            />
                          ) : (
                            <span className="text-slate-300">${provider.costPerMToken}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProvider === provider.id ? (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleSaveProvider(provider.id)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Save
                              </Button>
                              <Button
                                onClick={() => setEditingProvider(null)}
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleEditProvider(provider)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
