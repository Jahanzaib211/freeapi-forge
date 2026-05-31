import { z } from "zod";
import os from "os";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

const APP_VERSION = "1.0.0";
const APP_NAME = "Forge Studio";
const APP_AUTHOR = "jahanzaib";
const GITHUB_URL = "https://github.com/Jahanzaib211/forge-studio";

interface AppSettings {
  name: string;
  version: string;
  author: string;
  github: string;
  system: {
    hostname: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    uptime: number;
    cpuCount: number;
    totalMemory: number;
    freeMemory: number;
  };
}

let customSettings: Record<string, any> = {};

export const settingsRouter = router({
  metadata: publicProcedure.query(async (): Promise<AppSettings> => {
    return {
      name: APP_NAME,
      version: APP_VERSION,
      author: APP_AUTHOR,
      github: GITHUB_URL,
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: os.uptime(),
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
      },
    };
  }),

  get: publicProcedure
    .input(z.object({ key: z.string() }).optional())
    .query(async ({ input }) => {
      if (input?.key) {
        return { key: input.key, value: customSettings[input.key] ?? null };
      }
      return customSettings;
    }),

  update: protectedProcedure
    .input(z.record(z.string(), z.any()))
    .mutation(async ({ input }) => {
      customSettings = { ...customSettings, ...input };
      return { success: true, settings: customSettings };
    }),

  delete: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      delete customSettings[input.key];
      return { success: true };
    }),
});
