import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getSystemStats } from "../services/system_monitor";
import { ProcessMonitor } from "../services/process_monitor";
import { detectAllLLMs } from "../services/llm_detector";

const processMonitor = new ProcessMonitor();

export const systemRouter = router({
  stats: publicProcedure.query(async () => {
    return getSystemStats();
  }),
  processes: publicProcedure.query(async () => {
    const stats = getSystemStats();
    return stats.topProcesses;
  }),
  gpu: publicProcedure.query(async () => {
    const stats = getSystemStats();
    return { gpus: stats.gpu, processes: stats.gpuProcesses };
  }),
  llms: publicProcedure.query(async () => {
    return await detectAllLLMs();
  }),
  pm2: {
    list: publicProcedure.query(async () => {
      return await processMonitor.getProcesses();
    }),
    stop: publicProcedure.input(z.object({ name: z.string() })).mutation(async ({ input }) => {
      return await processMonitor.stopProcess(input.name);
    }),
    start: publicProcedure.input(z.object({ name: z.string() })).mutation(async ({ input }) => {
      return await processMonitor.startProcess(input.name);
    }),
    restart: publicProcedure.input(z.object({ name: z.string() })).mutation(async ({ input }) => {
      return await processMonitor.restartProcess(input.name);
    }),
    delete: publicProcedure.input(z.object({ name: z.string() })).mutation(async ({ input }) => {
      return await processMonitor.deleteProcess(input.name);
    }),
    logs: publicProcedure.input(z.object({ name: z.string(), lines: z.number().default(100) })).query(async ({ input }) => {
      return await processMonitor.getLogs(input.name, input.lines);
    }),
  },
});
