import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { skills } from "../../drizzle/schema";
import { llmRouter } from "./llm_router";

const SKILLS_DIR = path.resolve(process.cwd(), "skills");
const SKILL_MD = "SKILL.md";

interface SkillMetadata {
  name: string;
  description: string;
  category: string;
  script?: string;
  args?: string[];
}

interface SkillDefinition {
  id: number;
  name: string;
  description: string | null;
  path: string;
  category: string;
  enabled: number;
  lastExecuted: Date | null;
  createdAt: Date;
}

interface SkillExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Built-in skills that use LLM for processing
const BUILTIN_SKILLS: Record<string, { description: string; category: string; handler: (input: string) => Promise<string> }> = {
  "code-review": {
    description: "Analyze code and return review comments",
    category: "development",
    handler: async (input: string) => {
      const response = await llmRouter.complete({
        messages: [
          { role: "system", content: "You are a senior code reviewer. Analyze the code and provide specific, actionable review comments. Focus on bugs, security issues, performance, and code quality. Be concise." },
          { role: "user", content: `Review this code:\n\n${input}` },
        ],
        taskType: "coding",
        maxTokens: 2048,
      });
      return response.choices[0]?.message?.content || "No response";
    },
  },
  "summarizer": {
    description: "Summarize long text into a concise overview",
    category: "productivity",
    handler: async (input: string) => {
      const response = await llmRouter.complete({
        messages: [
          { role: "system", content: "You are a professional summarizer. Create a concise, accurate summary of the provided text. Keep key points and important details. Aim for 20-30% of original length." },
          { role: "user", content: `Summarize this:\n\n${input}` },
        ],
        taskType: "chat",
        maxTokens: 2048,
      });
      return response.choices[0]?.message?.content || "No response";
    },
  },
  "translator": {
    description: "Translate text to a target language",
    category: "productivity",
    handler: async (input: string) => {
      const lines = input.split("\n");
      const targetLang = lines[0]?.startsWith("lang:") ? lines[0].replace("lang:", "").trim() : "English";
      const text = lines[0]?.startsWith("lang:") ? lines.slice(1).join("\n") : input;
      const response = await llmRouter.complete({
        messages: [
          { role: "system", content: `You are a professional translator. Translate the text to ${targetLang}. Preserve formatting and meaning. Output ONLY the translated text.` },
          { role: "user", content: text },
        ],
        taskType: "chat",
        maxTokens: 4096,
      });
      return response.choices[0]?.message?.content || "No response";
    },
  },
  "sql-generator": {
    description: "Generate SQL queries from natural language",
    category: "development",
    handler: async (input: string) => {
      const response = await llmRouter.complete({
        messages: [
          { role: "system", content: "You are a SQL expert. Convert natural language descriptions into SQL queries. Output ONLY the SQL query, no explanation. Use standard SQL syntax." },
          { role: "user", content: `Generate SQL for: ${input}` },
        ],
        taskType: "coding",
        maxTokens: 1024,
      });
      return response.choices[0]?.message?.content || "No response";
    },
  },
  "json-formatter": {
    description: "Format and validate JSON data",
    category: "development",
    handler: async (input: string) => {
      try {
        const parsed = JSON.parse(input);
        return JSON.stringify(parsed, null, 2);
      } catch (e: any) {
        return `Invalid JSON: ${e.message}`;
      }
    },
  },
  "text-extractor": {
    description: "Extract key information from text",
    category: "productivity",
    handler: async (input: string) => {
      const response = await llmRouter.complete({
        messages: [
          { role: "system", content: "Extract key information from the text. Return: 1) Main topic 2) Key facts 3) Names/entities mentioned 4) Dates/numbers 5) Action items if any. Format as structured output." },
          { role: "user", content: input },
        ],
        taskType: "chat",
        maxTokens: 2048,
      });
      return response.choices[0]?.message?.content || "No response";
    },
  },
};

export class SkillManager {
  async scanSkills(): Promise<SkillMetadata[]> {
    const discovered: SkillMetadata[] = [];

    if (!fs.existsSync(SKILLS_DIR)) {
      return discovered;
    }

    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillDir = path.join(SKILLS_DIR, entry.name);
      const skillMdPath = path.join(skillDir, SKILL_MD);

      if (!fs.existsSync(skillMdPath)) continue;

      const metadata = this.parseSkillMd(skillMdPath, skillDir);
      if (metadata) {
        discovered.push(metadata);
      }
    }

    return discovered;
  }

  private parseSkillMd(filePath: string, skillDir: string): SkillMetadata | null {
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      const nameMatch = content.match(/^#\s+(.+)$/m);
      const descMatch = content.match(/##\s+Description\s*\n[\s\S]*?\n(.+?)(?=\n##|\n*$)/);
      const categoryMatch = content.match(/##\s+Category\s*\n[\s\S]*?\n(.+?)(?=\n##|\n*$)/);
      const scriptMatch = content.match(/##\s+Script\s*\n[\s\S]*?\n(.+?)(?=\n##|\n*$)/);

      if (!nameMatch) return null;

      return {
        name: nameMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : "",
        category: categoryMatch ? categoryMatch[1].trim() : "general",
        script: scriptMatch ? scriptMatch[1].trim() : undefined,
      };
    } catch {
      return null;
    }
  }

  async syncToDatabase(): Promise<number> {
    const db = await getDb();
    if (!db) return 0;

    const discovered = await this.scanSkills();
    let count = 0;

    for (const skill of discovered) {
      try {
        const skillDir = this.findSkillDir(skill.name);
        if (!skillDir) continue;

        await db
          .insert(skills)
          .values({
            name: skill.name,
            description: skill.description,
            path: skillDir,
            category: skill.category,
          })
          .onConflictDoUpdate({
            target: skills.name,
            set: {
              description: skill.description,
              path: skillDir,
              category: skill.category,
            },
          });

        count++;
      } catch {
        // Skip failed skills
      }
    }

    return count;
  }

  private findSkillDir(skillName: string): string | null {
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillMdPath = path.join(SKILLS_DIR, entry.name, SKILL_MD);
      if (!fs.existsSync(skillMdPath)) continue;

      const content = fs.readFileSync(skillMdPath, "utf-8");
      const nameMatch = content.match(/^#\s+(.+)$/m);
      if (nameMatch && nameMatch[1].trim() === skillName) {
        return path.join(SKILLS_DIR, entry.name);
      }
    }

    return null;
  }

  async listSkills(tenantId?: number): Promise<SkillDefinition[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      let result;
      if (tenantId) {
        const { and, sql } = await import("drizzle-orm");
        result = await db.select().from(skills).where(
          and(sql`(${skills.tenantId} = ${tenantId}) OR (${skills.tenantId} IS NULL)`)
        ).orderBy(skills.name);
      } else {
        result = await db.select().from(skills).orderBy(skills.name);
      }
      return result as SkillDefinition[];
    } catch {
      return [];
    }
  }

  async getSkillByName(name: string): Promise<SkillDefinition | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const result = await db
        .select()
        .from(skills)
        .where(eq(skills.name, name))
        .limit(1);

      return result.length > 0 ? (result[0] as SkillDefinition) : null;
    } catch {
      return null;
    }
  }

  async executeSkill(
    name: string,
    args: Record<string, string> = {}
  ): Promise<SkillExecutionResult> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const skill = await this.getSkillByName(name);
    if (!skill) {
      return { success: false, error: `Skill '${name}' not found` };
    }

    if (skill.enabled !== 1) {
      return { success: false, error: `Skill '${name}' is disabled` };
    }

    const skillDir = skill.path;
    if (!fs.existsSync(skillDir)) {
      return { success: false, error: `Skill directory not found: ${skillDir}` };
    }

    const skillMdContent = fs.readFileSync(path.join(skillDir, SKILL_MD), "utf-8");
    const metadata = this.parseSkillMd(path.join(skillDir, SKILL_MD), skillDir);

    if (!metadata?.script) {
      return { success: false, error: `No script defined for skill '${name}'` };
    }

    const scriptPath = path.join(skillDir, metadata.script);
    if (!fs.existsSync(scriptPath)) {
      return { success: false, error: `Script not found: ${scriptPath}` };
    }

    try {
      const argsStr = Object.entries(args)
        .map(([k, v]) => `--${k} "${v}"`)
        .join(" ");

      const output = execSync(`bash "${scriptPath}" ${argsStr}`, {
        encoding: "utf-8",
        timeout: 60000,
        cwd: skillDir,
      });

      await db
        .update(skills)
        .set({ lastExecuted: new Date() })
        .where(eq(skills.name, name));

      return { success: true, output };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async enableSkill(name: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      await db
        .update(skills)
        .set({ enabled: 1 })
        .where(eq(skills.name, name));
      return true;
    } catch {
      return false;
    }
  }

  async disableSkill(name: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      await db
        .update(skills)
        .set({ enabled: 0 })
        .where(eq(skills.name, name));
      return true;
    } catch {
      return false;
    }
  }

  async deleteSkill(name: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      await db.delete(skills).where(eq(skills.name, name));
      return true;
    } catch {
      return false;
    }
  }

  // Auto-discover skills from filesystem and built-ins, sync to database
  async autoDiscover(): Promise<{ discovered: number; builtIn: number; total: number }> {
    const db = await getDb();
    if (!db) return { discovered: 0, builtIn: 0, total: 0 };

    let discovered = 0;
    let builtIn = 0;

    // 1. Discover filesystem skills
    const fsSkills = await this.scanSkills();
    for (const skill of fsSkills) {
      try {
        const existing = await db.select().from(skills).where(eq(skills.name, skill.name)).limit(1);
        if (existing.length === 0) {
          await db.insert(skills).values({
            name: skill.name,
            description: skill.description,
            path: path.join(SKILLS_DIR, skill.name),
            category: skill.category,
            enabled: 1,
          });
          discovered++;
          console.log(`[Skills] Discovered filesystem skill: ${skill.name}`);
        }
      } catch {}
    }

    // 2. Register built-in skills
    for (const [name, def] of Object.entries(BUILTIN_SKILLS)) {
      try {
        const existing = await db.select().from(skills).where(eq(skills.name, name)).limit(1);
        if (existing.length === 0) {
          await db.insert(skills).values({
            name,
            description: def.description,
            path: `builtin:${name}`,
            category: def.category,
            enabled: 1,
          });
          builtIn++;
          console.log(`[Skills] Registered built-in skill: ${name}`);
        }
      } catch {}
    }

    const allSkills = await db.select().from(skills).where(sql`1=1`);
    const total = allSkills.length;
    console.log(`[Skills] Auto-discovery complete: ${discovered} filesystem, ${builtIn} built-in, ${total} total`);

    return { discovered, builtIn, total };
  }

  // Execute a skill (built-in or filesystem)
  async executeWithBuiltin(
    name: string,
    input: string,
    tenantId?: number
  ): Promise<SkillExecutionResult> {
    // Check built-in first
    const builtin = BUILTIN_SKILLS[name];
    if (builtin) {
      try {
        const output = await builtin.handler(input);
        // Update lastExecuted
        const db = await getDb();
        if (db) {
          try {
            await db.update(skills).set({ lastExecuted: new Date() }).where(eq(skills.name, name));
          } catch {}
        }
        return { success: true, output };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }

    // Fall back to filesystem skill
    return this.executeSkill(name, { input });
  }

  // List all available skills (built-in + filesystem)
  async listAllSkills(): Promise<Array<{ name: string; description: string; category: string; type: "builtin" | "filesystem"; enabled: boolean }>> {
    const result: Array<{ name: string; description: string; category: string; type: "builtin" | "filesystem"; enabled: boolean }> = [];

    // Built-in skills
    for (const [name, def] of Object.entries(BUILTIN_SKILLS)) {
      result.push({
        name,
        description: def.description,
        category: def.category,
        type: "builtin",
        enabled: true,
      });
    }

    // Filesystem skills
    const fsSkills = await this.scanSkills();
    for (const skill of fsSkills) {
      result.push({
        name: skill.name,
        description: skill.description,
        category: skill.category,
        type: "filesystem",
        enabled: true,
      });
    }

    return result;
  }
}

export const skillManager = new SkillManager();
