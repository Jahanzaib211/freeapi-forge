import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { guardrails, policies } from "../../drizzle/schema";

const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /you\s+are\s+now\s+(a|an)\s+/gi,
  /disregard\s+(all|any|your)\s+(prior|previous|earlier)\s+(instructions|rules|guidelines)/gi,
  /system\s*:\s*/gi,
  /act\s+as\s+(a|an)\s+(?:different|new)\s+/gi,
  /pretend\s+(you\s+are|to\s+be)\s+/gi,
  /roleplay\s+as\s+/gi,
];

const CONTENT_SAFETY_KEYWORDS = [
  /\b(murder|kill|assassinate|harm)\b/gi,
  /\b(drug\s+recipe|how\s+to\s+make\s+(drugs|explosives|weapons))\b/gi,
  /\b(hack\s+into|crack\s+password|bypass\s+security)\b/gi,
  /\b(self[\s-]harm|suicide\s+method)\b/gi,
  /\b(child\s+abuse|exploitation)\b/gi,
];

interface GuardrailConfig {
  piiDetection?: boolean;
  injectionBlocking?: boolean;
  contentSafety?: boolean;
  customPatterns?: string[];
}

interface GuardrailResult {
  passed: boolean;
  violations: Violation[];
  guardrailName: string;
  guardrailType: string;
}

interface Violation {
  type: "pii" | "injection" | "content_safety" | "custom";
  severity: "block" | "warn";
  matched: string;
  pattern?: string;
}

interface PolicyResult {
  passed: boolean;
  policyName: string;
  violations: Violation[];
  guardrailResults: GuardrailResult[];
}

export class GuardrailService {
  private configCache: Map<number, GuardrailConfig> = new Map();

  async runPreCallGuardrails(
    input: string,
    model: string,
    keyId?: number,
    teamId?: number
  ): Promise<GuardrailResult[]> {
    const activeGuardrails = await this.getActiveGuardrails("pre_call");
    const results: GuardrailResult[] = [];

    for (const guardrail of activeGuardrails) {
      const config = this.parseConfig(guardrail.config);
      const result = this.checkGuardrail(guardrail.name, "pre_call", input, config);
      results.push(result);
    }

    return results;
  }

  async runPostCallGuardrails(
    output: string,
    model: string,
    keyId?: number,
    teamId?: number
  ): Promise<GuardrailResult[]> {
    const activeGuardrails = await this.getActiveGuardrails("post_call");
    const results: GuardrailResult[] = [];

    for (const guardrail of activeGuardrails) {
      const config = this.parseConfig(guardrail.config);
      const result = this.checkGuardrail(guardrail.name, "post_call", output, config);
      results.push(result);
    }

    return results;
  }

  private checkGuardrail(
    name: string,
    type: string,
    text: string,
    config: GuardrailConfig
  ): GuardrailResult {
    const violations: Violation[] = [];

    if (config.piiDetection !== false) {
      const piiViolations = this.detectPII(text);
      violations.push(...piiViolations);
    }

    if (config.injectionBlocking !== false && type === "pre_call") {
      const injectionViolations = this.detectInjection(text);
      violations.push(...injectionViolations);
    }

    if (config.contentSafety !== false && type === "post_call") {
      const contentViolations = this.detectContentSafety(text);
      violations.push(...contentViolations);
    }

    if (config.customPatterns) {
      for (const pattern of config.customPatterns) {
        try {
          const regex = new RegExp(pattern, "gi");
          const matches = text.match(regex);
          if (matches) {
            violations.push({
              type: "custom",
              severity: "block",
              matched: matches[0],
              pattern,
            });
          }
        } catch {
          // Invalid regex pattern
        }
      }
    }

    return {
      passed: violations.filter((v) => v.severity === "block").length === 0,
      violations,
      guardrailName: name,
      guardrailType: type,
    };
  }

  private detectPII(text: string): Violation[] {
    const violations: Violation[] = [];

    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = text.match(pattern);
      if (matches) {
        violations.push({
          type: "pii",
          severity: "block",
          matched: matches[0],
          pattern: type,
        });
      }
    }

    return violations;
  }

  private detectInjection(text: string): Violation[] {
    const violations: Violation[] = [];

    for (const pattern of INJECTION_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        violations.push({
          type: "injection",
          severity: "block",
          matched: matches[0],
        });
      }
    }

    return violations;
  }

  private detectContentSafety(text: string): Violation[] {
    const violations: Violation[] = [];

    for (const pattern of CONTENT_SAFETY_KEYWORDS) {
      const matches = text.match(pattern);
      if (matches) {
        violations.push({
          type: "content_safety",
          severity: "warn",
          matched: matches[0],
        });
      }
    }

    return violations;
  }

  private parseConfig(configStr: string | null): GuardrailConfig {
    if (!configStr) {
      return { piiDetection: true, injectionBlocking: true, contentSafety: true };
    }

    try {
      return JSON.parse(configStr);
    } catch {
      return { piiDetection: true, injectionBlocking: true, contentSafety: true };
    }
  }

  private async getActiveGuardrails(type: string) {
    const db = await getDb();
    if (!db) return [];

    try {
      const result = await db
        .select()
        .from(guardrails)
        .where(eq(guardrails.enabled, 1));

      return result.filter((g) => g.type === type);
    } catch {
      return [];
    }
  }

  async evaluatePolicy(
    keyId: number,
    teamId: number,
    model: string,
    input: string,
    output?: string
  ): Promise<PolicyResult> {
    const db = await getDb();
    if (!db) {
      return {
        passed: true,
        policyName: "default",
        violations: [],
        guardrailResults: [],
      };
    }

    try {
      const allPolicies = await db.select().from(policies);
      const allGuardrailResults: GuardrailResult[] = [];
      let policyName = "default";

      for (const policy of allPolicies) {
        if (policy.teamIds && !policy.teamIds.includes(String(teamId))) continue;
        if (policy.keyIds && !policy.keyIds.includes(String(keyId))) continue;
        if (policy.modelPatterns) {
          const modelMatches = policy.modelPatterns.some((pattern) =>
            new RegExp(pattern, "i").test(model)
          );
          if (!modelMatches) continue;
        }

        policyName = policy.name;

        if (policy.guardrailIds) {
          for (const gId of policy.guardrailIds) {
            const guardrailId = parseInt(gId, 10);
            if (isNaN(guardrailId)) continue;

            const guardrailResult = await db
              .select()
              .from(guardrails)
              .where(eq(guardrails.id, guardrailId))
              .limit(1);

            if (guardrailResult.length > 0) {
              const guardrail = guardrailResult[0];
              const config = this.parseConfig(guardrail.config);
              const result = this.checkGuardrail(
                guardrail.name,
                guardrail.type,
                input,
                config
              );
              allGuardrailResults.push(result);
            }
          }
        }
      }

      const hasBlockViolation = allGuardrailResults.some(
        (r) => !r.passed
      );

      return {
        passed: !hasBlockViolation,
        policyName,
        violations: allGuardrailResults.flatMap((r) => r.violations),
        guardrailResults: allGuardrailResults,
      };
    } catch (error) {
      console.error("[GuardrailService] Policy evaluation failed:", error);
      return {
        passed: true,
        policyName: "default",
        violations: [],
        guardrailResults: [],
      };
    }
  }

  async createGuardrail(input: {
    name: string;
    type: string;
    config?: GuardrailConfig;
  }): Promise<number | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const result = await db
        .insert(guardrails)
        .values({
          name: input.name,
          type: input.type,
          config: input.config ? JSON.stringify(input.config) : null,
        })
        .returning({ id: guardrails.id });

      return result[0].id;
    } catch {
      return null;
    }
  }

  async updateGuardrail(
    id: number,
    updates: { name?: string; config?: GuardrailConfig; enabled?: number }
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      await db
        .update(guardrails)
        .set({
          ...updates,
          config: updates.config ? JSON.stringify(updates.config) : undefined,
        })
        .where(eq(guardrails.id, id));

      return true;
    } catch {
      return false;
    }
  }

  async deleteGuardrail(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      await db.delete(guardrails).where(eq(guardrails.id, id));
      return true;
    } catch {
      return false;
    }
  }
}

export const guardrailService = new GuardrailService();
