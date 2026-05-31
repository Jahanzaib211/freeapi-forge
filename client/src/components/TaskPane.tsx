import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, RefreshCw, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Task {
  id: number;
  name: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  currentStep: string | null;
  duration: string | null;
  createdAt: string;
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
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.result?.data?.json ?? data ?? [];
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

const statusBadgeClasses: Record<string, string> = {
  queued: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700",
  running: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 animate-pulse",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-600",
};

const statusIcon: Record<string, React.ReactNode> = {
  queued: <Clock className="size-3" />,
  running: <Loader2 className="size-3 animate-spin" />,
  completed: <CheckCircle2 className="size-3" />,
  failed: <XCircle className="size-3" />,
  cancelled: <XCircle className="size-3" />,
};

export default function TaskPane({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { getToken } = useAuth();
  const token = getToken();

  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadTasks = async () => {
    if (!token) return;
    const { query } = api(token);
    const data = await query("task.getActiveTasks");
    const tasks = Array.isArray(data) ? data : data?.result?.data?.json ?? [];
    setActiveTasks(tasks);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    loadTasks();
    const interval = setInterval(loadTasks, 3000);
    return () => clearInterval(interval);
  }, [open, token]);

  const cancelTask = async (taskId: number) => {
    if (!token) return;
    setCancellingId(taskId);
    const { mutate } = api(token);
    await mutate("task.cancel", { taskId });
    setCancellingId(null);
    loadTasks();
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-card border-l border-border z-50 shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Active Tasks</h2>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" />
                Loading tasks...
              </div>
            )}

            {!loading && activeTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="size-10 mb-3 opacity-40" />
                <p className="text-sm">No active tasks</p>
              </div>
            )}

            {!loading &&
              activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-border bg-card p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {task.name}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${statusBadgeClasses[task.status] ?? ""}`}
                    >
                      <span className="flex items-center gap-1">
                        {statusIcon[task.status]}
                        {task.status}
                      </span>
                    </Badge>
                  </div>

                  {task.currentStep && (
                    <p className="text-xs text-muted-foreground truncate">
                      {task.currentStep}
                    </p>
                  )}

                  <Progress value={task.progress} className="h-1.5" />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {task.progress}%
                    </span>
                    {task.duration && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {task.duration}
                      </span>
                    )}
                  </div>

                  {(task.status === "queued" || task.status === "running") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-destructive"
                      disabled={cancellingId === task.id}
                      onClick={() => cancelTask(task.id)}
                    >
                      {cancellingId === task.id ? (
                        <>
                          <Loader2 className="size-3 animate-spin mr-1" />
                          Cancelling...
                        </>
                      ) : (
                        "Cancel"
                      )}
                    </Button>
                  )}
                </div>
              ))}
          </div>

          <div className="p-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={loadTasks}
              disabled={loading}
            >
              <RefreshCw className={`size-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
