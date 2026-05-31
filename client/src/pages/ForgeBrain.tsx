import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, GitGraph, FolderTree, Search, Database, Download } from "lucide-react";

interface VaultStats {
  totalNodes: number;
  totalLinks: number;
  nodeTypes: Record<string, number>;
}

interface BrainNode {
  id: string;
  title: string;
  type: string;
  source: string;
  linkedCount: number;
  createdAt: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  snippet: string;
  score: number;
}

function api(token: string | null) {
  return {
    query: async (path: string, input?: Record<string, any>) => {
      const params = input
        ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
        : "?input=%7B%7D";
      const res = await fetch(`/api/trpc/${path}${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    },
    mutate: async (path: string, input: Record<string, any>) => {
      const res = await fetch(`/api/trpc/${path}?batch=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: input }]),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    },
  };
}

export default function ForgeBrain() {
  const { getToken } = useAuth();
  const token = getToken();

  const [stats, setStats] = useState<VaultStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [nodes, setNodes] = useState<BrainNode[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);

  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [nodeContent, setNodeContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadStats();
    loadNodes();
  }, [token]);

  async function loadStats() {
    setStatsLoading(true);
    try {
      const data = await api(token).query("forgeBrain.getVaultStats");
      setStats(data?.result?.data?.json || null);
    } catch {}
    setStatsLoading(false);
  }

  async function loadNodes() {
    setNodesLoading(true);
    try {
      const data = await api(token).query("forgeBrain.listNodes");
      setNodes(data?.result?.data?.json || []);
    } catch {}
    setNodesLoading(false);
  }

  async function loadNodeContent(nodeId: string) {
    if (expandedNodeId === nodeId) {
      setExpandedNodeId(null);
      setNodeContent("");
      return;
    }
    setExpandedNodeId(nodeId);
    setContentLoading(true);
    setNodeContent("");
    try {
      const data = await api(token).query("forgeBrain.getNodeMd", { nodeId });
      setNodeContent(data?.result?.data?.json?.content || "(No content)");
    } catch {
      setNodeContent("(Failed to load content)");
    }
    setContentLoading(false);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const data = await api(token).query("forgeBrain.searchNodes", { query: searchQuery });
      setSearchResults(data?.result?.data?.json || []);
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  }

  async function handleExport() {
    try {
      await api(token).mutate("forgeBrain.exportVault", { format: "json" });
    } catch {}
  }

  const nodeTypeEntries = stats?.nodeTypes ? Object.entries(stats.nodeTypes) : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🧠 Forge Brain</h1>
        <p className="text-muted-foreground mt-1">Visualize and explore your AI memory graph</p>
      </div>

      <Tabs defaultValue="graph" className="space-y-6">
        <TabsList>
          <TabsTrigger value="graph">
            <GitGraph className="w-4 h-4 mr-2" /> Graph View
          </TabsTrigger>
          <TabsTrigger value="nodes">
            <FolderTree className="w-4 h-4 mr-2" /> Node Explorer
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="w-4 h-4 mr-2" /> Search
          </TabsTrigger>
          <TabsTrigger value="vault">
            <Database className="w-4 h-4 mr-2" /> Vault
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="space-y-6">
          {statsLoading ? (
            <p className="text-muted-foreground text-center py-12">Loading stats...</p>
          ) : !stats ? (
            <Card>
              <CardContent className="text-center py-16">
                <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-lg text-foreground mb-2">Add providers in AI Lab to grow your Brain</p>
                <p className="text-muted-foreground">Connect AI providers to start building your knowledge graph.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Nodes</CardDescription>
                    <CardTitle className="text-3xl">{stats.totalNodes}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Links</CardDescription>
                    <CardTitle className="text-3xl">{stats.totalLinks}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Node Types</CardDescription>
                    <CardTitle className="text-3xl">{nodeTypeEntries.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Nodes by Type</CardTitle>
                  <CardDescription>Distribution of nodes across types</CardDescription>
                </CardHeader>
                <CardContent>
                  {nodeTypeEntries.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No node type data available.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {nodeTypeEntries.map(([type, count]) => (
                        <Card key={type} className="border-border">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm capitalize">{type}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-foreground">{count}</span>
                              <Badge variant="outline">
                                {stats.totalNodes > 0
                                  ? `${((count / stats.totalNodes) * 100).toFixed(1)}%`
                                  : "0%"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="nodes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Node Explorer</CardTitle>
              <CardDescription>Browse all nodes in the knowledge graph</CardDescription>
            </CardHeader>
            <CardContent>
              {nodesLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading nodes...</p>
              ) : nodes.length === 0 ? (
                <div className="text-center py-16">
                  <FolderTree className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-foreground">No nodes found</p>
                  <p className="text-muted-foreground text-sm mt-1">Nodes will appear as your brain learns from connected providers.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {nodes.map((node) => (
                    <div key={node.id}>
                      <button
                        onClick={() => loadNodeContent(node.id)}
                        className="w-full text-left p-4 rounded-lg border border-border hover:border-border/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground font-medium">{node.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {node.type} · {node.source} · {node.linkedCount} link{node.linkedCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{node.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(node.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </button>
                      {expandedNodeId === node.id && (
                        <div className="mt-1 ml-4 p-4 rounded-lg border border-border bg-card">
                          {contentLoading ? (
                            <p className="text-muted-foreground text-sm">Loading content...</p>
                          ) : (
                            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                              {nodeContent}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Nodes</CardTitle>
              <CardDescription>Search across your entire knowledge graph</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search nodes by title, content, or tags..."
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                />
                <Button onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()}>
                  {searchLoading ? "Searching..." : (
                    <>
                      <Search className="w-4 h-4 mr-2" /> Search
                    </>
                  )}
                </Button>
              </div>

              {hasSearched && (
                <>
                  {searchResults.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No results found for "{searchQuery}"
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                      </p>
                      {searchResults.map((result) => (
                        <Card key={result.id} className="border-border">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">{result.title}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{result.type}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  Score: {result.score.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{result.snippet}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vault" className="space-y-6">
          {statsLoading ? (
            <p className="text-muted-foreground text-center py-12">Loading vault info...</p>
          ) : !stats ? (
            <Card>
              <CardContent className="text-center py-16">
                <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-foreground">No vault data available</p>
                <p className="text-muted-foreground text-sm mt-1">Connect providers to populate your brain vault.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Nodes</CardDescription>
                    <CardTitle className="text-3xl">{stats.totalNodes}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Links</CardDescription>
                    <CardTitle className="text-3xl">{stats.totalLinks}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Node Types</CardDescription>
                    <CardTitle className="text-3xl">{nodeTypeEntries.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Graph Density</CardDescription>
                    <CardTitle className="text-3xl">
                      {stats.totalNodes > 0
                        ? ((stats.totalLinks / (stats.totalNodes * (stats.totalNodes - 1) / 2) * 100) || 0).toFixed(2)
                        : "0.00"}%
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Vault Actions</CardTitle>
                      <CardDescription>Manage your brain vault</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Export Vault</CardTitle>
                        <CardDescription>Export the entire knowledge graph</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" onClick={handleExport} className="w-full">
                          <Download className="w-4 h-4 mr-2" /> Export as JSON
                        </Button>
                      </CardContent>
                    </Card>
                    <Card className="border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Node Types Breakdown</CardTitle>
                        <CardDescription>Distribution by category</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {nodeTypeEntries.map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between">
                              <span className="text-sm text-foreground capitalize">{type}</span>
                              <span className="text-sm text-muted-foreground">{count}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
