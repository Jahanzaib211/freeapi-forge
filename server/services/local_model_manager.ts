import { execSync } from "child_process";
import http from "http";

interface LocalModel {
  name: string;
  displayName: string;
  port: number;
  modelPath: string;
  gpuLayers: number;
  contextSize: number;
  vramEstimateMb: number;
  pm2Name: string;
  status: "loaded" | "available" | "starting" | "error";
  pid: number | null;
  uptime: number | null;
  memoryMb: number | null;
}

interface GpuStatus {
  totalMb: number;
  usedMb: number;
  freeMb: number;
  temperature: number;
  utilization: number;
  powerDraw: number;
}

const MODEL_REGISTRY: Omit<LocalModel, "status" | "pid" | "uptime" | "memoryMb">[] = [
  {
    name: "deepseek-coder-v2-lite",
    displayName: "DeepSeek Coder V2 Lite",
    port: 8085,
    modelPath: "/home/jahanzaib/models/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf",
    gpuLayers: 10,
    contextSize: 16384,
    vramEstimateMb: 3600,
    pm2Name: "llama-deepseek-coder-lite",
  },
  {
    name: "qwen-14b-moe",
    displayName: "Qwen 14B MoE (Claude-distilled)",
    port: 8082,
    modelPath: "/home/jahanzaib/models/qwen-moe/Qwen3.5-14B-A3B-Claude-4.6-Opus-Reasoning-Distilled-reap-Q4_K_M-GGUF/qwen3.5-14b-a3b-claude-4.6-opus-reasoning-distilled-reap-q4_k_m.gguf",
    gpuLayers: 65,
    contextSize: 65536,
    vramEstimateMb: 4500,
    pm2Name: "llama-qwen-moe",
  },
  {
    name: "qwopus-9b-mtp",
    displayName: "Qwopus 9B Coder MTP",
    port: 8083,
    modelPath: "/home/jahanzaib/models/Qwopus3.5-9B-Coder-MTP-Q6_K.gguf",
    gpuLayers: 99,
    contextSize: 65536,
    vramEstimateMb: 5500,
    pm2Name: "llama-qwopus-mtp",
  },
];

const HEALTH_CHECK_TIMEOUT = 3000;

class LocalModelManager {
  private models: LocalModel[];
  private activeModelName: string | null = null;
  private switchInProgress = false;

  constructor() {
    this.models = MODEL_REGISTRY.map((m) => ({
      ...m,
      status: "available" as const,
      pid: null,
      uptime: null,
      memoryMb: null,
    }));
  }

  listModels(): LocalModel[] {
    this.refreshStatuses();
    return this.models;
  }

  getActiveModel(): LocalModel | null {
    this.refreshStatuses();
    return this.models.find((m) => m.status === "loaded") || null;
  }

  getActiveModelPort(): number | null {
    const active = this.getActiveModel();
    return active?.port ?? null;
  }

  isSwitching(): boolean {
    return this.switchInProgress;
  }

  async switchModel(modelName: string): Promise<{ success: boolean; message: string; model: LocalModel | null }> {
    if (this.switchInProgress) {
      return { success: false, message: "Model switch already in progress", model: null };
    }

    const target = this.models.find((m) => m.name === modelName);
    if (!target) {
      return { success: false, message: `Unknown model: ${modelName}`, model: null };
    }

    this.switchInProgress = true;

    try {
      const gpu = this.getGpuStatus();
      if (gpu && target.vramEstimateMb > gpu.freeMb + 500) {
        return {
          success: false,
          message: `Insufficient VRAM: need ${target.vramEstimateMb}MB, only ${gpu.freeMb}MB free. Stop other GPU processes first.`,
          model: null,
        };
      }

      const currentActive = this.getActiveModel();
      if (currentActive?.name === modelName) {
        return { success: false, message: `${target.displayName} is already active`, model: target };
      }

      if (currentActive) {
        console.log(`[LocalModel] Stopping ${currentActive.displayName} (port ${currentActive.port})...`);
        this.stopModel(currentActive);
        await this.waitForPortFree(currentActive.port, 10000);
      }

      console.log(`[LocalModel] Starting ${target.displayName} (port ${target.port})...`);
      this.startModel(target);
      await this.waitForHealth(target.port, 30000);

      this.activeModelName = target.name;
      this.refreshStatuses();

      console.log(`[LocalModel] ${target.displayName} is now active on port ${target.port}`);
      return { success: true, message: `${target.displayName} activated on port ${target.port}`, model: target };
    } catch (error: any) {
      console.error(`[LocalModel] Switch failed:`, error.message);
      return { success: false, message: `Switch failed: ${error.message}`, model: null };
    } finally {
      this.switchInProgress = false;
    }
  }

  async stopModel(model: LocalModel): Promise<void> {
    try {
      execSync(`pm2 stop ${model.pm2Name} 2>/dev/null || true`, { encoding: "utf-8", timeout: 10000 });
      execSync(`pm2 delete ${model.pm2Name} 2>/dev/null || true`, { encoding: "utf-8", timeout: 10000 });
    } catch {
      // Process may not exist
    }
  }

  private startModel(model: LocalModel): void {
    const args = [
      model.modelPath,
      "--host", "127.0.0.1",
      "--port", String(model.port),
      "-ngl", String(model.gpuLayers),
      "--ctx-size", String(model.contextSize),
      "--batch-size", "512",
      "--flash-attn", "on",
      "--parallel", "1",
      "--cache-type-k", "q4_0",
      "--cache-type-v", "q4_0",
      "--reasoning-format", "none",
    ].join(" ");

    execSync(
      `pm2 start /home/jahanzaib/llama.cpp/build/bin/llama-server --name ${model.pm2Name} -- ${args}`,
      { encoding: "utf-8", timeout: 15000 }
    );
  }

  private refreshStatuses(): void {
    try {
      const output = execSync("pm2 jlist", { encoding: "utf-8", timeout: 5000 });
      const processes: any[] = JSON.parse(output);

      const pm2Map = new Map<string, any>();
      for (const proc of processes) {
        pm2Map.set(proc.name, proc);
      }

      for (const model of this.models) {
        const proc = pm2Map.get(model.pm2Name);
        if (proc && proc.pm2_env?.status === "online") {
          model.status = "loaded";
          model.pid = proc.pid;
          model.uptime = proc.pm2_env?.pm_uptime || null;
          model.memoryMb = proc.monit?.memory ? Math.round(proc.monit.memory / 1024 / 1024) : null;
        } else if (proc && proc.pm2_env?.status === "errored") {
          model.status = "error";
          model.pid = null;
          model.uptime = null;
          model.memoryMb = null;
        } else {
          model.status = "available";
          model.pid = null;
          model.uptime = null;
          model.memoryMb = null;
        }
      }

      this.activeModelName = this.models.find((m) => m.status === "loaded")?.name ?? null;
    } catch {
      // PM2 not available, keep cached states
    }
  }

  private async waitForHealth(port: number, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await this.checkPort(port)) {
        try {
          const healthy = await this.httpGet(`http://127.0.0.1:${port}/health`, 2000);
          if (healthy) return;
        } catch {
          // Health endpoint may not exist, port open is enough
          return;
        }
      }
      await sleep(1000);
    }

    throw new Error(`Model server on port ${port} did not become healthy within ${timeoutMs}ms`);
  }

  private async waitForPortFree(port: number, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!(await this.checkPort(port))) return;
      await sleep(500);
    }
  }

  private checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/v1/models`, { timeout: 1000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
    });
  }

  private httpGet(url: string, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
    });
  }

  getGpuStatus(): GpuStatus | null {
    try {
      const output = execSync(
        "nvidia-smi --query-gpu=memory.total,memory.used,memory.free,temperature.gpu,utilization.gpu,power.draw --format=csv,noheader,nounits",
        { encoding: "utf-8", timeout: 5000 }
      );
      const [total, used, free, temp, util, power] = output.trim().split(",").map((s) => parseInt(s.trim(), 10));
      return {
        totalMb: total,
        usedMb: used,
        freeMb: free,
        temperature: temp,
        utilization: util,
        powerDraw: power,
      };
    } catch {
      return null;
    }
  }

  getGpuProcesses(): { pid: number; name: string; memoryMb: number }[] {
    try {
      const output = execSync(
        "nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv,noheader,nounits",
        { encoding: "utf-8", timeout: 5000 }
      );
      return output
        .trim()
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [pid, name, mem] = line.split(",").map((s) => s.trim());
          return { pid: parseInt(pid, 10), name, memoryMb: parseInt(mem, 10) };
        });
    } catch {
      return [];
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const localModelManager = new LocalModelManager();
