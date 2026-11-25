import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";
import { computeHash, ingestDocument } from "@/lib/rag/ingestion";
import {
  approveDocument,
  isDocumentOutdated,
  markDocumentOutdated,
  registerDocumentForReview,
  rejectDocument,
  removeDocument,
  resetDocumentRegistry,
  validateOfficialSourceUrl,
} from "@/lib/rag/documentRegistry";
import { retrieveEvidenceChunks } from "@/lib/rag/retrieval";
import { evaluateEvidenceSufficiency } from "@/lib/rag/evidenceSufficiency";
import { verifyAndFormatCitations } from "@/lib/rag/citationVerifier";
import { generateGroundedAnswer } from "@/lib/rag/groundedGenerator";
import { processCopilotChat } from "@/lib/ai/geminiChatService";

const auditCreateMock = vi.fn<(args: any) => Promise<{ id: string }>>(async () => ({ id: "audit-a08-1" }));
const msgCreateMock = vi.fn<(args: any) => Promise<any>>(async (args: any) => ({
  id: "msg-a08-1",
  createdAt: new Date(),
  ...args.data,
}));

vi.mock("@/lib/database/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: vi.fn(async () => ({ id: "conv-a08" })),
      create: vi.fn(async () => ({ id: "conv-a08", title: "Audit Test" })),
      update: vi.fn(async () => ({ id: "conv-a08" })),
    },
    conversationMessage: {
      create: (args: any) => msgCreateMock(args),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
    persistenceAuditEvent: {
      create: (args: any) => auditCreateMock(args),
    },
  },
}));

describe("Task A08 — Knowledge Registry, Citation Verification & Audit Trail", () => {
  beforeEach(() => {
    resetDocumentRegistry();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDocumentRegistry();
  });

  it("1. Validates all curated sources: real HTTPS URLs, license, version, sourceSpan & SHA-256 content hashes", () => {
    expect(CURATED_KNOWLEDGE_SOURCES.length).toBeGreaterThanOrEqual(4);

    for (const source of CURATED_KNOWLEDGE_SOURCES) {
      const urlCheck = validateOfficialSourceUrl(source.officialUrl, { requireHttps: true });
      expect(urlCheck.valid).toBe(true);
      expect(source.license.trim().length).toBeGreaterThan(5);
      expect(source.version.trim().length).toBeGreaterThan(0);
      expect(source.publicationDate.trim().length).toBeGreaterThan(0);
      expect(source.approvalStatus).toBe("APPROVED");
      expect(source.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(isDocumentOutdated(source)).toBe(false);

      for (const passage of source.passages) {
        expect(passage.contentHash).toBe(computeHash(passage.passageText));
        expect(passage.startOffset).toBeDefined();
        expect(passage.endOffset).toBeDefined();
        expect((passage.endOffset ?? 0)).toBeGreaterThan(passage.startOffset ?? 0);
      }
    }
  });

  it("2. Rejects empty or fake URLs during ingestion and defaults newly ingested docs to PENDING", () => {
    expect(() =>
      ingestDocument({
        documentId: "DOC_EMPTY_URL",
        title: "Tài liệu không URL",
        publisher: "Tổ chức thử nghiệm",
        officialUrl: "",
        publicationDate: "2026",
        rawText: "# An toàn\nNội dung đủ dài để kiểm thử hệ thống nạp tài liệu.",
      })
    ).toThrow();

    expect(() =>
      ingestDocument({
        documentId: "DOC_FAKE_URL",
        title: "Tài liệu giả lập URL",
        publisher: "Tổ chức thử nghiệm",
        officialUrl: "https://example.com/fake-guideline.pdf",
        publicationDate: "2026",
        rawText: "# An toàn\nNội dung đủ dài để kiểm thử hệ thống nạp tài liệu.",
      })
    ).toThrow();

    const validIngested = ingestDocument({
      documentId: "DOC_VALID_PENDING",
      title: "Hướng dẫn lắp đặt tay vịn cầu thang an toàn",
      publisher: "Viện Nghiên cứu An toàn Sống",
      officialUrl: "https://www.cdc.gov/steadi/pdf/STEADI-Brochure-CheckForSafety-508.pdf",
      publicationDate: "2026",
      version: "1.2",
      license: "Public Domain",
      rawText: "# Tay vịn cầu thang\nCầu thang cần có tay vịn hai bên chắc chắn và bậc chống trượt.",
    });

    expect(validIngested.approvalStatus).toBe("PENDING");
    expect(validIngested.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(validIngested.chunks[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("3. Enforces approved-source gate across pending, approved, and rejected lifecycle", () => {
    registerDocumentForReview({
      id: "SRC_CUSTOM_RAMPS_2026",
      title: "Hướng dẫn dốc lên xuống cho xe lăn tại nhà",
      organization: "CDC Accessibility",
      publisher: "Centers for Disease Control and Prevention",
      url: "https://www.cdc.gov/ncbddd/disabilityandhealth/accessibility.html",
      officialUrl: "https://www.cdc.gov/ncbddd/disabilityandhealth/accessibility.html",
      publicationDate: "2026",
      retrievedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      language: "vi",
      license: "Public Domain",
      documentType: "STANDARD",
      version: "2026.1",
      ingestionStatus: "INDEXED",
      contentHash: computeHash("Độ dốc khuyến nghị tối đa 1:12 cho lối vào dùng xe lăn."),
      sourceStatus: "CURATED",
      passages: [
        {
          id: "RAMP_PASSAGE_01",
          section: "Độ dốc tiêu chuẩn lối vào xe lăn",
          passageText: "Độ dốc khuyến nghị tối đa 1:12 với bề mặt nhám chống trượt cho lối vào sử dụng xe lăn.",
          pageNumber: 4,
          startOffset: 0,
          endOffset: 90,
          contentHash: computeHash("Độ dốc khuyến nghị tối đa 1:12 với bề mặt nhám chống trượt cho lối vào sử dụng xe lăn."),
          keywords: ["xe lăn", "độ dốc", "chống trượt"],
          relatedRules: [],
        },
      ],
    });

    // Must NOT retrieve PENDING document
    const beforeApprove = retrieveEvidenceChunks("độ dốc lối vào xe lăn", { approvalOnly: true });
    expect(beforeApprove.some((c) => c.documentId === "SRC_CUSTOM_RAMPS_2026")).toBe(false);

    // Approve document -> now eligible for retrieval
    approveDocument("SRC_CUSTOM_RAMPS_2026", "clinical-board");
    const afterApprove = retrieveEvidenceChunks("độ dốc lối vào xe lăn", { approvalOnly: true });
    expect(afterApprove.some((c) => c.documentId === "SRC_CUSTOM_RAMPS_2026")).toBe(true);

    // Reject document -> immediately blocked again
    rejectDocument("SRC_CUSTOM_RAMPS_2026", "Hết hiệu lực bản nháp", "clinical-board");
    const afterReject = retrieveEvidenceChunks("độ dốc lối vào xe lăn", { approvalOnly: true });
    expect(afterReject.some((c) => c.documentId === "SRC_CUSTOM_RAMPS_2026")).toBe(false);
  });

  it("4. Failure mode — Knowledge-source removal returns explicit INSUFFICIENT_EVIDENCE abstention", async () => {
    for (const src of CURATED_KNOWLEDGE_SOURCES) {
      removeDocument(src.id);
    }

    const query = "Thảm trải sàn không cố định gây nguy hiểm như thế nào?";
    const chunks = retrieveEvidenceChunks(query, { topK: 4, approvalOnly: true });
    expect(chunks).toHaveLength(0);

    const evaluation = evaluateEvidenceSufficiency(query, "EXPLANATION_REQUEST", chunks);
    expect(evaluation.status).toBe("INSUFFICIENT_EVIDENCE");

    const generated = await generateGroundedAnswer({
      query,
      intent: "EXPLANATION_REQUEST",
      evaluation,
      retrievedChunks: chunks,
    });

    expect(generated.evidenceStatus).toBe("INSUFFICIENT_EVIDENCE");
    expect(generated.responseMode).toBe("REFUSAL_INSUFFICIENT");
    expect(generated.answer.toLowerCase()).toContain("chưa đủ bằng chứng");
    expect(generated.answer.toLowerCase()).toContain("kiểm tra thủ công");
    expect(generated.citations).toHaveLength(0);
  });

  it("5. Failure mode — Outdated documents are excluded from retrieval", () => {
    markDocumentOutdated("SRC_CDC_STEADI_2023", "2023-01-01T00:00:00.000Z");

    const chunks = retrieveEvidenceChunks("chiều rộng thông thủy lối đi 80 cm", {
      topK: 4,
      approvalOnly: true,
      maxAgeDays: 365,
    });
    expect(chunks.some((c) => c.documentId === "SRC_CDC_STEADI_2023")).toBe(false);

    // Also test future date beyond 365 days making all baseline docs stale
    const staleInFuture = retrieveEvidenceChunks("thảm trải sàn chống trượt", {
      topK: 4,
      approvalOnly: true,
      maxAgeDays: 365,
      now: new Date("2029-01-01T00:00:00.000Z"),
    });
    expect(staleInFuture).toHaveLength(0);
  });

  it("6. Failure mode — Out-of-corpus question triggers explicit 'chưa đủ bằng chứng' abstention", async () => {
    const query = "Cách ép xung card đồ họa RTX 5090 và tối ưu smart contract blockchain";
    const chunks = retrieveEvidenceChunks(query, { topK: 4, approvalOnly: true });
    const evaluation = evaluateEvidenceSufficiency(query, "GENERAL_SAFETY", chunks);
    expect(evaluation.status).toBe("INSUFFICIENT_EVIDENCE");

    const generated = await generateGroundedAnswer({
      query,
      intent: "GENERAL_SAFETY",
      evaluation,
      retrievedChunks: chunks,
    });

    expect(generated.responseMode).toBe("REFUSAL_INSUFFICIENT");
    expect(generated.answer.toLowerCase()).toContain("chưa đủ bằng chứng");
    expect(generated.citations).toHaveLength(0);
  });

  it("7. Detects retrieved mismatch and fake citation URLs inside verifyAndFormatCitations", () => {
    const [whoChunk] = retrieveEvidenceChunks("thảm trải sàn cố định mép", { topK: 1 });
    expect(whoChunk).toBeDefined();
    whoChunk.citationIndex = 1;

    const fakeUrlChunk = {
      ...whoChunk,
      chunkId: "FAKE_CHUNK_02",
      citationIndex: 2,
      officialUrl: "https://example.com/fabricated-doc",
    };

    const mismatchAnswer =
      "Thảm trải sàn cần cố định mép bằng băng dính chống trượt [1]. " +
      "Bệnh nhân cần chụp MRI cột sống và truyền dịch kháng sinh [1]. " +
      "Tham khảo thêm từ trang giả [2].";

    const verified = verifyAndFormatCitations(mismatchAnswer, [whoChunk, fakeUrlChunk]);

    expect(verified.mismatchCitationCount).toBe(1);
    expect(verified.invalidCitationCount).toBe(2);
    expect(verified.validCitationCount).toBe(1);
    expect(verified.sourceSupportMap.some((entry) => entry.supported === true)).toBe(true);
    expect(verified.sourceSupportMap.some((entry) => entry.supported === false)).toBe(true);
    expect(verified.citations).toHaveLength(1);
    expect(verified.citations[0].accessLink).toBe(whoChunk.officialUrl);
    expect(verified.citations[0].version).toBe(whoChunk.version);
    expect(verified.citations[0].contentHash).toBe(whoChunk.contentHash);
    expect(verified.citations[0].sourceSpan).toEqual({
      startOffset: whoChunk.startOffset,
      endOffset: whoChunk.endOffset,
    });
  });

  it("8. Separates document recommendations vs self-reported situation and logs document version audit trail", async () => {
    const chatRes = await processCopilotChat({
      message: "Phòng ngủ của tôi có những nguy cơ té ngã nào?",
      roomId: "room-bedroom-01",
    });

    expect(chatRes.answer).toContain("Khuyến nghị theo tài liệu đã thẩm định");
    expect(chatRes.answer).toContain("Kết luận theo tình huống tự khai / dữ liệu phòng");
    expect(chatRes.citations.length).toBeGreaterThan(0);
    expect(chatRes.sourceSupportMap?.every((e) => e.supported)).toBe(true);
    expect(chatRes.evidenceBreakdown?.documentRecommendations.length).toBeGreaterThan(0);
    expect(chatRes.evidenceBreakdown?.selfReportedSituationNotes.length).toBeGreaterThan(0);
    expect(chatRes.documentAuditTrail?.length).toBeGreaterThan(0);

    for (const audit of chatRes.documentAuditTrail ?? []) {
      expect(audit.documentId).toBeTruthy();
      expect(audit.version).toBeTruthy();
      expect(audit.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(audit.approvalStatus).toBe("APPROVED");
      expect(validateOfficialSourceUrl(audit.accessLink).valid).toBe(true);
    }

    // Verify saveAssistantMessage records document versions in PersistenceAuditEvent
    const { saveAssistantMessage } = await import("@/lib/ai/conversationManager");
    await saveAssistantMessage("conv-a08", {
      answer: chatRes.answer,
      evidenceStatus: chatRes.evidenceStatus as any,
      responseMode: chatRes.responseMode as any,
      citations: chatRes.citations,
      retrievedChunkIds: chatRes.citations.map((c) => c.chunkId),
      modelProvider: chatRes.modelProvider,
      modelName: chatRes.modelName,
      suggestedFollowUps: chatRes.suggestedFollowUps,
      warnings: chatRes.warnings || [],
      sourceSupportMap: chatRes.sourceSupportMap,
      documentAuditTrail: chatRes.documentAuditTrail,
      evidenceBreakdown: chatRes.evidenceBreakdown,
    });

    expect(auditCreateMock).toHaveBeenCalledTimes(1);
    const firstCall = auditCreateMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const auditPayload = firstCall![0];
    expect(auditPayload.data.resourceType).toBe("RAG_RESPONSE_AUDIT");
    expect(auditPayload.data.action).toBe("DOCUMENT_VERSIONS_EVALUATED");
    const parsedDetails = JSON.parse(auditPayload.data.details);
    expect(parsedDetails.documentsEvaluated.length).toBeGreaterThan(0);
    expect(parsedDetails.documentsEvaluated[0].version).toBeTruthy();
  });
});

