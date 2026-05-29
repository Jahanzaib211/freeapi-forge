import { getDb } from "../db";
import { webhooks } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

export type WebhookEvent = "circuit_breaker" | "budget_threshold" | "guardrail_fire";

export async function fireWebhooks(
  event: WebhookEvent,
  payload: Record<string, any>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const activeWebhooks = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.enabled, 1));

  for (const wh of activeWebhooks) {
    if (wh.events && !wh.events.includes(event) && !wh.events.includes("*")) {
      continue;
    }

    try {
      const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Forge-Event": event,
      };

      if (wh.secret) {
        const signature = crypto
          .createHmac("sha256", wh.secret)
          .update(body)
          .digest("hex");
        headers["X-Forge-Signature"] = `sha256=${signature}`;
      }

      await fetch(wh.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });

      await db
        .update(webhooks)
        .set({ lastTriggered: new Date() })
        .where(eq(webhooks.id, wh.id));
    } catch (err) {
      console.error(`[Webhook] Failed to fire webhook ${wh.name}:`, err);
    }
  }
}
