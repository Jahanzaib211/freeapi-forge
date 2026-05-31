import { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } from "discord.js";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { discordConfigs } from "../../drizzle/schema";
import { chatService } from "./chat-service";
import { eventBus } from "./event-bus";

interface DiscordBotInstance {
  client: Client;
  tenantId: number;
  config: typeof discordConfigs.$inferSelect;
}

class DiscordService {
  private bots: Map<number, DiscordBotInstance> = new Map();

  async startBot(tenantId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const configs = await db.select().from(discordConfigs)
      .where(and(eq(discordConfigs.tenantId, tenantId), eq(discordConfigs.enabled, 1)))
      .limit(1);

    if (configs.length === 0) return false;
    const config = configs[0];

    if (!config.botToken) return false;

    // Check if already running
    if (this.bots.has(tenantId)) {
      console.log(`[Discord] Bot already running for tenant ${tenantId}`);
      return true;
    }

    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
        ],
      });

      client.once(Events.ClientReady, async (readyClient: any) => {
        console.log(`[Discord] Bot logged in as ${readyClient.user.tag} for tenant ${tenantId}`);

        // Register slash commands
        const commands = [
          new SlashCommandBuilder()
            .setName("ask")
            .setDescription("Ask AI a question")
            .addStringOption((opt: any) => opt.setName("message").setDescription("Your message").setRequired(true)),
          new SlashCommandBuilder()
            .setName("status")
            .setDescription("Check system health"),
          new SlashCommandBuilder()
            .setName("models")
            .setDescription("List available AI models"),
        ];

        if (config.guildId) {
          const rest = new REST().setToken(config.botToken!);
          await rest.put(
            Routes.applicationGuildCommands(readyClient.user.id, config.guildId),
            { body: commands.map(cmd => cmd.toJSON()) }
          );
          console.log(`[Discord] Slash commands registered for guild ${config.guildId}`);
        }
      });

      // Handle slash commands
      client.on(Events.InteractionCreate, async (interaction: any) => {
        if (!interaction.isChatInputCommand()) return;

        const { commandName } = interaction;

        if (commandName === "ask") {
          const message = interaction.options.getString("message", true);
          await interaction.deferReply();

          try {
            // Create conversation for this Discord interaction
            const userId = parseInt(interaction.user.id) || 0;
            const conv = await chatService.createConversation(tenantId, userId, {
              title: `Discord: ${interaction.user.username}`,
              model: config.model || "fast-8b",
            });

            const result = await chatService.sendMessage(tenantId, userId, conv.id, message, {
              model: config.model || "fast-8b",
            });

            const response = result.assistantMessage.content;
            // Discord has 2000 char limit
            if (response.length > 2000) {
              const chunks = response.match(/[\s\S]{1,2000}/g) || [response];
              for (const chunk of chunks) {
                await interaction.followUp(chunk);
              }
            } else {
              await interaction.editReply(response);
            }
          } catch (err: any) {
            await interaction.editReply(`Error: ${err.message}`);
          }
        }

        if (commandName === "status") {
          await interaction.reply("System is healthy. All services operational.");
        }

        if (commandName === "models") {
          await interaction.reply("Available models: fast-8b, chat, coding, vision, fast, local");
        }
      });

      // Handle channel messages
      if (config.channelId) {
        client.on(Events.MessageCreate, async (message: any) => {
          if (message.author.bot) return;
          if (message.channel.id !== config.channelId) return;

          try {
            const userId = parseInt(message.author.id) || 0;
            const conv = await chatService.createConversation(tenantId, userId, {
              title: `Discord: ${message.author.username}`,
              model: config.model || "fast-8b",
            });

            const result = await chatService.sendMessage(tenantId, userId, conv.id, message.content, {
              model: config.model || "fast-8b",
            });

            const response = result.assistantMessage.content;
            if (response.length > 2000) {
              const chunks = response.match(/[\s\S]{1,2000}/g) || [response];
              for (const chunk of chunks) {
                await message.reply(chunk);
              }
            } else {
              await message.reply(response);
            }
          } catch (err: any) {
            await message.reply(`Error: ${err.message}`);
          }
        });
      }

      await client.login(config.botToken);
      this.bots.set(tenantId, { client, tenantId, config });
      return true;
    } catch (err: any) {
      console.error(`[Discord] Failed to start bot for tenant ${tenantId}:`, err.message);
      return false;
    }
  }

  async stopBot(tenantId: number): Promise<void> {
    const bot = this.bots.get(tenantId);
    if (bot) {
      bot.client.destroy();
      this.bots.delete(tenantId);
      console.log(`[Discord] Bot stopped for tenant ${tenantId}`);
    }
  }

  async isRunning(tenantId: number): Promise<boolean> {
    return this.bots.has(tenantId);
  }

  async configure(
    tenantId: number,
    botToken: string,
    guildId: string,
    channelId: string,
    model?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existing = await db.select().from(discordConfigs)
      .where(eq(discordConfigs.tenantId, tenantId))
      .limit(1);

    if (existing.length > 0) {
      await db.update(discordConfigs).set({
        botToken,
        guildId,
        channelId,
        model: model || "fast-8b",
        enabled: 1,
        updatedAt: new Date(),
      }).where(eq(discordConfigs.tenantId, tenantId));
    } else {
      await db.insert(discordConfigs).values({
        tenantId,
        botToken,
        guildId,
        channelId,
        model: model || "fast-8b",
        enabled: 1,
      });
    }
  }
}

export const discordService = new DiscordService();
