import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Settings as SettingsIcon,
  Palette,
  Shield,
  Server,
  Eye,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

interface SettingsSection {
  id: string;
  label: string;
  icon: any;
}

const sections: SettingsSection[] = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
  { id: "system", label: "System", icon: Server },
  { id: "visibility", label: "Page Visibility", icon: Eye },
];

const sidebarPages = [
  { id: "dashboard", label: "Dashboard", visible: true },
  { id: "providers", label: "Providers", visible: true },
  { id: "models", label: "Models", visible: true },
  { id: "requests", label: "Requests", visible: true },
  { id: "admin", label: "Admin", visible: true },
  { id: "health", label: "Health", visible: true },
  { id: "inference", label: "Inference Lab", visible: true },
  { id: "explorer", label: "Explorer", visible: true },
  { id: "agentic", label: "Agentic", visible: true },
  { id: "tools-hub", label: "Tools Hub", visible: true },
  { id: "organizations", label: "Organizations", visible: true },
  { id: "access-groups", label: "Access Groups", visible: true },
  { id: "ai-hub", label: "AI Hub", visible: true },
  { id: "api-reference", label: "API Reference", visible: true },
  { id: "usage", label: "Usage", visible: true },
  { id: "logs", label: "Logs", visible: true },
  { id: "guardrails", label: "Guardrails Monitor", visible: true },
  { id: "internal-users", label: "Internal Users", visible: true },
  { id: "teams", label: "Teams", visible: true },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState("general");
  const [saving, setSaving] = useState(false);
  const { config, setAccent, setDensity, setCardStyle, setPreset, setAnimations } = useTheme();

  const [appName, setAppName] = useState("Forge Studio");
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [logoUrl, setLogoUrl] = useState("");
  const [theme, setTheme] = useState("dark");
  const [jwtSecret, setJwtSecret] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState("3600");
  const [port, setPort] = useState("3000");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [pageVisibility, setPageVisibility] = useState(sidebarPages);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Settings saved successfully");
    }, 800);
  };

  const togglePageVisibility = (id: string) => {
    setPageVisibility((prev) =>
      prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p))
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Settings</h1>
            <p className="text-slate-400 text-lg">Configure application settings</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardContent className="p-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm transition-colors ${
                      activeSection === section.id
                        ? "bg-blue-600/20 text-white"
                        : "text-slate-300 hover:bg-slate-700/50"
                    }`}
                  >
                    <section.icon className={`w-4 h-4 ${activeSection === section.id ? "text-blue-400" : "text-slate-400"}`} />
                    {section.label}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {activeSection === "general" && (
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">General Settings</CardTitle>
                  <CardDescription>Basic application configuration</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <Label className="text-slate-300">Application Name</Label>
                    <Input value={appName} onChange={(e) => setAppName(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Version</Label>
                    <Input value={appVersion} onChange={(e) => setAppVersion(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1" />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "branding" && (
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">Branding</CardTitle>
                  <CardDescription>Customize the look and feel</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <Label className="text-slate-300">Logo URL</Label>
                    <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="bg-slate-700 border-slate-600 text-white mt-1" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Theme</Label>
                    <div className="flex gap-3 mt-2">
                      {["dark", "light", "system"].map((t) => (
                        <Button
                          key={t}
                          variant={theme === t ? "default" : "outline"}
                          onClick={() => setTheme(t)}
                          className={theme === t ? "bg-blue-600 text-white" : "border-slate-600 text-slate-300"}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "appearance" && (
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">Appearance</CardTitle>
                  <CardDescription>Theme presets, accent colors, and layout density</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* Presets */}
                  <div>
                    <Label className="text-slate-300 text-sm font-medium mb-3 block">Theme Presets</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { key: "neural", label: "Neural", desc: "Slate + Blue" },
                        { key: "cyber", label: "Cyber", desc: "Black + Cyan" },
                        { key: "minimal", label: "Minimal", desc: "Flat & Clean" },
                        { key: "oled", label: "OLED", desc: "Pure Black" },
                        { key: "studio", label: "Studio", desc: "Light Mode" },
                      ] as const).map((p) => (
                        <button
                          key={p.key}
                          onClick={() => setPreset(p.key)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            config.preset === p.key
                              ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                              : "border-slate-700 hover:border-slate-600 bg-slate-900/50"
                          }`}
                        >
                          <div className="text-sm font-medium text-white">{p.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div>
                    <Label className="text-slate-300 text-sm font-medium mb-3 block">Accent Color</Label>
                    <div className="flex gap-2">
                      {(["blue", "purple", "cyan", "emerald", "amber", "rose"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => setAccent(a)}
                          className={`w-9 h-9 rounded-full transition-all ${
                            config.accent === a ? "ring-2 ring-white scale-110" : "ring-1 ring-slate-700 hover:scale-105"
                          }`}
                          style={{
                            background: `var(--color-${a}-500)`,
                          }}
                          title={a}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Density */}
                  <div>
                    <Label className="text-slate-300 text-sm font-medium mb-3 block">Layout Density</Label>
                    <div className="flex gap-2">
                      {(["compact", "comfortable", "spacious"] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDensity(d)}
                          className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                            config.density === d
                              ? "border-blue-500 bg-blue-500/10 text-white"
                              : "border-slate-700 text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Style */}
                  <div>
                    <Label className="text-slate-300 text-sm font-medium mb-3 block">Card Style</Label>
                    <div className="flex gap-2">
                      {(["glass", "solid", "bordered"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setCardStyle(s)}
                          className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                            config.cardStyle === s
                              ? "border-blue-500 bg-blue-500/10 text-white"
                              : "border-slate-700 text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Animations */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300 text-sm font-medium">Animations</Label>
                      <p className="text-xs text-slate-500">Enable hover effects and transitions</p>
                    </div>
                    <Switch
                      checked={config.animations}
                      onCheckedChange={setAnimations}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "security" && (
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">Security</CardTitle>
                  <CardDescription>Authentication and session settings</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <Label className="text-slate-300">JWT Secret</Label>
                    <Input type="password" value={jwtSecret} onChange={(e) => setJwtSecret(e.target.value)} placeholder="Enter JWT secret..." className="bg-slate-700 border-slate-600 text-white mt-1" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Session Timeout (seconds)</Label>
                    <Input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1" />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "system" && (
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">System</CardTitle>
                  <CardDescription>Server and database configuration</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <Label className="text-slate-300">Port</Label>
                    <Input value={port} onChange={(e) => setPort(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Database URL</Label>
                    <Input value={databaseUrl} onChange={(e) => setDatabaseUrl(e.target.value)} placeholder="postgresql://..." className="bg-slate-700 border-slate-600 text-white mt-1" />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "visibility" && (
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">Page Visibility</CardTitle>
                  <CardDescription>Toggle which pages are visible in the sidebar</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-1">
                    {pageVisibility.map((page, i) => (
                      <div key={page.id}>
                        <div className="flex items-center justify-between py-3">
                          <span className="text-sm text-slate-300">{page.label}</span>
                          <Switch checked={page.visible} onCheckedChange={() => togglePageVisibility(page.id)} />
                        </div>
                        {i < pageVisibility.length - 1 && <Separator className="bg-slate-700/50" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
