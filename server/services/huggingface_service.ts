import { execSync, spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";

interface HFModel {
  id: string;
  name: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag: string;
  model_type: string;
  lastModified?: string;
}

interface HFModelDetails extends HFModel {
  description?: string;
  siblings?: Array<{ filename: string; size?: number; lfs?: any }>;
  cardData?: any;
}

interface HFModelFile {
  filename: string;
  size: number;
  sizeHuman: string;
  quantization: string;
  isGGUF: boolean;
}

interface HardwareInfo {
  gpuName: string;
  gpuVRAM: number;
  gpuVRAMFree: number;
  ramTotal: number;
  ramAvailable: number;
  diskFree: number;
  cpuCores: number;
  gpuAvailable: boolean;
}

interface CompatibilityResult {
  compatible: boolean;
  level: "full" | "offload" | "unavailable";
  vramNeeded: number;
  vramAvailable: number;
  ramNeeded: number;
  ramAvailable: number;
  diskNeeded: number;
  diskAvailable: number;
  warnings: string[];
  recommendation: string;
  cpuOffloadLayers?: number;
  totalLayers?: number;
}

interface PullProgress {
  modelId: string;
  status: "idle" | "downloading" | "completed" | "failed" | "cancelled";
  downloaded: number;
  total: number;
  percentage: number;
  speed: number;
  eta: number;
  error?: string;
  filePath?: string;
}

const MODELS_DIR = path.join(os.homedir(), "models");
const HF_API = "https://huggingface.co/api";

const QUANTIZATION_BITS: Record<string, number> = {
  Q2_K: 2.5,
  Q2_K_S: 2.5,
  Q3_K_S: 3.0,
  Q3_K_M: 3.5,
  Q3_K_L: 3.8,
  Q4_0: 4.0,
  Q4_K_S: 4.0,
  Q4_K_M: 4.5,
  Q5_0: 5.0,
  Q5_K_S: 5.0,
  Q5_K_M: 5.5,
  Q6_K: 6.5,
  Q6_K_S: 6.0,
  Q8_0: 8.0,
  IQ2_XXS: 2.0,
  IQ2_XS: 2.1,
  IQ2_S: 2.3,
  IQ2_M: 2.5,
  IQ3_XXS: 3.0,
  IQ3_XS: 3.2,
  IQ3_S: 3.3,
  IQ3_M: 3.5,
  IQ4_NL: 4.5,
  IQ4_XS: 4.3,
  F16: 16.0,
  FP16: 16.0,
  BF16: 16.0,
  F32: 32.0,
  FP32: 32.0,
};

const activeDownloads: Map<string, ChildProcess> = new Map();
const downloadProgress: Map<string, PullProgress> = new Map();

function ensureModelsDir(): void {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }
}

function detectQuantization(filename: string): string {
  const upper = filename.toUpperCase();
  const patterns = [
    /Q[0-9]_K_[SMLX]/,
    /Q[0-9]_0/,
    /Q[0-9]_K/,
    /IQ[0-9]_[A-Z]+/,
    /F16/,
    /FP16/,
    /BF16/,
    /F32/,
    /FP32/,
  ];
  for (const p of patterns) {
    const match = upper.match(p);
    if (match) return match[0];
  }
  return "unknown";
}

function getBitsPerWeight(quantization: string): number {
  return QUANTIZATION_BITS[quantization] ?? 4.5;
}

function estimateParameterCount(modelId: string, fileSize: number): number {
  const idLower = modelId.toLowerCase();
  const sizePatterns: Array<[RegExp, number]> = [
    [/[._-]0\.5[._-]?b/i, 0.5],
    [/[._-]1[._-]?b/i, 1],
    [/[._-]1\.5[._-]?b/i, 1.5],
    [/[._-]2[._-]?b/i, 2],
    [/[._-]3[._-]?b/i, 3],
    [/[._-]4[._-]?b/i, 4],
    [/[._-]7[._-]?b/i, 7],
    [/[._-]8[._-]?b/i, 8],
    [/[._-]9[._-]?b/i, 9],
    [/[._-]1[0-3][._-]?b/i, 13],
    [/[._-]14[._-]?b/i, 14],
    [/[._-]2[0-7][._-]?b/i, 27],
    [/[._-]3[0-4][._-]?b/i, 34],
    [/[._-]7[0-2][._-]?b/i, 72],
    [/[._-]7[0-9][._-]?b/i, 70],
    [/[._-]4[0-9][._-]?b/i, 40],
    [/[._-]5[0-9][._-]?b/i, 50],
    [/[._-]6[0-9][._-]?b/i, 65],
    [/[._-]1[0-2][0-3][._-]?b/i, 123],
  ];

  for (const [pattern, params] of sizePatterns) {
    if (pattern.test(idLower)) return params;
  }

  if (fileSize > 0) {
    const avgBits = 4.5;
    const estimatedParams = (fileSize * 8) / (avgBits * 1e9);
    if (estimatedParams > 0.1 && estimatedParams < 200) {
      return Math.round(estimatedParams * 10) / 10;
    }
  }

  return 0;
}

function estimateVRAMMB(paramsBillions: number, quantization: string): number {
  const bitsPerWeight = getBitsPerWeight(quantization);
  return (paramsBillions * bitsPerWeight * 1e9) / 8 / 1024 / 1024;
}

function estimateRAMMB(paramsBillions: number): number {
  return paramsBillions * 1e9 * 2 / 8 / 1024 / 1024;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function estimateTotalLayers(paramsBillions: number): number {
  if (paramsBillions <= 1) return 22;
  if (paramsBillions <= 3) return 26;
  if (paramsBillions <= 8) return 32;
  if (paramsBillions <= 14) return 40;
  if (paramsBillions <= 34) return 60;
  if (paramsBillions <= 72) return 80;
  return 80;
}

export async function searchModels(query: string): Promise<HFModel[]> {
  try {
    const response = await axios.get(`${HF_API}/models`, {
      params: {
        search: query,
        sort: "downloads",
        direction: "-1",
        limit: 24,
      },
      timeout: 15000,
    });

    return response.data.map((m: any) => ({
      id: m.id,
      name: m.id.split("/").pop() || m.id,
      author: m.id.split("/")[0] || "unknown",
      downloads: m.downloads || 0,
      likes: m.likes || 0,
      tags: m.tags || [],
      pipeline_tag: m.pipeline_tag || "",
      model_type: m.model_type || "",
      lastModified: m.lastModified,
    }));
  } catch (error: any) {
    console.error("[HuggingFace] Search failed:", error.message);
    throw new Error(`Failed to search HuggingFace: ${error.message}`);
  }
}

export async function getModelDetails(modelId: string): Promise<HFModelDetails> {
  try {
    const [modelRes, filesRes] = await Promise.all([
      axios.get(`${HF_API}/models/${modelId}`, { timeout: 15000 }),
      axios.get(`${HF_API}/models/${modelId}/tree/main`, { timeout: 15000 }).catch(() => ({ data: [] })),
    ]);

    const m = modelRes.data;
    const files: HFModelFile[] = (filesRes.data || [])
      .filter((f: any) => f.type === "file")
      .map((f: any) => {
        const filename = f.path || f.filename || "";
        const size = f.size || 0;
        const quant = detectQuantization(filename);
        return {
          filename,
          size,
          sizeHuman: formatSize(size),
          quantization: quant,
          isGGUF: filename.endsWith(".gguf"),
        };
      })
      .filter((f: HFModelFile) => f.isGGUF || f.filename.endsWith(".safetensors") || f.filename.endsWith(".bin"));

    return {
      id: m.id,
      name: m.id.split("/").pop() || m.id,
      author: m.id.split("/")[0] || "unknown",
      downloads: m.downloads || 0,
      likes: m.likes || 0,
      tags: m.tags || [],
      pipeline_tag: m.pipeline_tag || "",
      model_type: m.model_type || "",
      lastModified: m.lastModified,
      description: m.description || "",
      siblings: filesRes.data,
      cardData: m.cardData,
    };
  } catch (error: any) {
    console.error(`[HuggingFace] Details fetch failed for ${modelId}:`, error.message);
    throw new Error(`Failed to get model details: ${error.message}`);
  }
}

export async function getModelFiles(modelId: string): Promise<HFModelFile[]> {
  try {
    const response = await axios.get(`${HF_API}/models/${modelId}/tree/main`, { timeout: 15000 });
    const files = (response.data || [])
      .filter((f: any) => f.type === "file")
      .map((f: any) => {
        const filename = f.path || f.filename || "";
        const size = f.size || 0;
        const quant = detectQuantization(filename);
        return {
          filename,
          size,
          sizeHuman: formatSize(size),
          quantization: quant,
          isGGUF: filename.endsWith(".gguf"),
        };
      });
    return files;
  } catch (error: any) {
    console.error(`[HuggingFace] Files fetch failed for ${modelId}:`, error.message);
    throw new Error(`Failed to get model files: ${error.message}`);
  }
}

export function checkHardware(): HardwareInfo {
  const ramTotal = Math.round(os.totalmem() / (1024 * 1024));
  const ramAvailable = Math.round(os.freemem() / (1024 * 1024));
  const cpuCores = os.cpus().length;

  let gpuName = "No GPU detected";
  let gpuVRAM = 0;
  let gpuVRAMFree = 0;
  let gpuAvailable = false;

  try {
    const output = execSync(
      "nvidia-smi --query-gpu=memory.total,memory.used,name --format=csv,noheader,nounits",
      { encoding: "utf-8", timeout: 5000 }
    );
    const lines = output.trim().split("\n").filter((l) => l.trim());
    if (lines.length > 0) {
      const parts = lines[0].split(",").map((s) => s.trim());
      gpuVRAM = parseInt(parts[0], 10) || 0;
      const gpuUsed = parseInt(parts[1], 10) || 0;
      gpuVRAMFree = gpuVRAM - gpuUsed;
      gpuName = parts[2] || "Unknown GPU";
      gpuAvailable = true;
    }
  } catch {
    // No nvidia-smi
  }

  let diskFree = 0;
  try {
    const output = execSync("df -BM /home | tail -1", { encoding: "utf-8", timeout: 5000 });
    const parts = output.trim().split(/\s+/);
    diskFree = parseInt(parts[3], 10) || 0;
  } catch {
    try {
      const stat = fs.statfsSync(MODELS_DIR);
      diskFree = Math.round((stat.bavail * stat.bsize) / (1024 * 1024));
    } catch {
      diskFree = 0;
    }
  }

  return {
    gpuName,
    gpuVRAM,
    gpuVRAMFree,
    ramTotal,
    ramAvailable,
    diskFree,
    cpuCores,
    gpuAvailable,
  };
}

export function checkCompatibility(
  modelId: string,
  modelSizeBytes?: number,
  quantization?: string
): CompatibilityResult {
  const hw = checkHardware();
  const estimatedParams = estimateParameterCount(modelId, modelSizeBytes || 0);
  const quant = quantization || "Q4_K_M";
  const vramNeeded = estimatedParams > 0 ? Math.round(estimateVRAMMB(estimatedParams, quant)) : 0;
  const ramNeeded = estimatedParams > 0 ? Math.round(estimateRAMMB(estimatedParams)) : 0;
  const diskNeeded = modelSizeBytes ? Math.round(modelSizeBytes / (1024 * 1024)) : vramNeeded;
  const totalLayers = estimateTotalLayers(estimatedParams);

  const warnings: string[] = [];
  let level: "full" | "offload" | "unavailable" = "full";

  if (estimatedParams === 0) {
    warnings.push("Could not determine model parameter count");
    level = "offload";
  }

  if (hw.gpuAvailable && vramNeeded > 0) {
    if (vramNeeded <= hw.gpuVRAMFree) {
      // Fits in VRAM
    } else if (hw.gpuVRAMFree > vramNeeded * 0.3) {
      const ratio = hw.gpuVRAMFree / vramNeeded;
      const layersOnGpu = Math.floor(totalLayers * ratio);
      const layersOnCpu = totalLayers - layersOnGpu;
      level = "offload";
      warnings.push(`Needs CPU offloading (${layersOnCpu} of ${totalLayers} layers on CPU)`);
    } else {
      level = "unavailable";
      warnings.push("Insufficient VRAM even with heavy CPU offloading");
    }
  } else if (!hw.gpuAvailable) {
    if (ramNeeded > 0 && ramNeeded < hw.ramAvailable * 0.9) {
      level = "offload";
      warnings.push("No GPU - running entirely on CPU (very slow)");
    } else {
      level = "unavailable";
      warnings.push("No GPU and insufficient RAM");
    }
  }

  if (diskNeeded > hw.diskFree) {
    level = "unavailable";
    warnings.push(`Insufficient disk space: need ${formatSize(diskNeeded * 1024 * 1024)}, have ${formatSize(hw.diskFree * 1024 * 1024)}`);
  }

  if (ramNeeded > hw.ramAvailable && level !== "unavailable") {
    warnings.push("May need swap space for model loading");
  }

  let recommendation = "";
  if (level === "full") {
    recommendation = "Model should run fully on GPU with good performance.";
  } else if (level === "offload") {
    const offloadRatio = hw.gpuAvailable ? Math.round(((hw.gpuVRAMFree / (vramNeeded || 1)) * 100)) : 0;
    recommendation = hw.gpuAvailable
      ? `Partially offload to CPU. ~${offloadRatio}% fits in VRAM. Expect reduced throughput.`
      : "Running on CPU only. Expect significantly slower inference.";
  } else {
    recommendation = "Model is too large for current hardware. Consider a smaller quantization or a smaller model.";
  }

  return {
    compatible: level !== "unavailable",
    level,
    vramNeeded,
    vramAvailable: hw.gpuVRAMFree,
    ramNeeded,
    ramAvailable: hw.ramAvailable,
    diskNeeded,
    diskAvailable: hw.diskFree,
    warnings,
    recommendation,
    totalLayers,
    cpuOffloadLayers: level === "offload" && hw.gpuAvailable
      ? totalLayers - Math.floor(totalLayers * (hw.gpuVRAMFree / (vramNeeded || 1)))
      : level === "offload" ? totalLayers : 0,
  };
}

export async function pullModel(
  modelId: string,
  quantization?: string,
  filename?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  ensureModelsDir();

  const existingProgress = downloadProgress.get(modelId);
  if (existingProgress?.status === "downloading") {
    return { success: false, error: "Download already in progress" };
  }

  let targetFile = filename;
  let targetSize = 0;

  if (!targetFile) {
    try {
      const files = await getModelFiles(modelId);
      const ggufFiles = files.filter((f) => f.isGGUF);

      if (ggufFiles.length > 0) {
        let selectedFile = ggufFiles[0];
        if (quantization) {
          const match = ggufFiles.find((f) =>
            f.quantization.toUpperCase() === quantization.toUpperCase()
          );
          if (match) selectedFile = match;
        } else {
          const q4File = ggufFiles.find((f) => f.quantization === "Q4_K_M");
          if (q4File) selectedFile = q4File;
        }
        targetFile = selectedFile.filename;
        targetSize = selectedFile.size;
      } else if (files.length > 0) {
        const safetensors = files.filter((f) => f.filename.endsWith(".safetensors"));
        if (safetensors.length > 0) {
          targetFile = safetensors[0].filename;
          targetSize = safetensors[0].size;
        } else {
          targetFile = files[0].filename;
          targetSize = files[0].size;
        }
      } else {
        return { success: false, error: "No downloadable files found for this model" };
      }
    } catch (err: any) {
      return { success: false, error: `Failed to list model files: ${err.message}` };
    }
  }

  const modelDirName = modelId.replace("/", "--");
  const modelDir = path.join(MODELS_DIR, modelDirName);
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  const filePath = path.join(modelDir, targetFile);
  const downloadUrl = `https://huggingface.co/${modelId}/resolve/main/${encodeURIComponent(targetFile)}`;

  const progress: PullProgress = {
    modelId,
    status: "downloading",
    downloaded: 0,
    total: targetSize,
    percentage: 0,
    speed: 0,
    eta: 0,
    filePath,
  };
  downloadProgress.set(modelId, progress);

  try {
    const child = spawn(
      "curl",
      [
        "-L",
        "-C", "-",
        "--progress-bar",
        "-o", filePath,
        downloadUrl,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    activeDownloads.set(modelId, child);

    let startTime = Date.now();
    let lastBytes = 0;
    let lastTime = startTime;

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      const percentMatch = text.match(/(\d+\.?\d*)%/);
      if (percentMatch) {
        const pct = parseFloat(percentMatch[1]);
        progress.percentage = Math.min(pct, 100);
        progress.downloaded = Math.round((pct / 100) * targetSize);

        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        if (elapsed > 1) {
          const bytesDiff = progress.downloaded - lastBytes;
          progress.speed = Math.round(bytesDiff / elapsed);
          lastBytes = progress.downloaded;
          lastTime = now;

          if (progress.speed > 0) {
            const remaining = targetSize - progress.downloaded;
            progress.eta = Math.round(remaining / progress.speed);
          }
        }
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      const percentMatch = text.match(/(\d+\.?\d*)%/);
      if (percentMatch) {
        const pct = parseFloat(percentMatch[1]);
        progress.percentage = Math.min(pct, 100);
        progress.downloaded = Math.round((pct / 100) * targetSize);
      }
    });

    return new Promise((resolve) => {
      child.on("close", (code) => {
        activeDownloads.delete(modelId);
        if (code === 0) {
          progress.status = "completed";
          progress.percentage = 100;
          progress.downloaded = targetSize;
          progress.speed = 0;
          progress.eta = 0;
          resolve({ success: true, filePath });
        } else {
          progress.status = "failed";
          progress.error = `Process exited with code ${code}`;
          resolve({ success: false, error: `Download failed with exit code ${code}` });
        }
      });

      child.on("error", (err) => {
        activeDownloads.delete(modelId);
        progress.status = "failed";
        progress.error = err.message;
        resolve({ success: false, error: err.message });
      });
    });
  } catch (error: any) {
    downloadProgress.set(modelId, {
      ...progress,
      status: "failed",
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

export function getPullProgress(modelId: string): PullProgress {
  return downloadProgress.get(modelId) || {
    modelId,
    status: "idle",
    downloaded: 0,
    total: 0,
    percentage: 0,
    speed: 0,
    eta: 0,
  };
}

export function cancelPull(modelId: string): { success: boolean; error?: string } {
  const child = activeDownloads.get(modelId);
  if (child) {
    child.kill("SIGTERM");
    activeDownloads.delete(modelId);

    const progress = downloadProgress.get(modelId);
    if (progress) {
      progress.status = "cancelled";
      progress.error = "Cancelled by user";
    }
    return { success: true };
  }
  return { success: false, error: "No active download found" };
}

export function getInstalledModels(): Array<{ name: string; path: string; size: number; sizeHuman: string }> {
  ensureModelsDir();
  const models: Array<{ name: string; path: string; size: number; sizeHuman: string }> = [];

  try {
    const entries = fs.readdirSync(MODELS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(MODELS_DIR, entry.name);
        let totalSize = 0;
        try {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const stat = fs.statSync(path.join(dirPath, file));
            if (stat.isFile()) totalSize += stat.size;
          }
        } catch {
          // skip
        }
        models.push({
          name: entry.name.replace("--", "/"),
          path: dirPath,
          size: totalSize,
          sizeHuman: formatSize(totalSize),
        });
      }
    }
  } catch {
    // Models dir doesn't exist
  }

  return models;
}
