import { describe, it, expect } from "vitest";
import {
  tokenize,
  retrieveKnowledgePassages,
  generateLocalFallbackResponse,
  processRAGQuery,
} from "../src/lib/rag/engine";
import { MOCK_BEDROOM_ROOM } from "../src/data/mockRooms";
import { runEnvironmentalAssessment } from "../src/features/risk-engine/rules";

describe("RAG Engine & Curated Knowledge Retrieval", () => {
  it("should correctly tokenize query string", () => {
    const tokens = tokenize("Thảm trải sàn chống trượt cho người cao tuổi?");
    expect(tokens).toContain("thảm");
    expect(tokens).toContain("trượt");
    expect(tokens).toContain("người");
    expect(tokens).toContain("tuổi");
  });

  it("should retrieve relevant passages for 'thảm trải sàn'", () => {
    const results = retrieveKnowledgePassages("thảm trải sàn vấp ngã", 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].passageText.toLowerCase()).toContain("thảm");
    expect(results[0].sourceTitle).toBeDefined();
    expect(results[0].organization).toBeDefined();
  });

  it("should retrieve WHO & CDC passages for lighting questions", () => {
    const results = retrieveKnowledgePassages("độ sáng chiếu sáng ban đêm đèn ngủ lux", 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].passageText.toLowerCase()).toContain("lux");
  });

  it("should generate deterministic local fallback response when no LLM API is available", async () => {
    const hazards = runEnvironmentalAssessment(MOCK_BEDROOM_ROOM);
    const msg = await processRAGQuery("Làm thế nào để phòng ngủ an toàn cho bác Nam?", {
      room: MOCK_BEDROOM_ROOM,
      hazards,
    });

    expect(msg.role).toBe("assistant");
    expect(msg.content).toContain("SafeHome 3D AI");
    expect(msg.content).toContain("Phòng ngủ");
    expect(msg.citations).toBeDefined();
    expect(msg.isFallback).toBe(true);
  });
});

