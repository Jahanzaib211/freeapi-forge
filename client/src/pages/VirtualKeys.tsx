import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

function MaskedKey({ k }: { k: string }) {
  return (
    <span className="font-mono text-xs text-slate-300">
      {k.slice(0, 7)}...{k.slice(-4)}
    </span>
  );
}

export default function VirtualKeys() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedKey, setSelectedKey] = useState<any>(null);
  const [showFullKey, setShowFullKey] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [tpmLimit, setTpmLimit] = useState("");
  const [rpmLimit, setRpmLimit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const listQuery = trpc.virtualKeys.list.useQuery(undefined);
  const utils = trpc.useUtils();

  const createMut = trpc.virtualKeys.create.useMutation({
    onSuccess: () => {
      utils.virtualKeys.list.invalidate();
      setShowCreate(false);
      setNewName("");
      setBudgetLimit("");
      setTpmLimit("");
      setRpmLimit("");
      setExpiryDate("");
    },
  });

  const toggleMut = trpc.virtualKeys.update.useMutation({
    onSuccess: () => utils.virtualKeys.list.invalidate(),
  });

  const deleteMut = trpc.virtualKeys.delete.useMutation({
    onSuccess: () => {
      utils.virtualKeys.list.invalidate();
      setDeleteTarget(null);
    },
  });

  const keys = listQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              Virtual Keys
            </h1>
            <p className="text-slate-400 text-lg">
              API key management & budget controls
            </p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Key
          </Button>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider p-4">Name</th>
                    <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider p-4">Key</th>
                    <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider p-4">Team</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider p-4">Spend</th>
                    <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider p-4">Rate Limits</th>
                    <th className="text-left text-[10px] text-slate-400 uppercase tracking-wider p-4">Models</th>
                    <th className="text-center text-[10px] text-slate-400 uppercase tracking-wider p-4">Enabled</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider p-4">Created</th>
                    <th className="text-right text-[10px] text-slate-400 uppercase tracking-wider p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((vk: any) => (
                    <tr
                      key={vk.id}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Key className="w-3 h-3 text-blue-400" />
                          <span className="text-sm text-white">{vk.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <MaskedKey k={vk.key} />
                      </td>
                      <td className="p-4 text-xs text-slate-400">{vk.team || "—"}</td>
                      <td className="p-4 text-right">
                        <span className="text-xs text-white">${vk.spend?.toFixed(2) || "0.00"}</span>
                        {vk.budgetLimit && (
                          <span className="text-[10px] text-slate-500 ml-1">/ ${vk.budgetLimit}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {vk.tpm && (
                            <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/50 text-[10px]">
                              TPM: {vk.tpm.toLocaleString()}
                            </Badge>
                          )}
                          {vk.rpm && (
                            <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/50 text-[10px]">
                              RPM: {vk.rpm.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap max-w-[200px]">
                          {vk.models?.slice(0, 2).map((m: string) => (
                            <Badge key={m} className="bg-blue-600/20 text-blue-400 border-blue-600/50 text-[10px]">
                              {m}
                            </Badge>
                          ))}
                          {vk.models?.length > 2 && (
                            <Badge className="bg-slate-600/20 text-slate-400 border-slate-600/50 text-[10px]">
                              +{vk.models.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Switch
                          checked={vk.enabled}
                          onCheckedChange={() => toggleMut.mutate({ id: vk.id, enabled: vk.enabled ? 0 : 1 })}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </td>
                      <td className="p-4 text-right text-xs text-slate-400">
                        {vk.createdAt ? new Date(vk.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-slate-400 hover:text-white"
                            onClick={() => setSelectedKey(vk)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => setDeleteTarget(vk)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {keys.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 text-sm">
                        No virtual keys created yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Create Virtual Key</DialogTitle>
              <DialogDescription className="text-slate-400">
                Generate a new API key with budget and rate limits
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="my-api-key"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Budget Limit ($)</label>
                  <Input
                    type="number"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    placeholder="10.00"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Expiry Date</label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">TPM Limit</label>
                  <Input
                    type="number"
                    value={tpmLimit}
                    onChange={(e) => setTpmLimit(e.target.value)}
                    placeholder="100000"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">RPM Limit</label>
                  <Input
                    type="number"
                    value={rpmLimit}
                    onChange={(e) => setRpmLimit(e.target.value)}
                    placeholder="1000"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Model Restrictions (comma-separated)</label>
                <Input
                  placeholder="gpt-4, claude-3-opus, ..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() =>
                  createMut.mutate({
                    name: newName,
                    budgetLimitUsd: budgetLimit ? parseFloat(budgetLimit) : undefined,
                    rateLimitTPM: tpmLimit ? parseInt(tpmLimit) : undefined,
                    rateLimitRPM: rpmLimit ? parseInt(rpmLimit) : undefined,
                  })
                }
                disabled={!newName || createMut.isPending}
              >
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Key Detail Dialog */}
        <Dialog open={!!selectedKey} onOpenChange={() => { setSelectedKey(null); setShowFullKey(false); }}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedKey?.name}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Key details and spend history
              </DialogDescription>
            </DialogHeader>
            {selectedKey && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-900 rounded-lg flex items-center justify-between">
                  <code className="text-xs text-slate-300 break-all">
                    {showFullKey ? selectedKey.key : <MaskedKey k={selectedKey.key} />}
                  </code>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-slate-400"
                      onClick={() => setShowFullKey(!showFullKey)}
                    >
                      {showFullKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-slate-400"
                      onClick={() => navigator.clipboard.writeText(selectedKey.key)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-[10px] text-slate-400">Total Spend</p>
                    <p className="text-lg text-white font-semibold">${selectedKey.spend?.toFixed(2) || "0.00"}</p>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-[10px] text-slate-400">Budget Limit</p>
                    <p className="text-lg text-white font-semibold">${selectedKey.budgetLimit || "∞"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 flex-1"
                    onClick={() => {
                      if (selectedKey && confirm("Rotate this key? The old key will be invalidated.")) {
                        toggleMut.mutate({ id: selectedKey.id, name: `${selectedKey.name}-rotated-${Date.now()}` });
                      }
                    }}
                    disabled={toggleMut.isPending}
                  >
                    {toggleMut.isPending ? (
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-2" />
                    )}
                    Rotate Key
                  </Button>
                  <Button variant="outline" className="border-slate-600 text-slate-300 flex-1" disabled>
                    <Shield className="w-3 h-3 mr-2" />
                    Spend History
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Delete Virtual Key</DialogTitle>
              <DialogDescription className="text-slate-400">
                This will permanently revoke <strong className="text-white">{deleteTarget?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
