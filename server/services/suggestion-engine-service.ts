import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import { suggestionDismissals } from "../../drizzle/schema";

interface Suggestion {
  type: string;
  key: string;
  severity: string;
  message: string;
  actionable: boolean;
}

export class SuggestionEngineService {

  async getActiveSuggestions(tenantId: number): Promise<Suggestion[]> {
    const db = await getDb();
    if (!db) return [];

    const dismissed = await db.select({ suggestionType: suggestionDismissals.suggestionType, suggestionKey: suggestionDismissals.suggestionKey })
      .from(suggestionDismissals)
      .where(and(eq(suggestionDismissals.tenantId, tenantId), sql`${suggestionDismissals.expiresAt} > now()`));

    const dismissedSet = new Set(dismissed.map(d => `${d.suggestionType}:${d.suggestionKey}`));

    const allSuggestions: Suggestion[] = [
      { type: "provider", key: "add-free", severity: "info",
        message: "Add free providers like Groq or Together AI for zero-cost inference.", actionable: true },
      { type: "capability", key: "vision-missing", severity: "info",
        message: "No vision-capable model detected. Add GPT-4o or Claude for image analysis.", actionable: true },
      { type: "capability", key: "embedding-missing", severity: "info",
        message: "Add an embedding model (OpenAI or Ollama) to enable RAG.", actionable: true },
      { type: "fallback", key: "no-fallback", severity: "warning",
        message: "Consider adding a free fallback provider to handle API outages.", actionable: true },
      { type: "workflow", key: "chain-agents", severity: "info",
        message: "You have multiple agents. Chain them into a workflow for automation.", actionable: true },
      { type: "budget", key: "set-limits", severity: "warning",
        message: "Set monthly budget limits to prevent unexpected costs.", actionable: true },
    ];

    return allSuggestions.filter(s => !dismissedSet.has(`${s.type}:${s.key}`)).slice(0, 3);
  }

  async dismissSuggestion(tenantId: number, type: string, key: string): Promise<void> {
    const db = await getDb();
    if (!db) return;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.insert(suggestionDismissals).values({
      tenantId, suggestionType: type, suggestionKey: key, expiresAt,
    });
  }
}

export const suggestionEngineService = new SuggestionEngineService();
