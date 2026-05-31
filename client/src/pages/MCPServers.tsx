import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plug,
  Plus,
  Wifi,
  WifiOff,
  AlertTriangle,
  Wrench,
  Globe,
  Terminal,
  Copy,
  TestTube,
  Loader2,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  if (status === "connected")
    return (
      <Badge className="bg-green-600/20 text-green-400 border-green-600/50 text-[10px]">
        <Wifi className="w-2.5 h-2.5 mr-1" />
        Connected
      </Badge>
    );
  if (status === "error")
    return (
      <Badge className="bg-red-600/20 text-red-400 border-red-600/50 text-[10px]">
        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
        Error
      </Badge>
    );
  return (
    <Badge className="bg-slate-600/20 text-slate-400 border-slate-600/50 text-[10px]">
      <WifiOff className="w-2.5 h-2.5 mr-1" />
      Disconnected
    </Badge>
  );
}

function TransportBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    stdio: "bg-purple-600/20 text-purple-400 border-purple-600/50",
    sse: "bg-blue-600/20 text-blue-400 border-blue-600/50",
    http: "bg-cyan-600/20 text-cyan-400 border-cyan-600/50",
  };
  return (
    <Badge className={`${colors[type] || colors.http} text-[10px]`}>
      {type.toUpperCase()}
    </Badge>
  );
}

export default function MCPServers() {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [newTransport, setNewTransport] = useState("sse");
  const [newUrl, setNewUrl] = useState("");

  const listQuery = trpc.mcp.list.useQuery(undefined);
  const utils = trpc.useUtils();

  const addMut = trpc.mcp.create.useMutation({
    onSuccess: () => {
      utils.mcp.list.invalidate();
      setShowAdd(false);
      setNewName("");
      setNewUrl("");
    },
  });

  const deleteMut = trpc.mcp.delete.useMutation({
    onSuccess: () => {
      utils.mcp.list.invalidate();
      toast.success("Server deleted");
    },
  });

  const servers = listQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              MCP Servers
            </h1>
            <p className="text-slate-400 text-lg">
              Model Context Protocol server management
            </p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Server
          </Button>
        </div>

        {/* Forge Studio endpoint */}
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mb-6">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Plug className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs text-white font-medium">Forge Studio MCP Endpoint</p>
                <code className="text-[10px] text-slate-400">http://localhost:5051/mcp/sse</code>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              onClick={() => navigator.clipboard.writeText("http://localhost:5051/mcp/sse")}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>

        {/* Server cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server: any) => (
            <Card
              key={server.id}
              className="bg-slate-800/30 border-slate-700/50 backdrop-blur hover:border-slate-500/50 transition-colors cursor-pointer"
              onClick={() => setSelectedServer(server)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base">{server.name}</CardTitle>
                  <StatusBadge status={server.status} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TransportBadge type={server.transport} />
                    <span className="text-xs text-slate-400">
                      {server.toolCount || 0} tools
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this MCP server?")) {
                        deleteMut.mutate({ id: server.id });
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {server.url && (
                  <p className="text-[10px] text-slate-500 mt-2 truncate">{server.url}</p>
                )}
                {server.command && (
                  <p className="text-[10px] text-slate-500 mt-2 truncate font-mono">{server.command}</p>
                )}
              </CardContent>
            </Card>
          ))}

          {servers.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-500">
              No MCP servers configured. Click "Add Server" to get started.
            </div>
          )}
        </div>

        {/* Add Server Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Add MCP Server</DialogTitle>
              <DialogDescription className="text-slate-400">
                Connect a new Model Context Protocol server
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="my-mcp-server"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Transport</label>
                <div className="flex gap-2">
                  {(["stdio", "sse", "http"] as const).map((t) => (
                    <Button
                      key={t}
                      variant="outline"
                      size="sm"
                      className={`border-slate-600 ${
                        newTransport === t
                          ? "bg-blue-600/20 text-blue-400 border-blue-600/50"
                          : "text-slate-400"
                      }`}
                      onClick={() => setNewTransport(t)}
                    >
                      {t === "stdio" && <Terminal className="w-3 h-3 mr-1" />}
                      {t === "sse" && <Wifi className="w-3 h-3 mr-1" />}
                      {t === "http" && <Globe className="w-3 h-3 mr-1" />}
                      {t.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              {newTransport === "stdio" ? (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Command</label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="npx -y @some/mcp-server"
                    className="bg-slate-700 border-slate-600 text-white font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">URL</label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="http://localhost:3000/mcp/sse"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Auth Token (optional)</label>
                <Input
                  type="password"
                  placeholder="Bearer token..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() =>
                  addMut.mutate({
                    name: newName,
                    transport: newTransport,
                    url: newUrl,
                  })
                }
                disabled={!newName || addMut.isPending}
              >
                {addMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Server
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Server Detail Dialog */}
        <Dialog open={!!selectedServer} onOpenChange={() => setSelectedServer(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedServer?.name}
                {selectedServer && <StatusBadge status={selectedServer.status} />}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Server tools and resources
              </DialogDescription>
            </DialogHeader>
            {selectedServer && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <TransportBadge type={selectedServer.transport} />
                  <span className="text-xs text-slate-400">
                    {selectedServer.toolCount || 0} tools • {selectedServer.resourceCount || 0} resources
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-1">Endpoint</p>
                  <code className="text-xs text-slate-300 break-all">
                    {selectedServer.url || selectedServer.command}
                  </code>
                </div>
                {selectedServer.tools && selectedServer.tools.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Tools</p>
                    <div className="space-y-1">
                      {selectedServer.tools.map((tool: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 bg-slate-700/30 rounded"
                        >
                          <span className="text-xs text-white">{tool.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-blue-400"
                          >
                            <TestTube className="w-2.5 h-2.5 mr-1" />
                            Test
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
