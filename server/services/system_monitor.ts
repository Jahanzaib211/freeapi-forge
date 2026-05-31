import os from "os";
import { execSync } from "child_process";
import fs from "fs";

interface CpuCore {
  model: string;
  speed: number;
  usage: number;
  times: { user: number; nice: number; sys: number; idle: number; irq: number };
}

interface GpuInfo {
  index: number;
  utilizationGpu: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
  powerDraw: number;
  fanSpeed: number;
}

interface GpuProcess {
  pid: number;
  processName: string;
  usedMemory: number;
}

interface TopProcess {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  rss: number;
}

interface AiProcess {
  name: string;
  pid: number;
  command: string;
  type: "ollama" | "python" | "llama-server" | "vllm" | "lm-studio" | "other";
}

interface SystemStats {
  hostname: string;
  platform: string;
  uptime: number;
  cpu: {
    cores: CpuCore[];
    model: string;
    physicalCores: number;
    totalUsage: number;
    loadAvg: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usedPercent: number;
    totalSwap: number;
    freeSwap: number;
    usedSwap: number;
    swapUsedPercent: number;
  };
  gpu: GpuInfo[];
  gpuProcesses: GpuProcess[];
  topProcesses: TopProcess[];
  aiProcesses: AiProcess[];
  timestamp: number;
}

const AI_PROCESS_PATTERNS = [
  { pattern: /ollama/i, type: "ollama" as const },
  { pattern: /python/i, type: "python" as const },
  { pattern: /llama[-_]?server/i, type: "llama-server" as const },
  { pattern: /vllm/i, type: "vllm" as const },
  { pattern: /lm[-_]?studio/i, type: "lm-studio" as const },
];

function getCpuUsage(): CpuCore[] {
  const cpus = os.cpus();
  return cpus.map((cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    const usage = total > 0 ? ((total - idle) / total) * 100 : 0;
    return {
      model: cpu.model,
      speed: cpu.speed,
      usage: Math.round(usage * 100) / 100,
      times: cpu.times,
    };
  });
}

function getMemoryStats() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  let totalSwap = 0;
  let freeSwap = 0;

  try {
    const meminfo = fs.readFileSync("/proc/meminfo", "utf-8");
    const totalMatch = meminfo.match(/SwapTotal:\s+(\d+)/);
    const freeMatch = meminfo.match(/SwapFree:\s+(\d+)/);
    if (totalMatch) totalSwap = parseInt(totalMatch[1], 10) * 1024;
    if (freeMatch) freeSwap = parseInt(freeMatch[1], 10) * 1024;
  } catch {
    // Swap info unavailable
  }

  const usedSwap = totalSwap - freeSwap;

  return {
    total: totalMem,
    free: freeMem,
    used: usedMem,
    usedPercent: totalMem > 0 ? Math.round((usedMem / totalMem) * 10000) / 100 : 0,
    totalSwap,
    freeSwap,
    usedSwap,
    swapUsedPercent: totalSwap > 0 ? Math.round((usedSwap / totalSwap) * 10000) / 100 : 0,
  };
}

function getGpuInfo(): GpuInfo[] {
  try {
    const output = execSync(
      "nvidia-smi --query-gpu=index,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,fan.speed --format=csv,noheader,nounits",
      { encoding: "utf-8", timeout: 5000 }
    );

    return output
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split(",").map((s) => s.trim());
        return {
          index: parseInt(parts[0], 10),
          utilizationGpu: parseFloat(parts[1]) || 0,
          memoryUsed: parseInt(parts[2], 10) || 0,
          memoryTotal: parseInt(parts[3], 10) || 0,
          temperature: parseFloat(parts[4]) || 0,
          powerDraw: parseFloat(parts[5]) || 0,
          fanSpeed: parseFloat(parts[6]) || 0,
        };
      });
  } catch {
    return [];
  }
}

function getGpuProcesses(): GpuProcess[] {
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
        const parts = line.split(",").map((s) => s.trim());
        return {
          pid: parseInt(parts[0], 10),
          processName: parts[1] || "unknown",
          usedMemory: parseInt(parts[2], 10) || 0,
        };
      });
  } catch {
    return [];
  }
}

function getTopProcesses(limit: number = 10): TopProcess[] {
  try {
    const output = execSync(
      "ps -eo pid,comm,%cpu,%mem,rss --sort=-%cpu | head -n " + (limit + 1),
      { encoding: "utf-8", timeout: 5000 }
    );

    const lines = output.trim().split("\n");
    const processes: TopProcess[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length >= 5) {
        processes.push({
          pid: parseInt(parts[0], 10),
          name: parts[1],
          cpu: parseFloat(parts[2]) || 0,
          mem: parseFloat(parts[3]) || 0,
          rss: parseInt(parts[4], 10) || 0,
        });
      }
    }

    return processes;
  } catch {
    return [];
  }
}

function getAiProcesses(): AiProcess[] {
  try {
    const output = execSync(
      "ps -eo pid,comm,args --no-headers",
      { encoding: "utf-8", timeout: 5000 }
    );

    const aiProcesses: AiProcess[] = [];
    const lines = output.trim().split("\n");

    for (const line of lines) {
      const parts = line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/);
      if (!parts) continue;

      const pid = parseInt(parts[1], 10);
      const comm = parts[2];
      const args = parts[3];

      for (const { pattern, type } of AI_PROCESS_PATTERNS) {
        if (pattern.test(comm) || pattern.test(args)) {
          aiProcesses.push({ name: comm, pid, command: args, type });
          break;
        }
      }
    }

    return aiProcesses;
  } catch {
    return [];
  }
}

export function getSystemStats(): SystemStats {
  const cores = getCpuUsage();
  const totalUsage = cores.reduce((sum, c) => sum + c.usage, 0) / (cores.length || 1);

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: os.uptime(),
    cpu: {
      cores,
      model: cores[0]?.model || "unknown",
      physicalCores: os.cpus().length,
      totalUsage: Math.round(totalUsage * 100) / 100,
      loadAvg: os.loadavg(),
    },
    memory: getMemoryStats(),
    gpu: getGpuInfo(),
    gpuProcesses: getGpuProcesses(),
    topProcesses: getTopProcesses(),
    aiProcesses: getAiProcesses(),
    timestamp: Date.now(),
  };
}

interface WebSocketLike {
  readyState: number;
  send(data: string): void;
}

interface WebSocketServerLike {
  clients: Set<WebSocketLike>;
  on(event: string, listener: (...args: any[]) => void): void;
}

export function startSystemMonitor(wss: WebSocketServerLike): NodeJS.Timeout {
  const interval = setInterval(() => {
    const stats = getSystemStats();
    const data = JSON.stringify({ type: "system_stats", data: stats });

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }, 2000);

  return interval;
}
