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
import AgentBuilder from "@/pages/AgentBuilder";
import AgentActivity from "@/pages/AgentActivity";
import McpExplorer from "@/pages/McpExplorer";
import MyMcps from "@/pages/MyMcps";
import WorkflowEditor from "@/pages/WorkflowEditor";
import WorkflowMonitor from "@/pages/WorkflowMonitor";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ProviderMonitor from "./pages/ProviderMonitor";
import RequestHistory from "./pages/RequestHistory";
import AdminPanel from "./pages/AdminPanel";
import SystemHealth from "./pages/SystemHealth";
import ModelManager from "./pages/ModelManager";
import ModelExplorer from "./pages/ModelExplorer";
import InferenceLab from "./pages/InferenceLab";
import Agentic from "./pages/Agentic";
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
import CustomProviders from "./pages/CustomProviders";
import HuggingFace from "./pages/HuggingFace";
import PromptLibrary from "./pages/PromptLibrary";
import Benchmark from "./pages/Benchmark";
import ProviderHealth from "./pages/ProviderHealth";
import Webhooks from "./pages/Webhooks";
import AILabHub from "./pages/AILabHub";
import LocalModelManager from "./pages/LocalModelManager";
import DeploymentMonitor from "./pages/DeploymentMonitor";

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/chat" component={() => <ProtectedRoute><DashboardLayout><ChatPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/chat/:id" component={() => <ProtectedRoute><DashboardLayout><ChatPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/tenant-dashboard" component={() => <ProtectedRoute><DashboardLayout><TenantDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/agents" component={() => <ProtectedRoute><DashboardLayout><AgentBuilder /></DashboardLayout></ProtectedRoute>} />
      <Route path="/agents/:id" component={() => <ProtectedRoute><DashboardLayout><AgentActivity /></DashboardLayout></ProtectedRoute>} />
      <Route path="/agent-activity" component={() => <ProtectedRoute><DashboardLayout><AgentActivity /></DashboardLayout></ProtectedRoute>} />
      <Route path="/mcp-explorer" component={() => <ProtectedRoute><DashboardLayout><McpExplorer /></DashboardLayout></ProtectedRoute>} />
      <Route path="/my-mcps" component={() => <ProtectedRoute><DashboardLayout><MyMcps /></DashboardLayout></ProtectedRoute>} />
      <Route path="/mcp/:slug" component={() => <ProtectedRoute><DashboardLayout><McpExplorer /></DashboardLayout></ProtectedRoute>} />
      <Route path="/workflows" component={() => <ProtectedRoute><DashboardLayout><WorkflowEditor /></DashboardLayout></ProtectedRoute>} />
      <Route path="/workflows/:id" component={() => <ProtectedRoute><DashboardLayout><WorkflowEditor /></DashboardLayout></ProtectedRoute>} />
      <Route path="/workflow-monitor" component={() => <ProtectedRoute><DashboardLayout><WorkflowMonitor /></DashboardLayout></ProtectedRoute>} />
      <Route path="/audit-logs" component={() => <ProtectedRoute><DashboardLayout><AuditLogPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/lab" component={() => <ProtectedRoute><DashboardLayout><AILabHub /></DashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard" component={() => <ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/deployment-monitor" component={() => <ProtectedRoute><DashboardLayout><DeploymentMonitor /></DashboardLayout></ProtectedRoute>} />
      <Route path="/inference" component={() => <ProtectedRoute><DashboardLayout><InferenceLab /></DashboardLayout></ProtectedRoute>} />
      <Route path="/explorer" component={() => <ProtectedRoute><DashboardLayout><ModelExplorer /></DashboardLayout></ProtectedRoute>} />
      <Route path="/models" component={() => <ProtectedRoute><DashboardLayout><ModelManager /></DashboardLayout></ProtectedRoute>} />
      <Route path="/providers" component={() => <ProtectedRoute><DashboardLayout><ProviderMonitor /></DashboardLayout></ProtectedRoute>} />
      <Route path="/requests" component={() => <ProtectedRoute><DashboardLayout><RequestHistory /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin" component={() => <ProtectedRoute><DashboardLayout><AdminPanel /></DashboardLayout></ProtectedRoute>} />
      <Route path="/health" component={() => <ProtectedRoute><DashboardLayout><SystemHealth /></DashboardLayout></ProtectedRoute>} />
      <Route path="/virtual-keys" component={() => <ProtectedRoute><DashboardLayout><VirtualKeys /></DashboardLayout></ProtectedRoute>} />
      <Route path="/mcp-servers" component={() => <ProtectedRoute><DashboardLayout><MCPServers /></DashboardLayout></ProtectedRoute>} />
      <Route path="/skills" component={() => <ProtectedRoute><DashboardLayout><SkillsHub /></DashboardLayout></ProtectedRoute>} />
      <Route path="/guardrails" component={() => <ProtectedRoute><DashboardLayout><Guardrails /></DashboardLayout></ProtectedRoute>} />
      <Route path="/tools-hub" component={() => <ProtectedRoute><DashboardLayout><ToolsHub /></DashboardLayout></ProtectedRoute>} />
      <Route path="/usage" component={() => <ProtectedRoute><DashboardLayout><Usage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/logs" component={() => <ProtectedRoute><DashboardLayout><Logs /></DashboardLayout></ProtectedRoute>} />
      <Route path="/error-logs" component={() => <ProtectedRoute><DashboardLayout><ErrorLogs /></DashboardLayout></ProtectedRoute>} />
      <Route path="/guardrails-monitor" component={() => <ProtectedRoute><DashboardLayout><GuardrailsMonitor /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teams" component={() => <ProtectedRoute><DashboardLayout><Teams /></DashboardLayout></ProtectedRoute>} />
      <Route path="/internal-users" component={() => <ProtectedRoute><DashboardLayout><InternalUsers /></DashboardLayout></ProtectedRoute>} />
      <Route path="/organizations" component={() => <ProtectedRoute><DashboardLayout><Organizations /></DashboardLayout></ProtectedRoute>} />
      <Route path="/access-groups" component={() => <ProtectedRoute><DashboardLayout><AccessGroups /></DashboardLayout></ProtectedRoute>} />
      <Route path="/budgets" component={() => <ProtectedRoute><DashboardLayout><Budgets /></DashboardLayout></ProtectedRoute>} />
      <Route path="/system-monitor" component={() => <ProtectedRoute><DashboardLayout><SystemMonitor /></DashboardLayout></ProtectedRoute>} />
      <Route path="/process-manager" component={() => <ProtectedRoute><DashboardLayout><ProcessManager /></DashboardLayout></ProtectedRoute>} />
      <Route path="/local-models" component={() => <ProtectedRoute><DashboardLayout><LocalModelManager /></DashboardLayout></ProtectedRoute>} />
      <Route path="/llm-discoverer" component={() => <ProtectedRoute><DashboardLayout><LLMDiscoverer /></DashboardLayout></ProtectedRoute>} />
      <Route path="/api-reference" component={() => <ProtectedRoute><DashboardLayout><APIReference /></DashboardLayout></ProtectedRoute>} />
      <Route path="/ai-hub" component={() => <ProtectedRoute><DashboardLayout><AIHub /></DashboardLayout></ProtectedRoute>} />
      <Route path="/settings" component={() => <ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
      <Route path="/agentic" component={() => <ProtectedRoute><DashboardLayout><Agentic /></DashboardLayout></ProtectedRoute>} />
      <Route path="/builder" component={() => <ProtectedRoute><DashboardLayout><ForgeBuilder /></DashboardLayout></ProtectedRoute>} />
      <Route path="/custom-providers" component={() => <ProtectedRoute><DashboardLayout><CustomProviders /></DashboardLayout></ProtectedRoute>} />
      <Route path="/huggingface" component={() => <ProtectedRoute><DashboardLayout><HuggingFace /></DashboardLayout></ProtectedRoute>} />
      <Route path="/prompts" component={() => <ProtectedRoute><DashboardLayout><PromptLibrary /></DashboardLayout></ProtectedRoute>} />
      <Route path="/benchmark" component={() => <ProtectedRoute><DashboardLayout><Benchmark /></DashboardLayout></ProtectedRoute>} />
      <Route path="/provider-health" component={() => <ProtectedRoute><DashboardLayout><ProviderHealth /></DashboardLayout></ProtectedRoute>} />
      <Route path="/webhooks" component={() => <ProtectedRoute><DashboardLayout><Webhooks /></DashboardLayout></ProtectedRoute>} />
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
