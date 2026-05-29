import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";

export const benchmarkRouter = router({
  run: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
        models: z.array(z.string()).min(2).max(5),
        maxTokens: z.number().default(256),
      })
    )
    .mutation(async ({ input }) => {
      const port = process.env.PORT || 5051;

      const results = await Promise.allSettled(
        input.models.map(async (model) => {
          const start = Date.now();
          try {
            const response = await fetch(
              `http://localhost:${port}/v1/chat/completions`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model,
                  messages: [{ role: "user", content: input.prompt }],
                  max_tokens: input.maxTokens,
                }),
              }
            );
            const data = await response.json();
            return {
              model,
              latencyMs: Date.now() - start,
              tokens: data.usage?.total_tokens || 0,
              content: data.choices?.[0]?.message?.content || "",
              success: true,
              error: undefined as string | undefined,
            };
          } catch (err: any) {
            return {
              model,
              latencyMs: Date.now() - start,
              tokens: 0,
              content: "",
              success: false,
              error: err.message,
            };
          }
        })
      );

      return results.map((r) =>
        r.status === "fulfilled"
          ? r.value
          : {
              model: "unknown",
              success: false,
              error: "Failed",
              latencyMs: 0,
              tokens: 0,
              content: "",
            }
      );
    }),
});
