import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertCircle,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  Cpu,
  DollarSign,
  FileText,
  Globe,
  Key,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Moon,
  MessageSquare,
  PanelLeft,
  Plug,
  Search,
  ScrollText,
  Settings,
  Shield,
  ShieldAlert,
  Sun,
  User,
  Users,
  Wrench,
  Zap,
  Boxes,
  FileCode,
  GitCompare,
  HeartPulse,
  Webhook,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

interface Section {
  title: string;
  items: MenuItem[];
}

const sidebarSections: Section[] = [
  {
    title: "AI GATEWAY",
    items: [
      { icon: Boxes, label: "Forge Builder", path: "/builder" },
      { icon: Key, label: "Virtual Keys", path: "/virtual-keys" },
      { icon: MessageSquare, label: "Playground", path: "/dashboard" },
      { icon: Layers, label: "Models + Endpoints", path: "/models" },
      { icon: Brain, label: "Agentic", path: "/agentic" },
      { icon: Plug, label: "MCP Servers", path: "/mcp-servers" },
      { icon: Zap, label: "Skills", path: "/skills" },
      { icon: Shield, label: "Guardrails", path: "/guardrails" },
      { icon: FileText, label: "Policies", path: "/guardrails" },
      { icon: Wrench, label: "Tools", path: "/tools-hub" },
      { icon: Plug, label: "Custom Providers", path: "/custom-providers" },
      { icon: FileCode, label: "Prompt Library", path: "/prompts" },
      { icon: GitCompare, label: "Model Benchmark", path: "/benchmark" },
      { icon: HeartPulse, label: "Provider Health", path: "/provider-health" },
      { icon: Webhook, label: "Webhooks", path: "/webhooks" },
    ],
  },
  {
    title: "OBSERVABILITY",
    items: [
      { icon: BarChart3, label: "Usage", path: "/usage" },
      { icon: ScrollText, label: "Logs", path: "/logs" },
      { icon: AlertCircle, label: "Error Logs", path: "/error-logs" },
      { icon: ShieldAlert, label: "Guardrails Monitor", path: "/guardrails-monitor" },
    ],
  },
  {
    title: "ACCESS CONTROL",
    items: [
      { icon: Users, label: "Teams", path: "/teams" },
      { icon: User, label: "Internal Users", path: "/internal-users" },
      { icon: Building2, label: "Organizations", path: "/organizations" },
      { icon: Lock, label: "Access Groups", path: "/access-groups" },
      { icon: DollarSign, label: "Budgets", path: "/budgets" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { icon: Activity, label: "System Monitor", path: "/system-monitor" },
      { icon: Settings, label: "Process Manager", path: "/process-manager" },
      { icon: Search, label: "LLM Discoverer", path: "/llm-discoverer" },
      { icon: Brain, label: "HuggingFace Hub", path: "/huggingface" },
    ],
  },
  {
    title: "DEVELOPER TOOLS",
    items: [
      { icon: BookOpen, label: "API Reference", path: "/api-reference" },
      { icon: Globe, label: "AI Hub", path: "/ai-hub" },
      { icon: Layers, label: "OpenAI Compatible", path: "/inference" },
    ],
  },
  {
    title: "SETTINGS",
    items: [{ icon: Settings, label: "Settings", path: "/settings" }],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to
              launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl(window.location.pathname);
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function CollapsibleSection({
  section,
  location,
  setLocation,
  isCollapsed,
}: {
  section: Section;
  location: string;
  setLocation: (path: string) => void;
  isCollapsed: boolean;
}) {
  const [isOpen, setIsOpen] = useState(() => {
    return section.items.some((item) => item.path === location);
  });

  useEffect(() => {
    if (section.items.some((item) => item.path === location)) {
      setIsOpen(true);
    }
  }, [location, section.items]);

  if (isCollapsed) {
    return (
      <SidebarMenu className="px-2 py-1">
        {section.items.map((item) => {
          const isActive = location === item.path;
          return (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                isActive={isActive}
                onClick={() => setLocation(item.path)}
                tooltip={item.label}
                className="h-9 transition-all font-normal"
              >
                <item.icon
                  className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors"
      >
        <span>{section.title}</span>
        <svg
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {isOpen && (
        <SidebarMenu className="px-2 py-0.5">
          {section.items.map((item) => {
            const isActive = location === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => setLocation(item.path)}
                  tooltip={item.label}
                  className={`h-9 transition-all font-normal ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${isActive ? "text-blue-400" : ""}`}
                  />
                  <span className="text-sm">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      )}
    </div>
  );
}

function SystemStatsBar() {
  const statsQuery = trpc.systemMonitor.stats.useQuery(undefined, {
    refetchInterval: 3000,
  });
  const stats = statsQuery.data;

  if (!stats) return null;

  const cpuPercent = Math.round(stats.cpu.totalUsage);
  const ramPercent = Math.round(stats.memory.usedPercent);
  const gpuPercent =
    stats.gpu.length > 0
      ? Math.round(
          stats.gpu.reduce((sum, g) => sum + g.utilizationGpu, 0) /
            stats.gpu.length
        )
      : null;

  return (
    <div className="px-3 py-2 border-t border-slate-800">
      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          <span>CPU {cpuPercent}%</span>
        </div>
        {gpuPercent !== null && (
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            <span>GPU {gpuPercent}%</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          <span>RAM {ramPercent}%</span>
        </div>
      </div>
    </div>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const findCurrentLabel = (): string => {
    for (const section of sidebarSections) {
      for (const item of section.items) {
        if (item.path === location) return item.label;
      }
    }
    return "Menu";
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-slate-950"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <Link
                href="/"
                className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
                title="Go to Home"
              >
                <img
                  src="https://avatars.githubusercontent.com/u/695416?v=4"
                  alt="Forge Studio"
                  className={`rounded-full shrink-0 border border-slate-700 ${isCollapsed ? "h-8 w-8" : "h-10 w-10"}`}
                />
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold tracking-tight text-sm text-white truncate">
                      FORGE STUDIO
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">
                      by Jahanzaib Ali
                    </span>
                  </div>
                )}
              </Link>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2 overflow-y-auto">
            {sidebarSections.map((section) => (
              <CollapsibleSection
                key={section.title}
                section={section}
                location={location}
                setLocation={setLocation}
                isCollapsed={isCollapsed}
              />
            ))}
          </SidebarContent>

          <div className="border-t border-slate-800">
            {!isCollapsed && <SystemStatsBar />}

            <SidebarFooter className="p-3 space-y-2">
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                  ) : (
                    <Moon className="h-4 w-4 text-blue-400 shrink-0" />
                  )}
                  {!isCollapsed && (
                    <span className="text-sm text-muted-foreground">
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </span>
                  )}
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Avatar className="h-9 w-9 border shrink-0">
                      <AvatarImage src="https://avatars.githubusercontent.com/u/695416?v=4" />
                      <AvatarFallback className="text-xs font-medium">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                      <p className="text-sm font-medium truncate leading-none text-white">
                        {user?.name || "-"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center rounded-md bg-blue-600/20 px-1.5 py-0.5 text-[9px] font-medium text-blue-400 ring-1 ring-inset ring-blue-600/30">
                          admin
                        </span>
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </div>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {findCurrentLabel()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
