import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import CommandPalette from "@/components/CommandPalette";
import NotFound from "@/pages/NotFound";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import ChatPage from "@/pages/Chat";
import TenantDashboard from "@/pages/TenantDashboard";
import AuditLogPage from "@/pages/AuditLog";
import AgentActivity from "@/pages/AgentActivity";
import McpExplorer from "@/pages/McpExplorer";
import MyMcps from "@/pages/MyMcps";
import WorkflowEditor from "@/pages/WorkflowEditor";
import WorkflowMonitor from "@/pages/WorkflowMonitor";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import RequestHistory from "./pages/RequestHistory";
import AdminPanel from "./pages/AdminPanel";
import SystemHealth from "./pages/SystemHealth";
import InferenceLab from "./pages/InferenceLab";
import ToolsHub from "./pages/ToolsHub";
import Organizations from "./pages/Organizations";
import AccessGroups from "./pages/AccessGroups";
import AIHub from "./pages/AIHub";
import APIReference from "./pages/APIReference";
import Settings from "./pages/Settings";
import Usage from "./pages/Usage";
import Budgets from "./pages/Budgets";
import Logs from "./pages/Logs";
import ErrorLogs from "./pages/ErrorLogs";
import Guardrails from "./pages/Guardrails";
import GuardrailsMonitor from "./pages/GuardrailsMonitor";
import InternalUsers from "./pages/InternalUsers";
import Teams from "./pages/Teams";
import VirtualKeys from "./pages/VirtualKeys";
import MCPServers from "./pages/MCPServers";
import SkillsHub from "./pages/SkillsHub";
import SystemMonitor from "./pages/SystemMonitor";
import ProcessManager from "./pages/ProcessManager";
import LLMDiscoverer from "./pages/LLMDiscoverer";
import ForgeBuilder from "./pages/ForgeBuilder";
import BlockBuilder from "./pages/BlockBuilder";
import CustomProviders from "./pages/CustomProviders";
import HuggingFace from "./pages/HuggingFace";
import PromptLibrary from "./pages/PromptLibrary";
import Benchmark from "./pages/Benchmark";
import Webhooks from "./pages/Webhooks";
import LocalModelManager from "./pages/LocalModelManager";
import DeploymentMonitor from "./pages/DeploymentMonitor";
import AILab from "./pages/AILab";
import ForgeBrain from "./pages/ForgeBrain";
import GithubExplorer from "./pages/GithubExplorer";
import { useEffect } from "react";

function Redirect({ href }: { href: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(href, { replace: true }); }, []);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }
  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }
  return <>{children}</>;
}

function WrappedPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* ─── CORE ────────────────────────────────────────────────── */}
      <Route path="/chat" component={() => <WrappedPage><ChatPage /></WrappedPage>} />
      <Route path="/chat/:id" component={() => <WrappedPage><ChatPage /></WrappedPage>} />
      <Route path="/dashboard" component={() => <WrappedPage><Dashboard /></WrappedPage>} />
      <Route path="/forge-builder" component={() => <WrappedPage><ForgeBuilder /></WrappedPage>} />
      <Route path="/ai-lab" component={() => <WrappedPage><AILab /></WrappedPage>} />
      <Route path="/forge-brain" component={() => <WrappedPage><ForgeBrain /></WrappedPage>} />

      {/* ─── TOOLS ────────────────────────────────────────────────── */}
      <Route path="/mcp" component={() => <WrappedPage><McpExplorer /></WrappedPage>} />
      <Route path="/mcp-explorer" component={() => <WrappedPage><McpExplorer /></WrappedPage>} />
      <Route path="/mcp/:slug" component={() => <WrappedPage><McpExplorer /></WrappedPage>} />
      <Route path="/huggingface" component={() => <WrappedPage><HuggingFace /></WrappedPage>} />
      <Route path="/github-explorer" component={() => <WrappedPage><GithubExplorer /></WrappedPage>} />
      <Route path="/deployment-monitor" component={() => <WrappedPage><DeploymentMonitor /></WrappedPage>} />

      {/* ─── SYSTEM ────────────────────────────────────────────────── */}
      <Route path="/guard" component={() => <WrappedPage><GuardrailsMonitor /></WrappedPage>} />
      <Route path="/guardrails-monitor" component={() => <WrappedPage><GuardrailsMonitor /></WrappedPage>} />
      <Route path="/budgets" component={() => <WrappedPage><Budgets /></WrappedPage>} />
      <Route path="/settings" component={() => <WrappedPage><Settings /></WrappedPage>} />

      {/* ─── LEGACY ROUTES (keep working) ───────────────────────────── */}
      <Route path="/builder" component={() => <WrappedPage><BlockBuilder /></WrappedPage>} />
      <Route path="/agents" component={() => <WrappedPage><ForgeBuilder /></WrappedPage>} />
      <Route path="/agents/:id" component={() => <WrappedPage><AgentActivity /></WrappedPage>} />
      <Route path="/agent-activity" component={() => <WrappedPage><AgentActivity /></WrappedPage>} />
      <Route path="/workflows" component={() => <WrappedPage><ForgeBuilder /></WrappedPage>} />
      <Route path="/workflows/:id" component={() => <WrappedPage><WorkflowEditor /></WrappedPage>} />
      <Route path="/workflow-monitor" component={() => <WrappedPage><WorkflowMonitor /></WrappedPage>} />
      <Route path="/my-mcps" component={() => <WrappedPage><MyMcps /></WrappedPage>} />
      <Route path="/mcp-servers" component={() => <WrappedPage><MCPServers /></WrappedPage>} />
      <Route path="/local-models" component={() => <WrappedPage><LocalModelManager /></WrappedPage>} />
      <Route path="/custom-providers" component={() => <WrappedPage><CustomProviders /></WrappedPage>} />
      <Route path="/requests" component={() => <WrappedPage><RequestHistory /></WrappedPage>} />
      <Route path="/admin" component={() => <WrappedPage><AdminPanel /></WrappedPage>} />
      <Route path="/organizations" component={() => <WrappedPage><Organizations /></WrappedPage>} />
      <Route path="/internal-users" component={() => <WrappedPage><InternalUsers /></WrappedPage>} />
      <Route path="/teams" component={() => <WrappedPage><Teams /></WrappedPage>} />
      <Route path="/inference" component={() => <WrappedPage><InferenceLab /></WrappedPage>} />
      <Route path="/ai-hub" component={() => <WrappedPage><AIHub /></WrappedPage>} />
      <Route path="/tenant-dashboard" component={() => <WrappedPage><TenantDashboard /></WrappedPage>} />

      {/* ─── SUB-PAGE REDIRECTS ────────────────────────────────────── */}
      <Route path="/lab" component={() => <Redirect href="/ai-lab" />} />
      <Route path="/models" component={() => <Redirect href="/ai-lab?tab=models" />} />
      <Route path="/providers" component={() => <Redirect href="/ai-lab?tab=providers" />} />
      <Route path="/explorer" component={() => <Redirect href="/ai-lab?tab=models" />} />
      <Route path="/benchmark" component={() => <Redirect href="/ai-lab?tab=compare" />} />
      <Route path="/inference-lab" component={() => <Redirect href="/ai-lab?tab=discover" />} />
      <Route path="/llm-discoverer" component={() => <Redirect href="/ai-lab?tab=discover" />} />
      <Route path="/tools-hub" component={() => <Redirect href="/mcp?tab=tools" />} />
      <Route path="/skills" component={() => <Redirect href="/mcp?tab=tools" />} />
      <Route path="/prompts" component={() => <Redirect href="/mcp?tab=prompts" />} />
      <Route path="/virtual-keys" component={() => <Redirect href="/budgets?tab=keys" />} />
      <Route path="/usage" component={() => <Redirect href="/budgets" />} />
      <Route path="/access-groups" component={() => <Redirect href="/settings?tab=access" />} />
      <Route path="/webhooks" component={() => <Redirect href="/settings?tab=webhooks" />} />
      <Route path="/api-reference" component={() => <Redirect href="/settings?tab=api" />} />
      <Route path="/audit-logs" component={() => <Redirect href="/guard?tab=audit" />} />
      <Route path="/system-monitor" component={() => <Redirect href="/guard?tab=monitor" />} />
      <Route path="/process-manager" component={() => <Redirect href="/guard?tab=process" />} />
      <Route path="/error-logs" component={() => <Redirect href="/guard?tab=alerts" />} />
      <Route path="/guardrails" component={() => <Redirect href="/guard" />} />
      <Route path="/health" component={() => <Redirect href="/guard" />} />
      <Route path="/agentic" component={() => <Redirect href="/forge-builder?tab=agents" />} />
      <Route path="/logs" component={() => <Redirect href="/budgets" />} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <CommandPalette />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
