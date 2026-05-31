import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface DetectedModel {
  name: string;
  source: "ollama" | "llama-cpp" | "gguf" | "huggingface";
  path?: string;
  size?: number;
  format?: string;
  status?: string;
}

interface OllamaModel {
  name: string;
  size: number;
  modified: string;
}

interface OllamaRunningModel {
  name: string;
  size: number;
  processor: string;
}

interface LlamaCppProcess {
  pid: number;
  modelPath: string;
  modelType: string;
  contextSize: number;
  port: number;
}

async function detectOllamaModels(): Promise<DetectedModel[]> {
  const models: DetectedModel[] = [];

  try {
    const listOutput = execSync("ollama list 2>/dev/null || true", {
      encoding: "utf-8",
      timeout: 10000,
    });

    if (!listOutput.trim()) return models;

    const lines = listOutput.trim().split("\n").slice(1);
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        let sizeStr = parts[1];
        let size = 0;

        if (/^\d+(\.\d+)?\s*[GgMmTt][Bb]$/.test(sizeStr)) {
          sizeStr = sizeStr.replace(/\s/g, "");
        } else if (parts.length >= 3 && /^[GgMmTt][Bb]$/.test(parts[2])) {
          sizeStr = parts[1] + parts[2];
        }

        if (sizeStr.toUpperCase().endsWith("TB")) {
          size = parseFloat(sizeStr) * 1024 * 1024 * 1024 * 1024;
        } else if (sizeStr.toUpperCase().endsWith("GB")) {
          size = parseFloat(sizeStr) * 1024 * 1024 * 1024;
        } else if (sizeStr.toUpperCase().endsWith("MB")) {
          size = parseFloat(sizeStr) * 1024 * 1024;
        } else {
          const raw = parseInt(sizeStr, 10);
          if (!isNaN(raw)) size = raw;
        }

        const name = parts[0];
        models.push({
          name,
          source: "ollama",
          size: size || undefined,
          status: "available",
        });
      }
    }

    try {
      const psOutput = execSync("ollama ps 2>/dev/null || true", {
        encoding: "utf-8",
        timeout: 10000,
      });

      const runningLines = psOutput.trim().split("\n").slice(1);
      for (const line of runningLines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const model = models.find((m) => m.name === parts[0]);
          if (model) {
            model.status = "running";
          }
        }
      }
    } catch {
      // Ignore ps errors
    }
  } catch {
    // Ollama not available
  }

  return models;
}

async function detectLlamaCppProcesses(): Promise<DetectedModel[]> {
  const models: DetectedModel[] = [];

  try {
    const output = execSync(
      'ps aux | grep -iE "llama[-_.]?server|llama\\.cpp|llama-server" | grep -v grep || true',
      { encoding: "utf-8", timeout: 5000 }
    );

    if (!output.trim()) return models;

    const lines = output.trim().split("\n");
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 11) {
        const args = parts.slice(10).join(" ");
        const pid = parseInt(parts[1], 10);

        const modelMatch =
          args.match(/--model[= ](\S+)/) ||
          args.match(/-m[= ](\S+)/);
        const modelPath = modelMatch ? modelMatch[1].replace(/[",]/g, "") : "unknown";
        const contextMatch =
          args.match(/--ctx-size[= ](\d+)/) ||
          args.match(/-c[= ](\d+)/);
        const contextSize = contextMatch ? parseInt(contextMatch[1], 10) : 4096;
        const portMatch =
          args.match(/--port[= ](\d+)/) ||
          args.match(/--host[= ]\S+:(\d+)/);
        const port = portMatch ? parseInt(portMatch[1], 10) : 8080;

        const modelName = modelPath !== "unknown"
          ? path.basename(modelPath).replace(/\.(gguf|bin)$/i, "")
          : `llama.cpp (PID ${pid})`;

        models.push({
          name: modelName,
          source: "llama-cpp",
          path: modelPath,
          status: "running",
          format: modelPath !== "unknown" ? path.extname(modelPath) : undefined,
        });
      }
    }
  } catch {
    // No llama.cpp processes found
  }

  return models;
}

async function detectGgufFiles(): Promise<DetectedModel[]> {
  const models: DetectedModel[] = [];
  const modelDirs = ["/home/jahanzaib/models", "/home/jahanzaib/.cache/models", "/opt/models"];

  for (const dir of modelDirs) {
    try {
      if (!fs.existsSync(dir)) continue;

      const findOutput = execSync(
        `find "${dir}" -name "*.gguf" -type f 2>/dev/null || true`,
        { encoding: "utf-8", timeout: 15000 }
      );

      if (!findOutput.trim()) continue;

      const files = findOutput.trim().split("\n").filter((f) => f.trim());
      for (const file of files) {
        try {
          const stat = fs.statSync(file);
          const name = path.basename(file, path.extname(file));

          models.push({
            name,
            source: "gguf",
            path: file,
            size: stat.size,
            format: ".gguf",
          });
        } catch {
          // Skip files we can't stat
        }
      }
    } catch {
      // Directory doesn't exist or can't access
    }
  }

  return models;
}

async function detectHuggingFaceCache(): Promise<DetectedModel[]> {
  const models: DetectedModel[] = [];
  const cacheDir = path.join(process.env.HOME || "/home/jahanzaib", ".cache/huggingface/hub");

  try {
    if (!fs.existsSync(cacheDir)) return models;

    const entries = fs.readdirSync(cacheDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("models--")) {
        const modelName = entry.name
          .replace("models--", "")
          .replace(/--/g, "/");

        let latestSnapshot = "";
        const snapshotsDir = path.join(cacheDir, entry.name, "snapshots");
        if (fs.existsSync(snapshotsDir)) {
          const snapshots = fs.readdirSync(snapshotsDir);
          if (snapshots.length > 0) {
            latestSnapshot = snapshots[snapshots.length - 1];
          }
        }

        models.push({
          name: modelName,
          source: "huggingface",
          path: path.join(cacheDir, entry.name),
          status: latestSnapshot ? "cached" : "empty",
        });
      }
    }
  } catch {
    // HuggingFace cache not available
  }

  return models;
}

export async function detectAllLLMs(): Promise<DetectedModel[]> {
  const [ollamaModels, llamaCppModels, ggufFiles, hfModels] = await Promise.all([
    detectOllamaModels(),
    detectLlamaCppProcesses(),
    detectGgufFiles(),
    detectHuggingFaceCache(),
  ]);

  const allModels = [...ollamaModels, ...llamaCppModels, ...ggufFiles, ...hfModels];

  const seen = new Map<string, DetectedModel>();
  for (const model of allModels) {
    const key = `${model.source}:${model.name}`;
    if (!seen.has(key)) {
      seen.set(key, model);
    }
  }

  return Array.from(seen.values());
}

export async function getModelSummary(): Promise<{
  totalModels: number;
  bySource: Record<string, number>;
  running: number;
}> {
  const models = await detectAllLLMs();

  const bySource: Record<string, number> = {};
  let running = 0;

  for (const model of models) {
    bySource[model.source] = (bySource[model.source] || 0) + 1;
    if (model.status === "running") {
      running++;
    }
  }

  return {
    totalModels: models.length,
    bySource,
    running,
  };
}
