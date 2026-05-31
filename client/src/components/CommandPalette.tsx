import React, { useState, useEffect, useCallback } from "react";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useAuth } from "../contexts/AuthContext";

const PAGES = [
  { name: "Dashboard", path: "/dashboard", icon: "📊", category: "Pages" },
  { name: "Chat", path: "/chat", icon: "💬", category: "Pages" },
  { name: "Playground", path: "/dashboard", icon: "🎮", category: "Pages" },
  { name: "Agents Builder", path: "/agents", icon: "🤖", category: "Pages" },
  { name: "Workflows", path: "/workflows", icon: "⚡", category: "Pages" },
  { name: "Workflow Monitor", path: "/workflow-monitor", icon: "📊", category: "Pages" },
  { name: "MCP Explorer", path: "/mcp-explorer", icon: "🔌", category: "Pages" },
  { name: "My MCPs", path: "/my-mcps", icon: "📦", category: "Pages" },
  { name: "Skills", path: "/skills", icon: "🧠", category: "Pages" },
  { name: "Virtual Keys", path: "/virtual-keys", icon: "🔑", category: "Pages" },
  { name: "Budget", path: "/budgets", icon: "💰", category: "Pages" },
  { name: "Providers", path: "/providers", icon: "⚡", category: "Pages" },
  { name: "Settings", path: "/settings", icon: "⚙️", category: "Pages" },
  { name: "Audit Logs", path: "/audit-logs", icon: "📋", category: "Pages" },
  { name: "System Monitor", path: "/system-monitor", icon: "📊", category: "Pages" },
  { name: "Admin Panel", path: "/admin", icon: "🛡️", category: "Pages" },
  { name: "New Workflow", path: "/workflows", icon: "⚡", category: "Actions" },
  { name: "View Workflow Runs", path: "/workflow-monitor", icon: "📊", category: "Actions" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { getToken } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback((path: string) => {
    window.location.href = path;
    setOpen(false);
  }, []);

  const filtered = PAGES.filter(p =>
    !query || p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, actions, agents..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>
          <div className="p-4 text-center text-muted-foreground">
            <p>No results found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        </CommandEmpty>
        {["Pages", "Actions"].map(category => {
          const items = filtered.filter(p => p.category === category);
          if (items.length === 0) return null;
          return (
            <CommandGroup key={category} heading={category}>
              {items.map(item => (
                <CommandItem key={item.path} onSelect={() => handleSelect(item.path)}>
                  <span className="mr-2">{item.icon}</span>
                  <span>{item.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
