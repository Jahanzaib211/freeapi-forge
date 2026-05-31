import { EventEmitter } from "events";
import { lt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { systemEvents } from "../../drizzle/schema";

type LogLevel = "error" | "warn" | "info" | "debug";

interface ErrorEvent {
  level: LogLevel;
  source: string;
  message: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface ErrorLoggerOptions {
  persistToDb?: boolean;
  consoleOutput?: boolean;
  maxListeners?: number;
}

export class ErrorLogger extends EventEmitter {
  private persistToDb: boolean;
  private consoleOutput: boolean;
  private buffer: ErrorEvent[];
  private flushInterval: NodeJS.Timeout | null = null;
  private flushSize: number = 10;
  private flushIntervalMs: number = 5000;

  constructor(options: ErrorLoggerOptions = {}) {
    super();
    this.persistToDb = options.persistToDb !== false;
    this.consoleOutput = options.consoleOutput !== false;
    this.buffer = [];

    if (options.maxListeners) {
      this.setMaxListeners(options.maxListeners);
    }

    if (this.persistToDb) {
      this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
    }
  }

  log(level: LogLevel, source: string, message: string, metadata?: Record<string, any>): void {
    const event: ErrorEvent = {
      level,
      source,
      message,
      metadata,
      timestamp: new Date(),
    };

    if (this.consoleOutput) {
      this.consoleLog(event);
    }

    this.emit("log", event);

    if (level === "error") {
      this.emit("error", event);
    }

    if (this.persistToDb) {
      this.buffer.push(event);
      if (this.buffer.length >= this.flushSize) {
        this.flush();
      }
    }
  }

  error(source: string, message: string, error?: Error, metadata?: Record<string, any>): void {
    const enrichedMetadata = { ...metadata };
    if (error) {
      enrichedMetadata.errorName = error.name;
      enrichedMetadata.errorMessage = error.message;
      enrichedMetadata.stackTrace = error.stack;
    }
    this.log("error", source, message, enrichedMetadata);
  }

  warn(source: string, message: string, metadata?: Record<string, any>): void {
    this.log("warn", source, message, metadata);
  }

  info(source: string, message: string, metadata?: Record<string, any>): void {
    this.log("info", source, message, metadata);
  }

  debug(source: string, message: string, metadata?: Record<string, any>): void {
    this.log("debug", source, message, metadata);
  }

  private consoleLog(event: ErrorEvent): void {
    const prefix = `[${event.level.toUpperCase()}] [${event.source}]`;
    const message = `${prefix} ${event.message}`;

    switch (event.level) {
      case "error":
        console.error(message);
        break;
      case "warn":
        console.warn(message);
        break;
      case "info":
        console.info(message);
        break;
      case "debug":
        console.debug(message);
        break;
    }

    if (event.metadata?.stackTrace && event.level === "error") {
      console.error(event.metadata.stackTrace);
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    const db = await getDb();
    if (!db) {
      console.warn("[ErrorLogger] Database not available, dropping events");
      return;
    }

    try {
      const inserts = events.map((event) => ({
        level: event.level,
        source: event.source,
        message: event.message,
        stackTrace: event.metadata?.stackTrace || null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        createdAt: event.timestamp,
      }));

      await db.insert(systemEvents).values(inserts);
    } catch (error) {
      console.error("[ErrorLogger] Failed to flush events to database:", error);
    }
  }

  async getRecentEvents(limit: number = 100): Promise<ErrorEvent[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const result = await db
        .select()
        .from(systemEvents)
        .orderBy(systemEvents.createdAt)
        .limit(limit);

      return result.map((row) => ({
        level: row.level as LogLevel,
        source: row.source,
        message: row.message,
        stackTrace: row.stackTrace || undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        timestamp: row.createdAt,
      }));
    } catch (error) {
      console.error("[ErrorLogger] Failed to fetch events:", error);
      return [];
    }
  }

  async clearOldEvents(olderThanDays: number = 30): Promise<number> {
    const db = await getDb();
    if (!db) return 0;

    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(systemEvents)
        .where(lt(systemEvents.createdAt, cutoff));
      
      const count = countResult[0]?.count ?? 0;

      await db
        .delete(systemEvents)
        .where(lt(systemEvents.createdAt, cutoff));

      return count;
    } catch (error) {
      console.error("[ErrorLogger] Failed to clear old events:", error);
      return 0;
    }
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
    this.removeAllListeners();
  }
}

export const errorLogger = new ErrorLogger();
