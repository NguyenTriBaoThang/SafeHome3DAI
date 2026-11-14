import { describe, it, expect } from "vitest";
import { analyzeUserQuery } from "../src/lib/rag/queryAnalysis";
import { retrieveEvidenceChunks } from "../src/lib/rag/retrieval";
import { evaluateEvidenceSufficiency } from "../src/lib/rag/evidenceSufficiency";
import { generateGroundedAnswer } from "../src/lib/rag/groundedGenerator";
import { ingestDocument } from "../src/lib/rag/ingestion";

describe("SafeHome Copilot — Integration Tests", () => {
  it("Scenario 1: End-to-end Supported Question with verifiable citations", async () => {
    const query = "Trong phòng ngủ của người cao tuổi, tôi cần kiểm tra những gì?";
    const analysis = analyzeUserQuery(query);
    const chunks = retrieveEvidenceChunks(analysis.rewrittenQuery, { topK: 3 });
    const evaluation = evaluateEvidenceSufficiency(analysis.rewrittenQuery, analysis.intent, chunks);

    const generation = await generateGroundedAnswer({
      query,
      rewrittenQuery: analysis.rewrittenQuery,
      intent: analysis.intent,
      evaluation,
      retrievedChunks: chunks,
    });

    expect(generation.evidenceStatus).toBe("SUPPORTED");
    expect(generation.responseMode).toBe("LOCAL_GROUNDED");
    expect(generation.citations.length).toBeGreaterThan(0);
    expect(generation.answer).toContain("[1]");
    expect(generation.suggestedFollowUps.length).toBeGreaterThan(0);
  });

  it("Scenario 2: Emergency escalation when user reports acute trauma", async () => {
    const emergencyQuery = "Ông tôi vừa ngã bất tỉnh và đang chảy máu nhiều, tôi phải làm sao?";
    const analysis = analyzeUserQuery(emergencyQuery);
    expect(analysis.isEmergency).toBe(true);

    const chunks = retrieveEvidenceChunks(analysis.rewrittenQuery);
    const evaluation = evaluateEvidenceSufficiency(analysis.rewrittenQuery, analysis.intent, chunks);

    const generation = await generateGroundedAnswer({
      query: emergencyQuery,
      intent: analysis.intent,
      evaluation,
      retrievedChunks: chunks,
    });

    expect(generation.evidenceStatus).toBe("EMERGENCY");
    expect(generation.responseMode).toBe("EMERGENCY_ESCALATION");
    expect(generation.answer).toContain("115");
    expect(generation.answer).toContain("KHẨN CẤP");
  });

  it("Scenario 3: Out-of-scope medical question safely refused", async () => {
    const medicalQuery = "Bà tôi bị đau lưng sau khi ngã, nên uống thuốc gì?";
    const analysis = analyzeUserQuery(medicalQuery);
    expect(analysis.isOutOfScope).toBe(true);

    const chunks = retrieveEvidenceChunks(analysis.rewrittenQuery);
    const evaluation = evaluateEvidenceSufficiency(analysis.rewrittenQuery, analysis.intent, chunks);

    const generation = await generateGroundedAnswer({
      query: medicalQuery,
      intent: analysis.intent,
      evaluation,
      retrievedChunks: chunks,
    });

    expect(generation.evidenceStatus).toBe("OUT_OF_SCOPE");
    expect(generation.responseMode).toBe("REFUSAL_INSUFFICIENT");
    expect(generation.answer).toContain("không có thẩm quyền chẩn đoán");
    expect(generation.answer).toContain("bác sĩ");
  });

  it("Scenario 4: Ingest new document and verify searchability", () => {
    const docInput = {
      documentId: "TEST_INGEST_01",
      title: "Tiêu chuẩn tay vịn hành lang nhà ở dưỡng lão",
      publisher: "Viện Kiến trúc Y tế",
      officialUrl: "https://example.com/tay-vin",
      publicationDate: "2024",
      rawText: `# Quy cách tay vịn
Tay vịn hành lang cần có đường kính từ 32mm đến 38mm để người già dễ cầm nắm.
Khoảng hở giữa tay vịn và mặt tường tối thiểu là 40mm.`,
    };

    const ingested = ingestDocument(docInput);
    expect(ingested.documentId).toBe("TEST_INGEST_01");
    expect(ingested.chunks.length).toBe(1);
    expect(ingested.chunks[0].chunkText).toContain("32mm");
  });
});

