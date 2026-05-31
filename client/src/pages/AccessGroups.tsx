import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Shield,
  Cpu,
  Server,
  Bot,
  Loader2,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const allModels = [
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-opus",
  "claude-3-sonnet",
  "llama-3-70b",
  "mixtral-8x7b",
];
const allMcp = ["filesystem", "postgres", "github", "slack"];
const allAgents = ["Code Assistant", "Data Analyst", "Support Bot"];

export default function AccessGroups() {
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedMcp, setSelectedMcp] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const utils = trpc.useContext();
  const groupsQuery = trpc.organizations.accessGroups.list.useQuery();
  const createMutation = trpc.organizations.accessGroups.create.useMutation({
    onSuccess: () => {
      utils.organizations.accessGroups.list.invalidate();
      setCreateOpen(false);
      setFormName("");
      setSelectedModels([]);
      setSelectedMcp([]);
      setSelectedAgents([]);
    },
  });
  const deleteMutation = trpc.organizations.accessGroups.delete.useMutation({
    onSuccess: () => {
      utils.organizations.accessGroups.list.invalidate();
    },
  });

  const groups = groupsQuery.data ?? [];

  const toggleItem = (
    list: string[],
    setList: (v: string[]) => void,
    item: string,
  ) => {
    setList(
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item],
    );
  };

  const handleCreate = () => {
    if (!formName.trim()) return;
    createMutation.mutate({
      name: formName.trim(),
      models: selectedModels,
      mcpServers: selectedMcp,
      agents: selectedAgents,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              Access Groups
            </h1>
            <p className="text-slate-400 text-lg">
              Manage resource access permissions
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Create Access Group
                </DialogTitle>
                <DialogDescription>
                  Define which resources this group can access.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-slate-300">Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="My Access Group"
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Models</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {allModels.map((m) => (
                      <Badge
                        key={m}
                        variant={
                          selectedModels.includes(m) ? "default" : "outline"
                        }
                        className={`cursor-pointer ${
                          selectedModels.includes(m)
                            ? "bg-blue-600 text-white"
                            : "border-slate-600 text-slate-300 hover:bg-slate-700"
                        }`}
                        onClick={() =>
                          toggleItem(
                            selectedModels,
                            setSelectedModels,
                            m,
                          )
                        }
                      >
                        <Cpu className="w-3 h-3 mr-1" /> {m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">MCP Servers</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {allMcp.map((s) => (
                      <Badge
                        key={s}
                        variant={
                          selectedMcp.includes(s) ? "default" : "outline"
                        }
                        className={`cursor-pointer ${
                          selectedMcp.includes(s)
                            ? "bg-blue-600 text-white"
                            : "border-slate-600 text-slate-300 hover:bg-slate-700"
                        }`}
                        onClick={() =>
                          toggleItem(selectedMcp, setSelectedMcp, s)
                        }
                      >
                        <Server className="w-3 h-3 mr-1" /> {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Agents</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {allAgents.map((a) => (
                      <Badge
                        key={a}
                        variant={
                          selectedAgents.includes(a) ? "default" : "outline"
                        }
                        className={`cursor-pointer ${
                          selectedAgents.includes(a)
                            ? "bg-blue-600 text-white"
                            : "border-slate-600 text-slate-300 hover:bg-slate-700"
                        }`}
                        onClick={() =>
                          toggleItem(
                            selectedAgents,
                            setSelectedAgents,
                            a,
                          )
                        }
                      >
                        <Bot className="w-3 h-3 mr-1" /> {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white">All Access Groups</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {groupsQuery.isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-300">Name</TableHead>
                    <TableHead className="text-slate-300">Models</TableHead>
                    <TableHead className="text-slate-300">
                      MCP Servers
                    </TableHead>
                    <TableHead className="text-slate-300">Agents</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.length === 0 ? (
                    <TableRow className="border-slate-700/50">
                      <TableCell
                        colSpan={5}
                        className="text-center text-slate-400 py-8"
                      >
                        No access groups created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    groups.map((group: any) => (
                      <TableRow
                        key={group.id}
                        className="border-slate-700/50 hover:bg-slate-700/30"
                      >
                        <TableCell className="font-medium text-white">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            {group.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {group.models?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {group.models.map((m: string) => (
                                <Badge
                                  key={m}
                                  variant="outline"
                                  className="border-slate-600 text-slate-300 text-xs"
                                >
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {group.mcpServers?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {group.mcpServers.map((s: string) => (
                                <Badge
                                  key={s}
                                  variant="outline"
                                  className="border-slate-600 text-slate-300 text-xs"
                                >
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {group.agents?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {group.agents.map((a: string) => (
                                <Badge
                                  key={a}
                                  variant="outline"
                                  className="border-slate-600 text-slate-300 text-xs"
                                >
                                  {a}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-red-700/50 hover:text-red-400 hover:border-red-600"
                            onClick={() =>
                              deleteMutation.mutate({ id: group.id })
                            }
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
