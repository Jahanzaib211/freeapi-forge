import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { onboardingProfiles } from "../../drizzle/schema";
import { forgeBrainService } from "./forge-brain-service";

const SECTIONS = [
  {
    id: "purpose",
    title: "What brings you to Forge Studio?",
    description: "Select all that apply. This helps us configure the right tools.",
    type: "multi-select",
    options: [
      { id: "chat", label: "AI Chat", icon: "💬", description: "Conversational AI for daily use" },
      { id: "agents", label: "Autonomous Agents", icon: "🤖", description: "Build and deploy AI agents" },
      { id: "code", label: "Code Generation", icon: "💻", description: "Coding assistance and review" },
      { id: "workflows", label: "Workflows", icon: "⚡", description: "Automate multi-step processes" },
      { id: "models", label: "Model Testing", icon: "🧪", description: "Compare and benchmark models" },
      { id: "mcp", label: "MCP Tools", icon: "🔌", description: "Connect external tools and APIs" },
      { id: "experiment", label: "Just Exploring", icon: "🔍", description: "Learning about AI capabilities" },
      { id: "production", label: "Production Deploy", icon: "🚀", description: "Building for production use" },
    ],
  },
  {
    id: "experience",
    title: "Experience level?",
    description: "This helps us recommend the right models and tools.",
    type: "single-select",
    options: [
      { id: "beginner", label: "Beginner", description: "New to AI and LLMs" },
      { id: "intermediate", label: "Intermediate", description: "Used ChatGPT, played with APIs" },
      { id: "advanced", label: "Advanced", description: "Built with LLMs, know prompt engineering" },
      { id: "expert", label: "Expert", description: "ML engineer, fine-tuned models, deployed at scale" },
      { id: "researcher", label: "Researcher", description: "Active in AI research, pushing boundaries" },
    ],
  },
  {
    id: "infra",
    title: "How do you want to run models?",
    description: "Cloud APIs, local models, or both?",
    type: "single-select",
    options: [
      { id: "cloud", label: "Cloud APIs", description: "OpenAI, Anthropic, Groq — no setup" },
      { id: "local", label: "Local Only", description: "Ollama, LM Studio — full privacy" },
      { id: "hybrid", label: "Hybrid", description: "Cloud for heavy, local for fast/private" },
      { id: "undecided", label: "Not sure", description: "Help me decide" },
    ],
  },
  {
    id: "apiKeys",
    title: "API keys ready?",
    description: "Check the providers you have keys for.",
    type: "multi-select",
    options: [
      { id: "openai", label: "OpenAI" },
      { id: "anthropic", label: "Anthropic" },
      { id: "groq", label: "Groq (free tier)" },
      { id: "together", label: "Together AI" },
      { id: "deepseek", label: "DeepSeek" },
      { id: "mistral", label: "Mistral" },
      { id: "google", label: "Google Gemini" },
      { id: "none", label: "None — I'll start with free providers" },
      { id: "all", label: "All of them — I have keys" },
    ],
  },
  {
    id: "useCase",
    title: "Primary use case?",
    description: "Describe what you want to build or accomplish.",
    type: "text",
    suggestions: [
      "Customer support chatbot",
      "Code review agent",
      "Document analysis pipeline",
      "Research assistant",
      "Content generation",
      "Data extraction",
      "Personal AI assistant",
      "Educational tutor",
    ],
  },
  {
    id: "budget",
    title: "Budget preference?",
    description: "This helps us configure cost alerts and free fallbacks.",
    type: "single-select",
    options: [
      { id: "free", label: "Free tier only", description: "Start with free providers and local models" },
      { id: "low", label: "Low (<$20/mo)", description: "Moderate API usage" },
      { id: "medium", label: "Medium ($20-100/mo)", description: "Regular daily use" },
      { id: "high", label: "High ($100+/mo)", description: "Heavy production use" },
      { id: "unlimited", label: "Unlimited", description: "Enterprise scale, cost not a concern" },
    ],
  },
];

const AUTO_CONFIG_MATRIX: Record<string, { providers: string[]; agents: string[]; workflow: string }> = {
  "chat+cloud+free": { providers: ["groq", "together"], agents: ["general-assistant", "chat-bot"], workflow: "simple-chat-flow" },
  "chat+cloud+paid": { providers: ["openai", "anthropic"], agents: ["general-assistant", "code-reviewer"], workflow: "chat-with-memory" },
  "chat+local": { providers: ["ollama"], agents: ["local-chat-bot"], workflow: "simple-chat-flow" },
  "code+cloud": { providers: ["anthropic", "deepseek"], agents: ["code-reviewer", "pair-programmer"], workflow: "review-fix-test" },
  "agents+cloud": { providers: ["openai", "anthropic"], agents: ["tool-agent", "research-agent"], workflow: "memory-loop-agent" },
  "workflows+cloud": { providers: ["openai"], agents: ["orchestrator"], workflow: "multi-step-pipeline" },
  "models+cloud": { providers: ["openai", "anthropic", "groq"], agents: [], workflow: "" },
  "mcp+cloud": { providers: ["openai"], agents: ["tool-agent"], workflow: "mcp-chain" },
};

export class OnboardingService {

  getQuestionnaire(): any[] {
    return SECTIONS;
  }

  async processQuestionnaire(tenantId: number, answers: Record<string, any>): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const useCase = {
      primary: answers.purpose || [],
      experience: answers.experience,
      infra: answers.infra,
      apiKeys: answers.apiKeys || [],
      useCaseText: answers.useCase || "",
      budget: answers.budget,
    };

    // Determine auto-config
    const purposes: string[] = Array.isArray(answers.purpose) ? answers.purpose : [answers.purpose];
    const isCloud = answers.infra === "cloud" || answers.infra === "hybrid";
    const isFree = answers.budget === "free" || answers.apiKeys?.includes("none");

    let autoConfig: { providers: string[]; agents: string[]; workflows: string[]; mcps: string[] } = {
      providers: [], agents: [], workflows: [], mcps: [],
    };

    for (const purpose of purposes) {
      const key = `${purpose}+${isCloud ? "cloud" : "local"}+${isFree ? "free" : "paid"}`;
      const match = AUTO_CONFIG_MATRIX[key];
      if (match) {
        autoConfig.providers.push(...match.providers.filter(p => !autoConfig.providers.includes(p)));
        autoConfig.agents.push(...match.agents.filter(a => !autoConfig.agents.includes(a)));
        if (match.workflow) autoConfig.workflows.push(match.workflow);
      }
    }

    // Fallback
    if (autoConfig.providers.length === 0) autoConfig.providers = ["groq", "ollama"];
    if (autoConfig.agents.length === 0) autoConfig.agents = ["general-assistant"];

    // Upsert profile
    const existing = await db.select({ id: onboardingProfiles.id }).from(onboardingProfiles)
      .where(eq(onboardingProfiles.tenantId, tenantId)).limit(1);

    if (existing.length > 0) {
      await db.update(onboardingProfiles).set({
        useCase: JSON.stringify(useCase),
        preferredProviders: JSON.stringify(autoConfig.providers),
        preferredModels: JSON.stringify([]),
        autoConfigApplied: JSON.stringify(autoConfig),
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(onboardingProfiles.id, existing[0].id));
    } else {
      await db.insert(onboardingProfiles).values({
        tenantId,
        useCase: JSON.stringify(useCase),
        preferredProviders: JSON.stringify(autoConfig.providers),
        preferredModels: JSON.stringify([]),
        autoConfigApplied: JSON.stringify(autoConfig),
        completedAt: new Date(),
      });
    }

    // Create brain node
    await forgeBrainService.createNode(tenantId, "onboarding", `session-${Date.now()}`,
      "Onboarding Session",
      `# Onboarding Session\n> Completed on ${new Date().toISOString()}\n## Choices\n${JSON.stringify(useCase, null, 2)}\n## Auto-Config\n${JSON.stringify(autoConfig, null, 2)}`,
      { title: "Onboarding Session", type: "onboarding", completedAt: new Date().toISOString() },
      ["onboarding"],
    );

    return {
      profile: { useCase, preferredProviders: autoConfig.providers, preferredModels: [] },
      autoConfig,
      summary: `Studio configured: ${autoConfig.providers.length} providers, ${autoConfig.agents.length} agents, ${autoConfig.workflows.length} workflows`,
    };
  }

  async getProfile(tenantId: number): Promise<any> {
    const db = await getDb();
    if (!db) return null;
    return db.select().from(onboardingProfiles)
      .where(eq(onboardingProfiles.tenantId, tenantId)).limit(1).then(r => r[0] || null);
  }
}

export const onboardingService = new OnboardingService();
