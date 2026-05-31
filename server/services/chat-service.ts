import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { conversations, messages } from "../../drizzle/schema";
import { llmRouter } from "./llm_router";
import { budgetService } from "./budget-service";
import { eventBus } from "./event-bus";
import { errorLogger } from "./error_logger";

export interface ConversationSummary {
  id: number;
  title: string;
  model: string | null;
  messageCount: number;
  totalTokens: number;
  totalCostUsd: number;
  lastMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecord {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  model: string | null;
  provider: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  status: string;
  createdAt: Date;
}

export class ChatService {
  async createConversation(
    tenantId: number,
    userId: number,
    options?: { title?: string; systemPrompt?: string; model?: string }
  ): Promise<{ id: number; title: string }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(conversations).values({
      tenantId,
      userId,
      title: options?.title || "New Chat",
      systemPrompt: options?.systemPrompt || null,
      model: options?.model || null,
    }).returning({ id: conversations.id, title: conversations.title });

    return result[0];
  }

  async getConversations(
    tenantId: number,
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<ConversationSummary[]> {
    const db = await getDb();
    if (!db) return [];

    const result = await db.select().from(conversations)
      .where(and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.userId, userId),
        isNull(conversations.deletedAt)
      ))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Get last message for each conversation
    const summaries: ConversationSummary[] = [];
    for (const conv of result) {
      let lastMessage: string | null = null;
      try {
        const lastMsg = await db.select({ content: messages.content })
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);
        if (lastMsg.length > 0) {
          lastMessage = lastMsg[0].content.slice(0, 100);
        }
      } catch {}

      summaries.push({
        id: conv.id,
        title: conv.title,
        model: conv.model,
        messageCount: conv.messageCount,
        totalTokens: conv.totalTokens,
        totalCostUsd: conv.totalCostUsd / 1_000_000,
        lastMessage,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      });
    }

    return summaries;
  }

  async getMessages(conversationId: number, tenantId: number): Promise<MessageRecord[]> {
    const db = await getDb();
    if (!db) return [];

    const result = await db.select().from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.tenantId, tenantId)
      ))
      .orderBy(messages.createdAt);

    return result.map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      model: m.model,
      provider: m.provider,
      promptTokens: m.promptTokens,
      completionTokens: m.completionTokens,
      totalTokens: m.totalTokens,
      costUsd: m.costUsd / 1_000_000,
      latencyMs: m.latencyMs,
      status: m.status,
      createdAt: m.createdAt,
    }));
  }

  async sendMessage(
    tenantId: number,
    userId: number,
    conversationId: number,
    content: string,
    options?: { model?: string; temperature?: number; maxTokens?: number }
  ): Promise<{ userMessage: MessageRecord; assistantMessage: MessageRecord }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify conversation belongs to tenant
    const convResult = await db.select().from(conversations)
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.tenantId, tenantId)
      ))
      .limit(1);

    if (convResult.length === 0) {
      throw new Error("Conversation not found");
    }

    const conv = convResult[0];
    const monthYear = new Date().toISOString().slice(0, 7);

    // Check budget
    const isBlocked = await budgetService.isBlocked(tenantId, monthYear);
    if (isBlocked) {
      throw new Error("Budget limit exceeded. Please upgrade your plan or wait for monthly reset.");
    }

    // Save user message
    const userMsgResult = await db.insert(messages).values({
      conversationId,
      tenantId,
      role: "user",
      content,
    }).returning();

    const userMessage: MessageRecord = {
      ...userMsgResult[0],
      costUsd: 0,
    };

    // Build context for LLM
    const history = await this.getMessages(conversationId, tenantId);
    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

    if (conv.systemPrompt) {
      chatMessages.push({ role: "system", content: conv.systemPrompt });
    }

    for (const msg of history) {
      if (msg.role === "user" || msg.role === "assistant") {
        chatMessages.push({ role: msg.role as "user" | "assistant", content: msg.content });
      }
    }

    // Call LLM
    const startTime = Date.now();
    let assistantContent = "";
    let model = options?.model || conv.model || "fast-8b";
    let provider = "unknown";
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const response = await llmRouter.complete({
        messages: chatMessages,
        taskType: "chat",
        maxTokens: options?.maxTokens || 2048,
        temperature: options?.temperature || 0.7,
        tenantId,
      });

      assistantContent = response.choices[0]?.message?.content || "";
      provider = response.provider;
      model = response.model || model;
      promptTokens = response.usage?.prompt_tokens || 0;
      completionTokens = response.usage?.completion_tokens || 0;
    } catch (err: any) {
      assistantContent = `Error: ${err.message}`;
      errorLogger.error("chat_service", `LLM call failed: ${err.message}`, err, { conversationId, model });
    }

    const latencyMs = Date.now() - startTime;
    const totalTokens = promptTokens + completionTokens;
    const costUsd = (totalTokens / 1_000_000) * 0.0001;

    // Save assistant message
    const assistantMsgResult = await db.insert(messages).values({
      conversationId,
      tenantId,
      role: "assistant",
      content: assistantContent,
      model,
      provider,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd: Math.round(costUsd * 1_000_000),
      latencyMs,
      status: "success",
    }).returning();

    const assistantMessage: MessageRecord = {
      ...assistantMsgResult[0],
      costUsd,
    };

    // Update conversation stats
    await db.update(conversations).set({
      messageCount: sql`${conversations.messageCount} + 2`,
      totalTokens: sql`${conversations.totalTokens} + ${totalTokens}`,
      totalCostUsd: sql`${conversations.totalCostUsd} + ${Math.round(costUsd * 1_000_000)}`,
      model,
      updatedAt: new Date(),
    }).where(eq(conversations.id, conversationId));

    // Record budget spend
    await budgetService.recordSpend(tenantId, monthYear, costUsd);

    // Emit event
    eventBus.publish("chat.message", {
      conversationId,
      model,
      tokens: totalTokens,
      costUsd,
      latencyMs,
    }, tenantId, userId);

    return { userMessage, assistantMessage };
  }

  async deleteConversation(conversationId: number, tenantId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(conversations)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.tenantId, tenantId)
      ));
  }

  async forkConversation(
    conversationId: number,
    tenantId: number,
    userId: number,
    fromMessageId?: number
  ): Promise<{ id: number; title: string }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get original conversation
    const origResult = await db.select().from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (origResult.length === 0) throw new Error("Conversation not found");
    const orig = origResult[0];

    // Create fork
    const forkResult = await db.insert(conversations).values({
      tenantId,
      userId,
      title: `${orig.title} (fork)`,
      systemPrompt: orig.systemPrompt,
      model: orig.model,
      forkedFrom: conversationId,
    }).returning({ id: conversations.id, title: conversations.title });

    const forkId = forkResult[0].id;

    // Copy messages up to fork point
    const whereConditions = [eq(messages.conversationId, conversationId), eq(messages.tenantId, tenantId)];
    if (fromMessageId) {
      whereConditions.push(sql`${messages.id} <= ${fromMessageId}`);
    }

    const origMessages = await db.select().from(messages)
      .where(and(...whereConditions))
      .orderBy(messages.createdAt);

    for (const msg of origMessages) {
      await db.insert(messages).values({
        conversationId: forkId,
        tenantId,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        provider: msg.provider,
        promptTokens: msg.promptTokens,
        completionTokens: msg.completionTokens,
        totalTokens: msg.totalTokens,
        costUsd: msg.costUsd,
        latencyMs: msg.latencyMs,
        status: msg.status,
      });
    }

    return forkResult[0];
  }

  async exportConversation(
    conversationId: number,
    tenantId: number,
    format: "json" | "markdown"
  ): Promise<string> {
    const convResult = await getDb();
    if (!convResult) throw new Error("Database not available");

    const db = convResult;
    const convResult2 = await db.select().from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
      .limit(1);

    if (convResult2.length === 0) throw new Error("Conversation not found");
    const conv = convResult2[0];

    const msgs = await this.getMessages(conversationId, tenantId);

    if (format === "json") {
      return JSON.stringify({
        title: conv.title,
        model: conv.model,
        systemPrompt: conv.systemPrompt,
        messages: msgs.map(m => ({
          role: m.role,
          content: m.content,
          model: m.model,
          tokens: m.totalTokens,
          costUsd: m.costUsd,
          createdAt: m.createdAt,
        })),
        stats: {
          totalMessages: msgs.length,
          totalTokens: conv.totalTokens,
          totalCostUsd: conv.totalCostUsd / 1_000_000,
        },
      }, null, 2);
    }

    // Markdown format
    let md = `# ${conv.title}\n\n`;
    md += `**Model:** ${conv.model || "default"}\n`;
    md += `**Messages:** ${msgs.length}\n`;
    md += `**Total Tokens:** ${conv.totalTokens}\n`;
    md += `**Total Cost:** $${(conv.totalCostUsd / 1_000_000).toFixed(4)}\n\n---\n\n`;

    if (conv.systemPrompt) {
      md += `## System Prompt\n\n${conv.systemPrompt}\n\n---\n\n`;
    }

    for (const msg of msgs) {
      const label = msg.role === "user" ? "**You**" : "**AI**";
      md += `### ${label}\n\n${msg.content}\n\n`;
    }

    return md;
  }
}

export const chatService = new ChatService();
