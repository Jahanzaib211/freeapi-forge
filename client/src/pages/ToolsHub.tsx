import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  Database,
  Shield,
  Plus,
  Globe,
  TestTube,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  Activity,
} from "lucide-react";

export default function ToolsHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [vectorDialogOpen, setVectorDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const searchProviders = [
    { id: "1", name: "Brave Search", type: "web", status: "active", spend: 12.50, queries: 1240 },
    { id: "2", name: "Tavily", type: "web", status: "active", spend: 8.30, queries: 890 },
    { id: "3", name: "SerpAPI", type: "web", status: "inactive", spend: 0, queries: 0 },
  ];

  const vectorStores = [
    { id: "1", name: "Main Store", provider: "Qdrant", collections: 5, docs: 12400, status: "healthy" },
    { id: "2", name: "Docs Store", provider: "Milvus", collections: 2, docs: 3200, status: "healthy" },
  ];

  const policies = [
    { id: "1", name: "Default Policy", teams: ["engineering", "research"], allowedTools: ["search", "code_exec"], deniedTools: [] },
    { id: "2", name: "Restricted Policy", teams: ["support"], allowedTools: ["search"], deniedTools: ["code_exec", "file_write"] },
  ];

  const handleTestSearch = () => {
    setTestResult(null);
    setTimeout(() => {
      setTestResult({ ok: true, msg: "Search returned 8 results in 340ms" });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Tools Hub</h1>
          <p className="text-slate-400 text-lg">Manage search providers, vector stores, and tool policies</p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
            <TabsTrigger value="search" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Search className="w-4 h-4 mr-2" /> Search Tools
            </TabsTrigger>
            <TabsTrigger value="vectors" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Database className="w-4 h-4 mr-2" /> Vector Stores
            </TabsTrigger>
            <TabsTrigger value="policies" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Shield className="w-4 h-4 mr-2" /> Tool Policies
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Active Providers</span>
                    <Globe className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">{searchProviders.filter(p => p.status === "active").length}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Total Queries</span>
                    <Activity className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">{searchProviders.reduce((a, p) => a + p.queries, 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Total Spend</span>
                    <DollarSign className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">${searchProviders.reduce((a, p) => a + p.spend, 0).toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Search Providers</CardTitle>
                    <CardDescription>Register and manage web search providers</CardDescription>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-2" /> Add Provider</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                      <TableHead className="text-slate-300">Provider</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Queries</TableHead>
                      <TableHead className="text-slate-300">Spend</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchProviders.map((p) => (
                      <TableRow key={p.id} className="border-slate-700/50 hover:bg-slate-700/30">
                        <TableCell className="font-medium text-white">{p.name}</TableCell>
                        <TableCell>
                          <Badge className={p.status === "active" ? "bg-green-600/20 text-green-400 border-green-600/50" : "bg-slate-600/20 text-slate-400 border-slate-600/50"}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">{p.queries.toLocaleString()}</TableCell>
                        <TableCell className="text-slate-300">${p.spend.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white">Test Query</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter a search query to test..."
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Button onClick={handleTestSearch} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <TestTube className="w-4 h-4 mr-2" /> Test
                  </Button>
                </div>
                {testResult && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.ok ? "bg-green-900/30 border border-green-700/50 text-green-400" : "bg-red-900/30 border border-red-700/50 text-red-400"}`}>
                    {testResult.ok ? <CheckCircle2 className="w-4 h-4 inline mr-2" /> : <XCircle className="w-4 h-4 inline mr-2" />}
                    {testResult.msg}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vectors" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Vector Store Configurations</h2>
              <Dialog open={vectorDialogOpen} onOpenChange={setVectorDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-2" /> Add Vector Store</Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add Vector Store</DialogTitle>
                    <DialogDescription>Configure a new vector store provider.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label className="text-slate-300">Name</Label>
                      <Input placeholder="My Vector Store" className="bg-slate-700 border-slate-600 text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-slate-300">Provider</Label>
                      <Select>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="qdrant">Qdrant</SelectItem>
                          <SelectItem value="milvus">Milvus</SelectItem>
                          <SelectItem value="pinecone">Pinecone</SelectItem>
                          <SelectItem value="weaviate">Weaviate</SelectItem>
                          <SelectItem value="chroma">Chroma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Connection URL</Label>
                      <Input placeholder="http://localhost:6333" className="bg-slate-700 border-slate-600 text-white mt-1" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setVectorDialogOpen(false)} className="border-slate-600 text-slate-300">Cancel</Button>
                    <Button onClick={() => setVectorDialogOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white">Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vectorStores.map((vs) => (
                <Card key={vs.id} className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
                  <CardHeader className="border-b border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">{vs.name}</CardTitle>
                      <Badge className="bg-green-600/20 text-green-400 border-green-600/50">{vs.status}</Badge>
                    </div>
                    <CardDescription className="text-slate-400">{vs.provider}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Collections</span>
                      <span className="text-white font-medium">{vs.collections}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Documents</span>
                      <span className="text-white font-medium">{vs.docs.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                        <TestTube className="w-3 h-3 mr-1" /> Test Retrieval
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                        <Settings className="w-3 h-3 mr-1" /> Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Tool Access Policies</h2>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-2" /> Create Policy</Button>
            </div>

            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                      <TableHead className="text-slate-300">Policy</TableHead>
                      <TableHead className="text-slate-300">Teams</TableHead>
                      <TableHead className="text-slate-300">Allowed Tools</TableHead>
                      <TableHead className="text-slate-300">Denied Tools</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((pol) => (
                      <TableRow key={pol.id} className="border-slate-700/50 hover:bg-slate-700/30">
                        <TableCell className="font-medium text-white">{pol.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {pol.teams.map((t) => (
                              <Badge key={t} variant="outline" className="border-slate-600 text-slate-300 text-xs">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {pol.allowedTools.map((t) => (
                              <Badge key={t} className="bg-green-600/20 text-green-400 border-green-600/50 text-xs">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {pol.deniedTools.length === 0 ? (
                              <span className="text-slate-500 text-xs">None</span>
                            ) : pol.deniedTools.map((t) => (
                              <Badge key={t} className="bg-red-600/20 text-red-400 border-red-600/50 text-xs">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
