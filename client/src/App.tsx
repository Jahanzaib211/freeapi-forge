import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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
import AuditLogs from "./pages/AuditLogs";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/lab" component={() => <DashboardLayout><AILabHub /></DashboardLayout>} />
      <Route path="/dashboard" component={() => <DashboardLayout><Dashboard /></DashboardLayout>} />
      <Route path="/inference" component={() => <DashboardLayout><InferenceLab /></DashboardLayout>} />
      <Route path="/explorer" component={() => <DashboardLayout><ModelExplorer /></DashboardLayout>} />
      <Route path="/models" component={() => <DashboardLayout><ModelManager /></DashboardLayout>} />
      <Route path="/providers" component={() => <DashboardLayout><ProviderMonitor /></DashboardLayout>} />
      <Route path="/requests" component={() => <DashboardLayout><RequestHistory /></DashboardLayout>} />
      <Route path="/admin" component={() => <DashboardLayout><AdminPanel /></DashboardLayout>} />
      <Route path="/health" component={() => <DashboardLayout><SystemHealth /></DashboardLayout>} />
      <Route path="/virtual-keys" component={() => <DashboardLayout><VirtualKeys /></DashboardLayout>} />
      <Route path="/mcp-servers" component={() => <DashboardLayout><MCPServers /></DashboardLayout>} />
      <Route path="/skills" component={() => <DashboardLayout><SkillsHub /></DashboardLayout>} />
      <Route path="/guardrails" component={() => <DashboardLayout><Guardrails /></DashboardLayout>} />
      <Route path="/tools-hub" component={() => <DashboardLayout><ToolsHub /></DashboardLayout>} />
      <Route path="/usage" component={() => <DashboardLayout><Usage /></DashboardLayout>} />
      <Route path="/logs" component={() => <DashboardLayout><Logs /></DashboardLayout>} />
      <Route path="/error-logs" component={() => <DashboardLayout><ErrorLogs /></DashboardLayout>} />
      <Route path="/guardrails-monitor" component={() => <DashboardLayout><GuardrailsMonitor /></DashboardLayout>} />
      <Route path="/teams" component={() => <DashboardLayout><Teams /></DashboardLayout>} />
      <Route path="/internal-users" component={() => <DashboardLayout><InternalUsers /></DashboardLayout>} />
      <Route path="/organizations" component={() => <DashboardLayout><Organizations /></DashboardLayout>} />
      <Route path="/access-groups" component={() => <DashboardLayout><AccessGroups /></DashboardLayout>} />
      <Route path="/budgets" component={() => <DashboardLayout><Budgets /></DashboardLayout>} />
      <Route path="/system-monitor" component={() => <DashboardLayout><SystemMonitor /></DashboardLayout>} />
      <Route path="/process-manager" component={() => <DashboardLayout><ProcessManager /></DashboardLayout>} />
      <Route path="/llm-discoverer" component={() => <DashboardLayout><LLMDiscoverer /></DashboardLayout>} />
      <Route path="/api-reference" component={() => <DashboardLayout><APIReference /></DashboardLayout>} />
      <Route path="/ai-hub" component={() => <DashboardLayout><AIHub /></DashboardLayout>} />
      <Route path="/settings" component={() => <DashboardLayout><Settings /></DashboardLayout>} />
      <Route path="/agentic" component={() => <DashboardLayout><Agentic /></DashboardLayout>} />
      <Route path="/builder" component={() => <DashboardLayout><ForgeBuilder /></DashboardLayout>} />
      <Route path="/custom-providers" component={() => <DashboardLayout><CustomProviders /></DashboardLayout>} />
      <Route path="/huggingface" component={() => <DashboardLayout><HuggingFace /></DashboardLayout>} />
      <Route path="/prompts" component={() => <DashboardLayout><PromptLibrary /></DashboardLayout>} />
      <Route path="/benchmark" component={() => <DashboardLayout><Benchmark /></DashboardLayout>} />
      <Route path="/provider-health" component={() => <DashboardLayout><ProviderHealth /></DashboardLayout>} />
      <Route path="/webhooks" component={() => <DashboardLayout><Webhooks /></DashboardLayout>} />
      <Route path="/audit-logs" component={() => <DashboardLayout><AuditLogs /></DashboardLayout>} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
