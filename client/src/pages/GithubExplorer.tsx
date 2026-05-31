import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Search, Terminal, Star, Copy, Check, Trash2 } from "lucide-react";

interface CliTool {
  id: string;
  name: string;
  description: string;
  category: string;
  installCommand: string;
  stars: number;
  url: string;
}

interface TrackedRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string;
  url: string;
  addedAt: string;
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

export default function GithubExplorer() {
  const { getToken } = useAuth();
  const token = getToken();

  const [cliTools, setCliTools] = useState<CliTool[]>([]);
  const [cliCategories, setCliCategories] = useState<string[]>([]);
  const [cliCategoryFilter, setCliCategoryFilter] = useState("all");
  const [cliLoading, setCliLoading] = useState(true);

  const [trackedRepos, setTrackedRepos] = useState<TrackedRepo[]>([]);
  const [trackedLoading, setTrackedLoading] = useState(true);

  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [addingRepo, setAddingRepo] = useState(false);
  const [addRepoError, setAddRepoError] = useState("");

  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");

  useEffect(() => {
    if (!token) return;
    loadCliTools();
    loadTrackedRepos();
  }, [token]);

  async function loadCliTools() {
    setCliLoading(true);
    try {
      const [toolsData, categoriesData] = await Promise.all([
        api(token).query("githubExplorer.cliTools"),
        api(token).query("githubExplorer.cliCategories"),
      ]);
      setCliTools(toolsData?.result?.data?.json || []);
      setCliCategories(categoriesData?.result?.data?.json || []);
    } catch {}
    setCliLoading(false);
  }

  async function loadTrackedRepos() {
    setTrackedLoading(true);
    try {
      const data = await api(token).query("githubExplorer.trackedRepos");
      setTrackedRepos(data?.result?.data?.json || []);
    } catch {}
    setTrackedLoading(false);
  }

  async function handleTrackRepo() {
    if (!newRepoUrl.trim()) return;
    setAddingRepo(true);
    setAddRepoError("");
    try {
      const data = await api(token).mutate("githubExplorer.trackRepo", {
        url: newRepoUrl,
      });
      if (data) {
        setNewRepoUrl("");
        loadTrackedRepos();
      } else {
        setAddRepoError("Failed to track repository.");
      }
    } catch {
      setAddRepoError("An error occurred.");
    }
    setAddingRepo(false);
  }

  async function handleUntrackRepo(id: string) {
    try {
      await api(token).mutate("githubExplorer.untrackRepo", { id });
      loadTrackedRepos();
    } catch {}
  }

  function handleCopyCommand(command: string) {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  }

  const filteredCliTools = cliCategoryFilter === "all"
    ? cliTools
    : cliTools.filter((t) => t.category === cliCategoryFilter);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🐙 GitHub Explorer</h1>
        <p className="text-muted-foreground mt-1">Discover trending repos, CLI tools, and track your favorites</p>
      </div>

      <Tabs defaultValue="cli" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trending">
            <Star className="w-4 h-4 mr-2" /> Trending
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="w-4 h-4 mr-2" /> Search
          </TabsTrigger>
          <TabsTrigger value="cli">
            <Terminal className="w-4 h-4 mr-2" /> CLI/TUI
          </TabsTrigger>
          <TabsTrigger value="tracked">
            <GitBranch className="w-4 h-4 mr-2" /> Tracked
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trending Repositories</CardTitle>
              <CardDescription>Discover what's popular on GitHub right now</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">Trending repos coming soon</p>
                <p className="text-sm">We&apos;re building the trending explorer. Check back soon!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Repositories</CardTitle>
              <CardDescription>Search GitHub by keyword and filter by language</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search repositories..."
                  />
                </div>
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="rust">Rust</SelectItem>
                    <SelectItem value="go">Go</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                  </SelectContent>
                </Select>
                <Button>
                  <Search className="w-4 h-4 mr-2" /> Search
                </Button>
              </div>
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Enter a query to search GitHub repositories</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cli" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>CLI/TUI Tools</CardTitle>
                  <CardDescription>Awesome developer tools for your terminal</CardDescription>
                </div>
                <Select value={cliCategoryFilter} onValueChange={setCliCategoryFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {cliCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {cliLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading CLI tools...</p>
              ) : filteredCliTools.length === 0 ? (
                <div className="text-center py-16">
                  <Terminal className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-foreground">No CLI tools found</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {cliCategoryFilter !== "all"
                      ? `No tools in category "${cliCategoryFilter}".`
                      : "Tools catalog is empty."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCliTools.map((tool) => (
                    <Card key={tool.id} className="border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{tool.name}</CardTitle>
                            <CardDescription>{tool.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star className="w-3 h-3" />
                            <span>{tool.stars.toLocaleString()}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Badge variant="outline" className="text-xs">{tool.category}</Badge>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono">
                            {tool.installCommand}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleCopyCommand(tool.installCommand)}
                          >
                            {copiedCommand === tool.installCommand ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracked" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tracked Repositories</CardTitle>
                  <CardDescription>Repositories you're monitoring</CardDescription>
                </CardHeader>
                <CardContent>
                  {trackedLoading ? (
                    <p className="text-muted-foreground text-center py-8">Loading...</p>
                  ) : trackedRepos.length === 0 ? (
                    <div className="text-center py-16">
                      <GitBranch className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                      <p className="text-foreground">No tracked repositories</p>
                      <p className="text-muted-foreground text-sm mt-1">Add a repository URL to start tracking.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trackedRepos.map((repo) => (
                        <Card key={repo.id} className="border-border">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-sm">
                                  <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    {repo.fullName}
                                  </a>
                                </CardTitle>
                                <CardDescription>{repo.description || "No description"}</CardDescription>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                                onClick={() => handleUntrackRepo(repo.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3" /> {repo.stars.toLocaleString()}
                            </span>
                            {repo.language && (
                              <Badge variant="outline" className="text-xs">{repo.language}</Badge>
                            )}
                            <span>Added {new Date(repo.addedAt).toLocaleDateString()}</span>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Add Repository</CardTitle>
                  <CardDescription>Track a new GitHub repository</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Repository URL</label>
                    <Input
                      value={newRepoUrl}
                      onChange={(e) => setNewRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                    />
                  </div>
                  {addRepoError && (
                    <p className="text-sm text-red-500">{addRepoError}</p>
                  )}
                  <Button onClick={handleTrackRepo} disabled={addingRepo || !newRepoUrl.trim()} className="w-full">
                    {addingRepo ? "Adding..." : (
                      <>
                        <GitBranch className="w-4 h-4 mr-2" /> Track Repository
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
