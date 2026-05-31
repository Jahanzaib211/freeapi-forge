import { execSync, exec } from "child_process";

interface ProcessInfo {
  pid: number;
  name: string;
  status: "online" | "stopped" | "errored" | "stopping";
  restarts: number;
  uptime: number;
  memory: number;
  cpu: number;
  namespace: string;
  pmId: number;
}

interface ProcessLog {
  timestamp: string;
  message: string;
  source: "stdout" | "stderr";
}

export class ProcessMonitor {
  private listCache: ProcessInfo[] = [];
  private cacheExpiry: number = 0;
  private cacheTtl: number = 5000;

  async getProcesses(): Promise<ProcessInfo[]> {
    const now = Date.now();
    if (this.listCache.length > 0 && now < this.cacheExpiry) {
      return this.listCache;
    }

    try {
      const output = execSync("pm2 jlist", {
        encoding: "utf-8",
        timeout: 10000,
      });

      const raw: any[] = JSON.parse(output);
      this.listCache = raw.map((proc) => ({
        pid: proc.pid,
        name: proc.name,
        status: proc.pm2_env?.status || "stopped",
        restarts: proc.pm2_env?.restart_time || 0,
        uptime: proc.pm2_env?.pm_uptime || 0,
        memory: proc.monit?.memory || 0,
        cpu: proc.monit?.cpu || 0,
        namespace: proc.pm2_env?.namespace || "default",
        pmId: proc.pm_id,
      }));

      this.cacheExpiry = now + this.cacheTtl;
      return this.listCache;
    } catch (error: any) {
      console.error("[ProcessMonitor] Failed to list processes:", error.message);
      return this.listCache;
    }
  }

  async getProcessByName(name: string): Promise<ProcessInfo | undefined> {
    const processes = await this.getProcesses();
    return processes.find((p) => p.name === name);
  }

  async startScript(
    script: string,
    name: string,
    cwd?: string,
    env?: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const envArgs = env
        ? Object.entries(env)
            .map(([k, v]) => `${k}=${v}`)
            .join(" ")
        : "";

      const cwdFlag = cwd ? `--cwd ${cwd}` : "";
      const cmd = `pm2 start ${script} --name ${name} ${cwdFlag} ${envArgs}`.trim();

      execSync(cmd, { encoding: "utf-8", timeout: 15000 });
      this.invalidateCache();
      return { success: true, message: `Started ${name}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async startProcess(name: string): Promise<{ success: boolean; message: string }> {
    try {
      execSync(`pm2 start ${name}`, { encoding: "utf-8", timeout: 10000 });
      this.invalidateCache();
      return { success: true, message: `Started ${name}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async stopProcess(name: string): Promise<{ success: boolean; message: string }> {
    try {
      execSync(`pm2 stop ${name}`, { encoding: "utf-8", timeout: 10000 });
      this.invalidateCache();
      return { success: true, message: `Stopped ${name}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async restartProcess(name: string): Promise<{ success: boolean; message: string }> {
    try {
      execSync(`pm2 restart ${name}`, { encoding: "utf-8", timeout: 10000 });
      this.invalidateCache();
      return { success: true, message: `Restarted ${name}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async deleteProcess(name: string): Promise<{ success: boolean; message: string }> {
    try {
      execSync(`pm2 delete ${name}`, { encoding: "utf-8", timeout: 10000 });
      this.invalidateCache();
      return { success: true, message: `Deleted ${name}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async getLogs(name: string, lines: number = 100): Promise<ProcessLog[]> {
    try {
      const stdout = execSync(`pm2 logs ${name} --nostream --lines ${lines} --raw`, {
        encoding: "utf-8",
        timeout: 10000,
      });

      return stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => ({
          timestamp: new Date().toISOString(),
          message: line,
          source: "stdout" as const,
        }));
    } catch (error: any) {
      return [{ timestamp: new Date().toISOString(), message: error.message, source: "stderr" }];
    }
  }

  async save(): Promise<void> {
    try {
      execSync("pm2 save", { encoding: "utf-8", timeout: 10000 });
    } catch (error: any) {
      console.error("[ProcessMonitor] Failed to save PM2 process list:", error.message);
    }
  }

  async resurrect(): Promise<void> {
    try {
      execSync("pm2 resurrect", { encoding: "utf-8", timeout: 10000 });
      this.invalidateCache();
    } catch (error: any) {
      console.error("[ProcessMonitor] Failed to resurrect PM2 processes:", error.message);
    }
  }

  private invalidateCache(): void {
    this.listCache = [];
    this.cacheExpiry = 0;
  }
}

export const processMonitor = new ProcessMonitor();
