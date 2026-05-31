import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Settings as SettingsIcon, Palette, Shield, Bell, Brain, Cpu, RotateCcw,
  Save, Monitor, Eye, EyeOff, RefreshCw, Download, Trash2, AlertTriangle,
} from "lucide-react";

type SettingsMap = Record<string, Record<string, any>>;

function api(token: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return {
    query: async (path: string, input?: Record<string, any>) => {
      const url = input
        ? `/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
        : `/api/trpc/${path}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      return d.result?.data?.json ?? d.result?.data ?? null;
    },
    mutate: async (path: string, input: Record<string, any>) => {
      const res = await fetch(`/api/trpc/${path}?batch=1`, {
        method: "POST", headers,
        body: JSON.stringify([{ json: input }]),
      });
      return res.ok;
    },
  };
}

export default function Settings() {
  const { getToken } = useAuth();
  const token = getToken();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await api(token).query("userSettings.getAll");
      if (data) setSettings(data);
    } catch {}
    setLoading(false);
  }

  async function saveSetting(key: string, value: any) {
    setSaving(key);
    try {
      await api(token).mutate("userSettings.set", { key, value });
      setSettings(prev => {
        const parts = key.split(".");
        const cat = parts[0];
        const field = parts.slice(1).join(".");
        if (!prev[cat]) prev[cat] = {};
        if (field) prev[cat][field] = value;
        else prev[cat] = value;
        return { ...prev };
      });
      toast.success("Saved");
    } catch { toast.error("Failed to save"); }
    setSaving(null);
  }

  async function resetAll() {
    if (!confirm("Reset ALL settings to defaults?")) return;
    try {
      await api(token).mutate("userSettings.resetAll", {});
      setSettings({});
      toast.success("All settings reset to defaults");
      loadSettings();
    } catch { toast.error("Failed"); }
  }

  function get(key: string, fallback: any = null): any {
    const parts = key.split(".");
    let current: any = settings;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return fallback;
      }
    }
    return current ?? fallback;
  }

  if (loading) return <div className="p-6"><h1 className="text-2xl font-bold text-foreground">Settings</h1><p className="text-muted-foreground mt-4">Loading...</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure every aspect of Forge Studio</p>
        </div>
        <Button variant="outline" onClick={resetAll} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Reset All
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-card border border-border p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Palette className="w-4 h-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Cpu className="w-4 h-4 mr-2" /> AI & Providers
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Bell className="w-4 h-4 mr-2" /> Notifications & Brain
          </TabsTrigger>
          <TabsTrigger value="guard" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Shield className="w-4 h-4 mr-2" /> Guard & Security
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: GENERAL ────────────────────────────────────────── */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" /> Appearance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Theme</Label><p className="text-xs text-muted-foreground">Dark, light, or system</p></div>
                <Select value={theme} onValueChange={() => { toggleTheme(); saveSetting("general.theme", theme === "dark" ? "light" : "dark"); }}>
                  <SelectTrigger className="w-32 bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div><Label>Compact Mode</Label><p className="text-xs text-muted-foreground">Reduce spacing</p></div>
                <Switch checked={get("general.compactMode", false)} onCheckedChange={v => saveSetting("general.compactMode", v)} />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div><Label>Enable Animations</Label><p className="text-xs text-muted-foreground">Transition effects</p></div>
                <Switch checked={get("general.enableAnimations", true)} onCheckedChange={v => saveSetting("general.enableAnimations", v)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Monitor className="w-5 h-5" /> Task Pane</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Auto-open on task</Label></div>
                <Switch checked={get("gui.taskPaneAutoOpen", true)} onCheckedChange={v => saveSetting("gui.taskPaneAutoOpen", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Show token count</Label></div>
                <Switch checked={get("gui.showTokenCount", true)} onCheckedChange={v => saveSetting("gui.showTokenCount", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Show latency</Label></div>
                <Switch checked={get("gui.showLatencyMs", true)} onCheckedChange={v => saveSetting("gui.showLatencyMs", v)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: AI & PROVIDERS ─────────────────────────────────── */}
        <TabsContent value="ai" className="space-y-6">
          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="w-5 h-5" /> Default AI Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Temperature</Label>
                  <p className="text-xs text-muted-foreground mb-2">Creativity level</p>
                  <div className="flex items-center gap-3">
                    <Slider value={[get("ai.temperature", 0.7)]} min={0} max={2} step={0.1}
                      onValueChange={([v]) => saveSetting("ai.temperature", v)} className="flex-1" />
                    <span className="text-sm w-8 text-right">{get("ai.temperature", 0.7)}</span>
                  </div>
                </div>
                <div>
                  <Label>Max Tokens/Request</Label>
                  <Input type="number" value={get("ai.maxTokensPerRequest", 4096)}
                    onChange={e => saveSetting("ai.maxTokensPerRequest", parseInt(e.target.value) || 4096)}
                    className="bg-card border-border" />
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div><Label>Streaming</Label></div>
                <Switch checked={get("ai.streamingEnabled", true)} onCheckedChange={v => saveSetting("ai.streamingEnabled", v)} />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div><Label>Auto-retry on fail</Label></div>
                <Switch checked={get("ai.autoRetryOnFail", true)} onCheckedChange={v => saveSetting("ai.autoRetryOnFail", v)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Retries</Label>
                  <Input type="number" value={get("ai.maxRetries", 3)}
                    onChange={e => saveSetting("ai.maxRetries", parseInt(e.target.value) || 3)}
                    className="bg-card border-border" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle>Provider Behavior</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Auto-discover models</Label><p className="text-xs text-muted-foreground">On provider connect</p></div>
                <Switch checked={get("providers.autoDiscoverModels", true)} onCheckedChange={v => saveSetting("providers.autoDiscoverModels", v)} />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div><Label>Auto-disable unhealthy</Label></div>
                <Switch checked={get("providers.autoDisableUnhealthy", true)} onCheckedChange={v => saveSetting("providers.autoDisableUnhealthy", v)} />
              </div>
              <div>
                <Label>Unhealthy threshold</Label>
                <Input type="number" value={get("providers.unhealthyThreshold", 3)}
                  onChange={e => saveSetting("providers.unhealthyThreshold", parseInt(e.target.value) || 3)}
                  className="bg-card border-border w-24" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle>Agent & Workflow Defaults</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max concurrent agent runs</Label>
                  <Input type="number" value={get("agents.maxConcurrentRuns", 10)}
                    onChange={e => saveSetting("agents.maxConcurrentRuns", parseInt(e.target.value) || 10)}
                    className="bg-card border-border" />
                </div>
                <div>
                  <Label>Keep history (days)</Label>
                  <Input type="number" value={get("agents.keepHistoryDays", 30)}
                    onChange={e => saveSetting("agents.keepHistoryDays", parseInt(e.target.value) || 30)}
                    className="bg-card border-border" />
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div><Label>Workflow auto-retry on step fail</Label></div>
                <Switch checked={get("workflows.autoRetryOnStepFail", false)} onCheckedChange={v => saveSetting("workflows.autoRetryOnStepFail", v)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: NOTIFICATIONS & BRAIN ──────────────────────── */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                ["notifications.providerDown", "Provider down"],
                ["notifications.providerRecovered", "Provider recovered"],
                ["notifications.agentCompleted", "Agent completed"],
                ["notifications.agentFailed", "Agent failed"],
                ["notifications.workflowFailed", "Workflow failed"],
                ["notifications.deploymentFailed", "Deployment failed"],
                ["notifications.budgetAlert", "Budget alert"],
                ["notifications.guardAlert", "Guard alert"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <Label>{label}</Label>
                  <Switch checked={get(key, true)} onCheckedChange={v => saveSetting(key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5" /> Forge Brain</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Brain enabled</Label></div>
                <Switch checked={get("brain.enabled", true)} onCheckedChange={v => saveSetting("brain.enabled", v)} />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div><Label>Auto-sync</Label><p className="text-xs text-muted-foreground">Auto-create nodes</p></div>
                <Switch checked={get("brain.autoSync", true)} onCheckedChange={v => saveSetting("brain.autoSync", v)} />
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-4">What to remember:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["brain.categories.provider", "Providers"],
                  ["brain.categories.model", "Models"],
                  ["brain.categories.agent", "Agents"],
                  ["brain.categories.workflow", "Workflows"],
                  ["brain.categories.pipeline", "Pipelines"],
                  ["brain.categories.mcp", "MCP"],
                  ["brain.categories.onboarding", "Onboarding"],
                  ["brain.categories.suggestion", "Suggestions"],
                  ["brain.categories.system", "System"],
                  ["brain.categories.event", "Events"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch checked={get(key, key.includes("suggestion") || key.includes("event") ? false : true)}
                      onCheckedChange={v => saveSetting(key, v)} />
                    <Label className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle>Budget</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Alert at</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Slider value={[get("budget.alertThresholdPercent", 80)]} min={0} max={100} step={5}
                    onValueChange={([v]) => saveSetting("budget.alertThresholdPercent", v)} className="flex-1" />
                  <span className="text-sm w-12 text-right">{get("budget.alertThresholdPercent", 80)}%</span>
                </div>
              </div>
              <Separator className="bg-border" />
              <p className="text-xs text-muted-foreground font-medium">Track spending by:</p>
              {[
                ["budget.trackByProvider", "Provider"],
                ["budget.trackByAgent", "Agent"],
                ["budget.trackByModel", "Model"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={get(key, true)} onCheckedChange={v => saveSetting(key, v)} />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: GUARD & SECURITY ───────────────────────────────── */}
        <TabsContent value="guard" className="space-y-6">
          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Guard Thresholds</CardTitle>
              <CardDescription>When to trigger system alerts</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {[
                ["guard.alertThresholds.cpuPercent", "CPU %", 90, 100],
                ["guard.alertThresholds.memoryPercent", "Memory %", 85, 100],
                ["guard.alertThresholds.diskPercent", "Disk %", 90, 100],
                ["guard.alertThresholds.postgresConnections", "PG Connections %", 90, 100],
                ["guard.alertThresholds.redisMemoryPercent", "Redis Memory %", 80, 100],
                ["guard.alertThresholds.responseTimeMs", "Response Time (ms)", 5000, 30000],
                ["guard.alertThresholds.errorRatePercent", "Error Rate %", 5, 100],
              ].map(([key, label, defVal, max]) => {
                const k = key as string;
                const m = max as number;
                return (
                <div key={k}>
                  <div className="flex justify-between mb-1"><Label>{label as string}</Label><span className="text-sm">{get(k, defVal)}</span></div>
                  <Slider value={[get(k, defVal)]} min={0} max={m} step={1}
                    onValueChange={([v]) => saveSetting(k, v)} className="flex-1" />
                </div>
              );})}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle>Guard Behavior</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Auto-diagnostics on alert</Label></div>
                <Switch checked={get("guard.autoDiagnosticsOnAlert", true)} onCheckedChange={v => saveSetting("guard.autoDiagnosticsOnAlert", v)} />
              </div>
              <div>
                <Label>Alert retention (days)</Label>
                <Input type="number" value={get("guard.alertRetentionDays", 7)}
                  onChange={e => saveSetting("guard.alertRetentionDays", parseInt(e.target.value) || 7)}
                  className="bg-card border-border w-24" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle>Onboarding</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={async () => {
                await api(token).mutate("userSettings.reset", { key: "onboarding.completed" });
                toast.success("Onboarding reset. Questionnaire will appear on next visit.");
              }}>
                <RefreshCw className="w-4 h-4 mr-2" /> Re-run Questionnaire
              </Button>
              <Button variant="outline" onClick={resetAll} className="ml-2">
                <Trash2 className="w-4 h-4 mr-2" /> Reset All Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
