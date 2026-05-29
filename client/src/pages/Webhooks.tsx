import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Webhook,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Bell,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const EVENT_OPTIONS = [
  { value: "circuit_breaker", label: "Circuit Breaker" },
  { value: "budget_threshold", label: "Budget Threshold" },
  { value: "guardrail_fire", label: "Guardrail Fire" },
  { value: "*", label: "All Events" },
];

export default function WebhooksPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);

  const utils = trpc.useContext();
  const listQuery = trpc.webhooks.list.useQuery();

  const createMutation = trpc.webhooks.create.useMutation({
    onSuccess: () => { utils.webhooks.list.invalidate(); setShowCreate(false); resetForm(); },
  });

  const updateMutation = trpc.webhooks.update.useMutation({
    onSuccess: () => { utils.webhooks.list.invalidate(); setEditing(null); resetForm(); },
  });

  const deleteMutation = trpc.webhooks.delete.useMutation({
    onSuccess: () => utils.webhooks.list.invalidate(),
  });

  const toggleMutation = trpc.webhooks.toggle.useMutation({
    onSuccess: () => utils.webhooks.list.invalidate(),
  });

  const resetForm = () => { setFormName(""); setFormUrl(""); setFormSecret(""); setFormEvents([]); };

  const openEdit = (wh: any) => {
    setFormName(wh.name);
    setFormUrl(wh.url);
    setFormSecret(wh.secret || "");
    setFormEvents(wh.events || []);
    setEditing(wh);
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, name: formName, url: formUrl, secret: formSecret || undefined, events: formEvents });
    } else {
      createMutation.mutate({ name: formName, url: formUrl, secret: formSecret || undefined, events: formEvents });
    }
  };

  const toggleEvent = (event: string) => {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const webhooks = listQuery.data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Webhooks</h1>
            <p className="text-slate-400 text-lg">Configure webhook notifications for system events</p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> New Webhook
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-6">
              <div className="text-xs text-slate-400 mb-1">Total Webhooks</div>
              <div className="text-3xl font-bold text-white">{webhooks.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-6">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-400" /> Active
              </div>
              <div className="text-3xl font-bold text-green-400">{webhooks.filter((w) => w.enabled === 1).length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-6">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <XCircle className="w-3 h-3 text-slate-400" /> Inactive
              </div>
              <div className="text-3xl font-bold text-slate-400">{webhooks.filter((w) => w.enabled === 0).length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-6">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Bell className="w-3 h-3 text-blue-400" /> Recently Fired
              </div>
              <div className="text-3xl font-bold text-blue-400">
                {webhooks.filter((w) => w.lastTriggered).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {listQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : webhooks.length === 0 ? (
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-12 text-center">
              <Webhook className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No webhooks configured yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-700/50">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="flex items-center gap-4 p-4 hover:bg-slate-700/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{wh.name}</span>
                        <Badge className={wh.enabled === 1 ? "bg-green-600/20 text-green-400 border-green-600/50 text-[10px]" : "bg-slate-600/20 text-slate-400 border-slate-600/50 text-[10px]"}>
                          {wh.enabled === 1 ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{wh.url}</p>
                      <div className="flex gap-1 mt-1">
                        {(wh.events || []).map((ev: string) => (
                          <Badge key={ev} variant="outline" className="text-[9px] border-slate-600 text-slate-400">{ev}</Badge>
                        ))}
                      </div>
                      {wh.lastTriggered && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Last fired: {new Date(wh.lastTriggered).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-slate-400"
                        onClick={() => toggleMutation.mutate({ id: wh.id, enabled: wh.enabled !== 1 })}
                      >
                        {wh.enabled === 1 ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 border-slate-700 text-slate-300" onClick={() => openEdit(wh)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 border-slate-700 text-red-400 hover:text-red-300" onClick={() => deleteMutation.mutate({ id: wh.id })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showCreate || !!editing} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditing(null); } }}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">{editing ? "Edit Webhook" : "Create Webhook"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Name</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. slack-alerts" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">URL</label>
                <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://hooks.example.com/..." className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Secret (optional)</label>
                <Input value={formSecret} onChange={(e) => setFormSecret(e.target.value)} type="password" placeholder="Signing secret" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Events</label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_OPTIONS.map((ev) => (
                    <Button
                      key={ev.value}
                      size="sm"
                      variant={formEvents.includes(ev.value) ? "default" : "outline"}
                      onClick={() => toggleEvent(ev.value)}
                      className={formEvents.includes(ev.value) ? "bg-blue-600 text-white" : "border-slate-700 text-slate-300"}
                    >
                      {ev.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditing(null); }} className="border-slate-700 text-slate-300">Cancel</Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!formName || !formUrl}>
                {editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
