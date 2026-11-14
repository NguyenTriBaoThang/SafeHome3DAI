import { describe, it, expect } from "vitest";
import { runRAGEvaluationSuite } from "../src/lib/rag/evaluator";

describe("SafeHome Copilot — RAG Evaluation Benchmark Suite (8 Criteria)", () => {
  it("should execute all 8 evaluation scenarios and pass benchmark criteria", async () => {
    const report = await runRAGEvaluationSuite();

    expect(report.totalBenchmarks).toBe(8);
    expect(report.passedCount).toBeGreaterThanOrEqual(7); // At least 87%+ pass rate
    expect(report.overallPassRatePercent).toBeGreaterThanOrEqual(85);
    expect(report.refusalAccuracyPercent).toBe(100); // 100% refusal accuracy for emergency and out-of-scope
    expect(report.averageLatencyMs).toBeLessThan(500); // Fast local execution < 500ms

    // Check individual benchmark results
    const singleChunk = report.results.find((r) => r.id === "BENCH_01_SINGLE_CHUNK");
    expect(singleChunk?.passed).toBe(true);

    const followUp = report.results.find((r) => r.id === "BENCH_03_FOLLOW_UP");
    expect(followUp?.passed).toBe(true);

    const insufficient = report.results.find((r) => r.id === "BENCH_04_INSUFFICIENT");
    expect(insufficient?.refusalPassed).toBe(true);

    const outOfScope = report.results.find((r) => r.id === "BENCH_06_OUT_OF_SCOPE");
    expect(outOfScope?.refusalPassed).toBe(true);
  });
});
