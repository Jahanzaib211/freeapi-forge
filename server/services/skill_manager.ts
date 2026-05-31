import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { skills } from "../../drizzle/schema";

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

  async listSkills(): Promise<SkillDefinition[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const result = await db.select().from(skills).orderBy(skills.name);
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
}

export const skillManager = new SkillManager();
