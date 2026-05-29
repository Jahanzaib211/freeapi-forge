import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  GitBranch,
  Tag,
  Clock,
  Loader2,
  Pencil,
  Trash2,
  FileText,
  History,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-slate-600/20 text-slate-400 border-slate-600/50",
  coding: "bg-purple-600/20 text-purple-400 border-purple-600/50",
  writing: "bg-blue-600/20 text-blue-400 border-blue-600/50",
  analysis: "bg-green-600/20 text-green-400 border-green-600/50",
  creative: "bg-pink-600/20 text-pink-400 border-pink-600/50",
  data: "bg-yellow-600/20 text-yellow-400 border-yellow-600/50",
};

const CATEGORIES = ["general", "coding", "writing", "analysis", "creative", "data"];

export default function PromptLibrary() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [showVersions, setShowVersions] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formTags, setFormTags] = useState("");

  const utils = trpc.useContext();
  const promptsQuery = trpc.prompts.list.useQuery({
    search: search || undefined,
    category: categoryFilter || undefined,
  });

  const createMutation = trpc.prompts.create.useMutation({
    onSuccess: () => {
      utils.prompts.list.invalidate();
      setShowCreate(false);
      resetForm();
    },
  });

  const updateMutation = trpc.prompts.update.useMutation({
    onSuccess: () => {
      utils.prompts.list.invalidate();
      setEditingPrompt(null);
      resetForm();
    },
  });

  const deleteMutation = trpc.prompts.delete.useMutation({
    onSuccess: () => utils.prompts.list.invalidate(),
  });

  const forkMutation = trpc.prompts.create.useMutation({
    onSuccess: () => {
      utils.prompts.list.invalidate();
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormContent("");
    setFormCategory("general");
    setFormTags("");
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEdit = (prompt: any) => {
    setFormName(prompt.name);
    setFormContent(prompt.content);
    setFormCategory(prompt.category);
    setFormTags(prompt.tags?.join(", ") || "");
    setEditingPrompt(prompt);
  };

  const handleSave = () => {
    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (editingPrompt) {
      updateMutation.mutate({
        id: editingPrompt.id,
        content: formContent,
        category: formCategory,
        tags,
      });
    } else {
      createMutation.mutate({
        name: formName,
        content: formContent,
        category: formCategory,
        tags,
      });
    }
  };

  const handleFork = (prompt: any) => {
    forkMutation.mutate({
      name: prompt.name + " (fork)",
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags || [],
      forkedFrom: prompt.id,
    });
  };

  const prompts = promptsQuery.data?.prompts ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
            Prompt Library
          </h1>
          <p className="text-slate-400 text-lg">
            Create, manage, and version your AI prompts
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search prompts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700/50 text-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={categoryFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("")}
              className={categoryFilter === "" ? "bg-blue-600 text-white" : "border-slate-700 text-slate-300"}
            >
              All
            </Button>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className={categoryFilter === cat ? "bg-blue-600 text-white" : "border-slate-700 text-slate-300 capitalize"}
              >
                {cat}
              </Button>
            ))}
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> New Prompt
          </Button>
        </div>

        {promptsQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : prompts.length === 0 ? (
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No prompts yet. Create your first prompt to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((prompt) => (
              <Card key={prompt.id} className="bg-slate-800/30 border-slate-700/50 backdrop-blur hover:border-slate-600/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-white text-base">{prompt.name}</CardTitle>
                    <Badge className={`${CATEGORY_COLORS[prompt.category] || CATEGORY_COLORS.general} text-[10px]`}>
                      {prompt.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-slate-400 text-sm line-clamp-3">{prompt.content}</p>
                  {prompt.tags && prompt.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {prompt.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                          <Tag className="w-2 h-2 mr-1" />{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> v{prompt.version}
                    </span>
                    <span>{new Date(prompt.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 border-slate-700 text-slate-300" onClick={() => openEdit(prompt)}>
                      <Pencil className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 border-slate-700 text-slate-300" onClick={() => handleFork(prompt)}>
                      <GitBranch className="w-3 h-3 mr-1" />Fork
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 border-slate-700 text-slate-300" onClick={() => setShowVersions(prompt)}>
                      <History className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 border-slate-700 text-red-400 hover:text-red-300 ml-auto" onClick={() => deleteMutation.mutate({ id: prompt.id })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreate || !!editingPrompt} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditingPrompt(null); } }}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">{editingPrompt ? "Edit Prompt" : "Create Prompt"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={!!editingPrompt}
                  placeholder="e.g. code-reviewer"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Content</label>
                <Textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write your prompt here..."
                  rows={8}
                  className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Tags (comma-separated)</label>
                  <Input
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="e.g. review, typescript"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditingPrompt(null); }} className="border-slate-700 text-slate-300">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!formName || !formContent}>
                {editingPrompt ? "Save Version" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!showVersions} onOpenChange={(open) => { if (!open) setShowVersions(null); }}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Version History: {showVersions?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-slate-400 text-sm">
              <p>Version: {showVersions?.version}</p>
              <p className="mt-2 text-xs text-slate-500">Full version history requires loading all versions from the database.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
