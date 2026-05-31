import { eq, and, desc, sql, ilike } from "drizzle-orm";
import { getDb } from "../db";
import { documents, documentChunks } from "../../drizzle/schema";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface DocumentInfo {
  id: number;
  name: string;
  type: string;
  chunkCount: number;
  totalTokens: number;
  createdAt: Date;
}

export interface SearchResult {
  chunkId: number;
  documentId: number;
  documentName: string;
  content: string;
  score: number;
}

export class RagService {
  async uploadDocument(
    tenantId: number,
    name: string,
    type: string,
    content: string,
    uploadedBy?: number
  ): Promise<DocumentInfo> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create document record
    const docResult = await db.insert(documents).values({
      tenantId,
      name,
      type,
      uploadedBy,
    }).returning({ id: documents.id });

    const docId = docResult[0].id;

    // Chunk the content
    const chunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP);

    // Store chunks
    for (let i = 0; i < chunks.length; i++) {
      await db.insert(documentChunks).values({
        documentId: docId,
        tenantId,
        chunkIndex: i,
        content: chunks[i],
        tokenCount: estimateTokens(chunks[i]),
      });
    }

    // Update document with chunk count
    const totalTokens = chunks.reduce((sum, c) => sum + estimateTokens(c), 0);
    await db.update(documents).set({
      chunkCount: chunks.length,
      totalTokens,
    }).where(eq(documents.id, docId));

    return {
      id: docId,
      name,
      type,
      chunkCount: chunks.length,
      totalTokens,
      createdAt: new Date(),
    };
  }

  async similaritySearch(
    tenantId: number,
    query: string,
    topK: number = 5
  ): Promise<SearchResult[]> {
    const db = await getDb();
    if (!db) return [];

    // Simple keyword-based search (upgradeable to vector search)
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (keywords.length === 0) return [];

    // Build SQL LIKE conditions for keyword matching
    const conditions = keywords.map(kw => sql`lower(${documentChunks.content}) LIKE ${`%${kw}%`}`);

    try {
      const results = await db.select({
        chunkId: documentChunks.id,
        documentId: documentChunks.documentId,
        content: documentChunks.content,
        docName: documents.name,
        matchCount: sql<number>`(
          ${conditions.reduce((acc, cond) => sql`${acc} + CASE WHEN ${cond} THEN 1 ELSE 0 END`, sql`0`)}
        )`,
      })
        .from(documentChunks)
        .innerJoin(documents, eq(documents.id, documentChunks.documentId))
        .where(eq(documentChunks.tenantId, tenantId))
        .orderBy(desc(sql`(
          ${conditions.reduce((acc, cond) => sql`${acc} + CASE WHEN ${cond} THEN 1 ELSE 0 END`, sql`0`)}
        )`))
        .limit(topK);

      return results.map(r => ({
        chunkId: r.chunkId,
        documentId: r.documentId,
        documentName: r.docName,
        content: r.content,
        score: r.matchCount / keywords.length,
      }));
    } catch {
      return [];
    }
  }

  async listDocuments(tenantId: number, limit: number = 50, offset: number = 0): Promise<DocumentInfo[]> {
    const db = await getDb();
    if (!db) return [];

    const result = await db.select().from(documents)
      .where(eq(documents.tenantId, tenantId))
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      chunkCount: d.chunkCount,
      totalTokens: d.totalTokens,
      createdAt: d.createdAt,
    }));
  }

  async deleteDocument(documentId: number, tenantId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Delete chunks first
    await db.delete(documentChunks).where(
      and(eq(documentChunks.documentId, documentId), eq(documentChunks.tenantId, tenantId))
    );

    // Delete document
    await db.delete(documents).where(
      and(eq(documents.id, documentId), eq(documents.tenantId, tenantId))
    );
  }

  async getDocumentChunks(documentId: number, tenantId: number): Promise<string[]> {
    const db = await getDb();
    if (!db) return [];

    const result = await db.select({ content: documentChunks.content })
      .from(documentChunks)
      .where(and(eq(documentChunks.documentId, documentId), eq(documentChunks.tenantId, tenantId)))
      .orderBy(documentChunks.chunkIndex);

    return result.map(r => r.content);
  }
}

export const ragService = new RagService();
