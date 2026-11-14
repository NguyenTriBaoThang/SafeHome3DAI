import { prisma } from "@/lib/database/prisma";
import { ConversationTurn } from "@/lib/rag/queryAnalysis";
import { GroundedGenerationResult } from "@/lib/rag/types";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface EnrichedMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  evidenceStatus: string;
  responseMode: string;
  modelProvider: string;
  modelName: string;
  createdAt: string;
  citations: {
    citationId: string;
    citationNumber: number;
    documentTitle: string;
    publisher: string;
    sectionTitle: string;
    pageNumber?: number;
    supportingExcerpt: string;
    officialUrl?: string;
  }[];
}

/**
 * Create a new conversation session.
 */
export async function createConversation(title = "Tư vấn an toàn phòng ngừa té ngã"): Promise<ConversationSummary> {
  const conv = await prisma.conversation.create({
    data: {
      title,
    },
  });

  return {
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messageCount: 0,
  };
}

/**
 * List all conversations sorted by last update.
 */
export async function listConversations(): Promise<ConversationSummary[]> {
  try {
    const convs = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return convs.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messageCount: c._count.messages,
    }));
  } catch (err) {
    console.warn("DB listConversations error, returning empty list:", err);
    return [];
  }
}

/**
 * Get single conversation with its full message history and citations.
 */
export async function getConversationWithMessages(
  conversationId: string
): Promise<{ id: string; title: string; messages: EnrichedMessage[] } | null> {
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            citationsList: true,
          },
        },
      },
    });

    if (!conv) return null;

    const messages: EnrichedMessage[] = conv.messages.map((m) => {
      // Parse legacy cached citations if citationsList is empty
      let parsedCitations: any[] = [];
      if (m.citationsList && m.citationsList.length > 0) {
        parsedCitations = m.citationsList.map((c) => ({
          citationId: c.id,
          citationNumber: c.citationNumber,
          documentTitle: c.documentTitle,
          publisher: c.publisher,
          sectionTitle: c.sectionTitle,
          pageNumber: c.pageNumber ?? undefined,
          supportingExcerpt: c.supportingExcerpt,
          officialUrl: c.officialUrl ?? undefined,
        }));
      } else if (m.citations) {
        try {
          parsedCitations = JSON.parse(m.citations);
        } catch (e) {}
      }

      return {
        id: m.id,
        conversationId: m.conversationId,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        evidenceStatus: m.evidenceStatus || "SUPPORTED",
        responseMode: m.responseMode || "LOCAL_GROUNDED",
        modelProvider: m.modelProvider || "SafeHome-LocalRAG",
        modelName: m.modelName || "curated-evidence-engine-v2",
        createdAt: m.createdAt.toISOString(),
        citations: parsedCitations,
      };
    });

    return {
      id: conv.id,
      title: conv.title,
      messages,
    };
  } catch (err) {
    console.warn("DB getConversationWithMessages error:", err);
    return null;
  }
}

/**
 * Rename a conversation session.
 */
export async function renameConversation(
  conversationId: string,
  newTitle: string
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { title: newTitle.trim(), updatedAt: new Date() },
  });
}

/**
 * Delete a conversation and all its messages.
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  await prisma.conversation.delete({
    where: { id: conversationId },
  });
}

/**
 * Save user query message to database.
 */
export async function saveUserMessage(
  conversationId: string,
  content: string
): Promise<EnrichedMessage> {
  // Ensure conversation exists or create it
  let conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        id: conversationId,
        title: content.slice(0, 36) + (content.length > 36 ? "..." : ""),
      },
    });
  } else {
    // Update title if it's the first message
    const msgCount = await prisma.conversationMessage.count({
      where: { conversationId },
    });
    if (msgCount === 0) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title: content.slice(0, 36) + (content.length > 36 ? "..." : "") },
      });
    }
  }

  const message = await prisma.conversationMessage.create({
    data: {
      conversationId,
      role: "user",
      content,
      evidenceStatus: "SUPPORTED",
      responseMode: "USER_INPUT",
    },
  });

  return {
    id: message.id,
    conversationId: message.conversationId,
    role: "user",
    content: message.content,
    evidenceStatus: "SUPPORTED",
    responseMode: "USER_INPUT",
    modelProvider: "user",
    modelName: "human",
    createdAt: message.createdAt.toISOString(),
    citations: [],
  };
}

/**
 * Save assistant message along with structured citations to database.
 */
export async function saveAssistantMessage(
  conversationId: string,
  result: GroundedGenerationResult
): Promise<EnrichedMessage> {
  const message = await prisma.conversationMessage.create({
    data: {
      conversationId,
      role: "assistant",
      content: result.answer,
      evidenceStatus: result.evidenceStatus,
      responseMode: result.responseMode,
      modelProvider: result.modelProvider,
      modelName: result.modelName,
      warnings: JSON.stringify(result.warnings),
      retrievedPassageIds: JSON.stringify(result.retrievedChunkIds),
      citations: JSON.stringify(result.citations),
      citationsList: {
        create: result.citations.map((c) => ({
          sourceId: c.documentId,
          passageId: c.chunkId,
          citationNumber: c.citationNumber,
          documentTitle: c.documentTitle,
          publisher: c.publisher,
          sectionTitle: c.sectionTitle,
          pageNumber: c.pageNumber,
          supportingExcerpt: c.supportingExcerpt,
          officialUrl: c.officialUrl,
        })),
      },
    },
    include: {
      citationsList: true,
    },
  });

  // Update conversation updatedAt timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return {
    id: message.id,
    conversationId: message.conversationId,
    role: "assistant",
    content: message.content,
    evidenceStatus: message.evidenceStatus || result.evidenceStatus,
    responseMode: message.responseMode || result.responseMode,
    modelProvider: message.modelProvider || result.modelProvider,
    modelName: message.modelName || result.modelName,
    createdAt: message.createdAt.toISOString(),
    citations: result.citations,
  };
}

/**
 * Retrieve recent turns from a conversation for contextual query rewriting.
 */
export async function getRecentConversationTurns(
  conversationId: string,
  limit = 4
): Promise<ConversationTurn[]> {
  try {
    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        role: true,
        content: true,
      },
    });

    return messages
      .reverse()
      .map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));
  } catch (e) {
    return [];
  }
}

