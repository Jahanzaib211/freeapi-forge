import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { EventEmitter } from "events";

const SANDBOX_DIR = path.join(os.tmpdir(), "forge-sandbox");
const DEFAULT_TIMEOUT = 30000;
const MAX_TIMEOUT = 120000;

if (!fs.existsSync(SANDBOX_DIR)) fs.mkdirSync(SANDBOX_DIR, { recursive: true });

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
}

interface DockerResult {
  success: boolean;
  output: string;
  error?: string;
}

function checkDocker(): boolean {
  try {
    execSync("docker ps", { stdio: "ignore", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function getSandboxImage(language: string): string {
  const images: Record<string, string> = {
    python: "python:3.11-slim",
    javascript: "node:20-slim",
    typescript: "node:20-slim",
    bash: "ubuntu:22.04",
    go: "golang:1.21-alpine",
  };
  return images[language] || "ubuntu:22.04";
}

function getRunCommand(language: string, filePath: string): string {
  const commands: Record<string, string> = {
    python: `python "${filePath}"`,
    javascript: `node "${filePath}"`,
    typescript: `npx ts-node "${filePath}"`,
    bash: `bash "${filePath}"`,
    go: `go run "${filePath}"`,
  };
  return commands[language] || `bash "${filePath}"`;
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  python: "py",
  javascript: "js",
  typescript: "ts",
  bash: "sh",
  go: "go",
};

export class SandboxManager extends EventEmitter {
  dockerAvailable: boolean;

  constructor() {
    super();
    this.dockerAvailable = checkDocker();
    console.log(`[Sandbox] Docker available: ${this.dockerAvailable}`);
  }

  async executeDocker(
    language: string,
    code: string,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<ExecutionResult> {
    const sessionId = `forge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const workDir = path.join(SANDBOX_DIR, sessionId);
    fs.mkdirSync(workDir, { recursive: true });

    const ext = LANGUAGE_EXTENSIONS[language] || "txt";
    const fileName = `main.${ext}`;
    const filePath = path.join(workDir, fileName);
    fs.writeFileSync(filePath, code);

    const image = getSandboxImage(language);
    const command = getRunCommand(language, `/code/${fileName}`);

    return new Promise((resolve) => {
      const startTime = Date.now();
      let output = "";
      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        cleanup();
        resolve({ success: false, output, error: `Timeout after ${timeout}ms`, exitCode: -1, duration: Date.now() - startTime });
      }, timeout);

      const proc = spawn("docker", [
        "run", "--rm",
        "--network", "none",
        "--memory", "256m",
        "--cpus", "1",
        "--name", sessionId,
        "-v", `${workDir}:/code:ro`,
        image,
        "sh", "-c", command,
      ], { stdio: ["ignore", "pipe", "pipe"] });

      proc.stdout!.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        this.emit("output", { sessionId, type: "stdout", data: text });
      });

      proc.stderr!.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        this.emit("output", { sessionId, type: "stderr", data: text });
      });

      const cleanup = () => {
        clearTimeout(timer);
        try { fs.rmSync(workDir, { recursive: true }); } catch {}
      };

      proc.on("close", (code) => {
        cleanup();
        resolve({
          success: code === 0,
          output: output.trim(),
          exitCode: code || 0,
          duration: Date.now() - startTime,
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        cleanup();
        resolve({ success: false, output, error: err.message, exitCode: -1, duration: Date.now() - startTime });
      });
    });
  }

  async executeLocal(
    language: string,
    code: string,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<ExecutionResult> {
    const sessionId = `forge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const workDir = path.join(SANDBOX_DIR, sessionId);
    fs.mkdirSync(workDir, { recursive: true });

    const ext = LANGUAGE_EXTENSIONS[language] || "txt";
    const filePath = path.join(workDir, `main.${ext}`);
    fs.writeFileSync(filePath, code);

    return new Promise((resolve) => {
      const startTime = Date.now();
      let output = "";
      let proc: ReturnType<typeof spawn>;

      if (language === "python") proc = spawn("python3", [filePath], { cwd: workDir, timeout });
      else if (language === "javascript") proc = spawn("node", [filePath], { cwd: workDir, timeout });
      else if (language === "bash") proc = spawn("bash", [filePath], { cwd: workDir, timeout });
      else proc = spawn("bash", ["-c", filePath], { cwd: workDir, timeout });

      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        resolve({ success: false, output, error: `Timeout after ${timeout}ms`, exitCode: -1, duration: Date.now() - startTime });
      }, timeout);

      proc.stdout!.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        this.emit("output", { sessionId, type: "stdout", data: text });
      });

      proc.stderr!.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        this.emit("output", { sessionId, type: "stderr", data: text });
      });

      proc.on("close", (code) => {
        clearTimeout(timer);
        try { fs.rmSync(workDir, { recursive: true }); } catch {}
        resolve({ success: code === 0, output: output.trim(), exitCode: code || 0, duration: Date.now() - startTime });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        try { fs.rmSync(workDir, { recursive: true }); } catch {}
        resolve({ success: false, output, error: err.message, exitCode: -1, duration: Date.now() - startTime });
      });
    });
  }

  async execute(
    language: string,
    code: string,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<ExecutionResult> {
    const t = Math.min(timeout, MAX_TIMEOUT);
    if (this.dockerAvailable) return this.executeDocker(language, code, t);
    return this.executeLocal(language, code, t);
  }

  async spawnTerminal(): Promise<{ sessionId: string; exitCode?: number }> {
    const sessionId = `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const workDir = path.join(SANDBOX_DIR, sessionId);
    fs.mkdirSync(workDir, { recursive: true });

    if (this.dockerAvailable) {
      return { sessionId };
    }
    return { sessionId };
  }

  getTerminalCommand(sessionId: string): string[] {
    const workDir = path.join(SANDBOX_DIR, sessionId);
    if (this.dockerAvailable) {
      return [
        "docker", "run", "--rm", "-i",
        "--network", "none",
        "--memory", "256m",
        "--cpus", "1",
        "--name", sessionId,
        "-v", `${workDir}:/workspace`,
        "-w", "/workspace",
        "ubuntu:22.04",
        "bash",
      ];
    }
    return ["bash"];
  }

  listLanguages(): { key: string; label: string; extension: string }[] {
    return Object.entries(LANGUAGE_EXTENSIONS).map(([key, ext]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      extension: ext,
    }));
  }

  getStatus(): { docker: boolean; languages: number } {
    return {
      docker: this.dockerAvailable,
      languages: Object.keys(LANGUAGE_EXTENSIONS).length,
    };
  }
}

export const sandboxManager = new SandboxManager();
