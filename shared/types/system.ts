export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  rss: number;
}

export interface AIProcessInfo {
  name: string;
  pid: number;
  command: string;
  type: "ollama" | "python" | "llama-server" | "vllm" | "lm-studio" | "other";
}

export interface GpuInfo {
  index: number;
  utilizationGpu: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
  powerDraw: number;
  fanSpeed: number;
}

export interface GpuProcess {
  pid: number;
  processName: string;
  usedMemory: number;
}

export interface SystemStats {
  hostname: string;
  platform: string;
  uptime: number;
  cpu: {
    cores: Array<{
      model: string;
      speed: number;
      usage: number;
    }>;
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
  topProcesses: ProcessInfo[];
  aiProcesses: AIProcessInfo[];
  timestamp: number;
}
