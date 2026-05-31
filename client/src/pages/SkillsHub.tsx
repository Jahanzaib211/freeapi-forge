import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Puzzle,
  Play,
  Code,
  FileText,
  Loader2,
  Plus,
  ChevronRight,
  Terminal,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const CATEGORY_COLORS: Record<string, string> = {
  automation: "bg-blue-600/20 text-blue-400 border-blue-600/50",
  coding: "bg-purple-600/20 text-purple-400 border-purple-600/50",
  devops: "bg-green-600/20 text-green-400 border-green-600/50",
  data: "bg-yellow-600/20 text-yellow-400 border-yellow-600/50",
  general: "bg-slate-600/20 text-slate-400 border-slate-600/50",
};

function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge className={`${CATEGORY_COLORS[category] || CATEGORY_COLORS.general} text-[10px]`}>
      {category}
    </Badge>
  );
}

export default function SkillsHub() {
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newSkillMd, setNewSkillMd] = useState("");
  const [liveOutput, setLiveOutput] = useState("");
  const [executing, setExecuting] = useState(false);

  const listQuery = trpc.skills.list.useQuery(undefined);
  const utils = trpc.useUtils();

  const syncMut = trpc.skills.sync.useMutation({
    onSuccess: () => {
      utils.skills.list.invalidate();
    },
  });

  const createMut = trpc.skills.sync.useMutation({
    onSuccess: () => {
      utils.skills.list.invalidate();
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewCategory("general");
      setNewSkillMd("");
    },
  });

  const executeMut = trpc.skills.execute.useMutation({
    onMutate: () => {
      setExecuting(true);
      setLiveOutput("");
    },
    onSuccess: (data) => {
      setLiveOutput(data?.output || "No output");
      setExecuting(false);
    },
    onError: (err) => {
      setLiveOutput(`Error: ${err.message}`);
      setExecuting(false);
    },
  });

  const skills = listQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              Skills Hub
            </h1>
            <p className="text-slate-400 text-lg">
              Browse, create, and execute skills
            </p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
          >
            {syncMut.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync Skills
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {skills.map((skill: any) => (
            <Card
              key={skill.name}
              className="bg-slate-800/30 border-slate-700/50 backdrop-blur hover:border-slate-500/50 transition-colors cursor-pointer group"
              onClick={() => setSelectedSkill(skill)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-700/50 rounded-lg group-hover:bg-blue-600/20 transition-colors">
                      <Puzzle className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                    </div>
                    <CardTitle className="text-white text-sm">{skill.name}</CardTitle>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {skill.description || "No description"}
                </p>
                <div className="flex items-center justify-between">
                  <CategoryBadge category={skill.category || "general"} />
                  {skill.scripts && (
                    <span className="text-[10px] text-slate-500">
                      {skill.scripts.length} script{skill.scripts.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {skills.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-500">
              No skills installed. Create one to get started.
            </div>
          )}
        </div>

        {/* Skill Detail Dialog */}
        <Dialog open={!!selectedSkill} onOpenChange={() => setSelectedSkill(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-blue-400" />
                {selectedSkill?.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {selectedSkill?.description}
              </DialogDescription>
            </DialogHeader>
            {selectedSkill && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={selectedSkill.category || "general"} />
                </div>

                {selectedSkill.skillMd && (
                  <div className="p-4 bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">SKILL.md</span>
                    </div>
                    <div className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                      {selectedSkill.skillMd}
                    </div>
                  </div>
                )}

                {selectedSkill.scripts && selectedSkill.scripts.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                      <Code className="w-3 h-3" />
                      Scripts
                    </p>
                    <div className="space-y-1">
                      {selectedSkill.scripts.map((script: string, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                          <code className="text-xs text-slate-300">{script}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() =>
                    executeMut.mutate({ name: selectedSkill.name })
                  }
                  disabled={executing}
                >
                  {executing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Execute
                </Button>

                {liveOutput && (
                  <div className="p-3 bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="w-3 h-3 text-green-400" />
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Output</span>
                    </div>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap overflow-auto max-h-48 font-mono">
                      {liveOutput}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Skill Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Create Skill</DialogTitle>
              <DialogDescription className="text-slate-400">
                Define a new skill with metadata and SKILL.md
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="my-skill"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Description</label>
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What this skill does..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Category</label>
                <div className="flex gap-2 flex-wrap">
                  {["general", "automation", "coding", "devops", "data"].map((cat) => (
                    <Button
                      key={cat}
                      variant="outline"
                      size="sm"
                      className={`border-slate-600 text-xs ${
                        newCategory === cat
                          ? "bg-blue-600/20 text-blue-400 border-blue-600/50"
                          : "text-slate-400"
                      }`}
                      onClick={() => setNewCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">SKILL.md Content</label>
                <Textarea
                  value={newSkillMd}
                  onChange={(e) => setNewSkillMd(e.target.value)}
                  placeholder="# My Skill&#10;&#10;Instructions here..."
                  className="bg-slate-700 border-slate-600 text-white font-mono text-xs min-h-[120px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending}
              >
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Skill
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
