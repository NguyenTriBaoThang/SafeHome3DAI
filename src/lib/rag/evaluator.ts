import { RAG_EVALUATION_BENCHMARK, EvaluationBenchmarkItem } from "@/data/ragEvaluationDataset";
import { analyzeUserQuery } from "./queryAnalysis";
import { retrieveEvidenceChunks } from "./retrieval";
import { evaluateEvidenceSufficiency } from "./evidenceSufficiency";
import { generateGroundedAnswer } from "./groundedGenerator";

export interface EvaluationItemResult {
  id: string;
  category: string;
  query: string;
  passed: boolean;
  intentPassed: boolean;
  statusPassed: boolean;
  refusalPassed: boolean;
  citationsCount: number;
  latencyMs: number;
  details: string;
}

export interface FullEvaluationReport {
  timestamp: string;
  totalBenchmarks: number;
  passedCount: number;
  overallPassRatePercent: number;
  retrievalRecallAtK: number;
  refusalAccuracyPercent: number;
  averageLatencyMs: number;
  results: EvaluationItemResult[];
}

/**
 * Execute the full RAG benchmark suite and produce a verifiable evaluation report.
 */
export async function runRAGEvaluationSuite(): Promise<FullEvaluationReport> {
  const results: EvaluationItemResult[] = [];
  let totalLatency = 0;
  let correctRefusals = 0;
  let expectedRefusals = 0;
  let correctRetrievalHits = 0;
  let totalRetrievalExpected = 0;

  for (const item of RAG_EVALUATION_BENCHMARK) {
    const startTime = Date.now();

    // Setup simulated conversation history for follow-ups
    const history = (item.followUpContext || []).map((content) => ({
      role: "user" as const,
      content,
    }));

    // 1. Query Analysis
    const analysis = analyzeUserQuery(item.query, history);

    // 2. Retrieval
    const chunks = retrieveEvidenceChunks(analysis.rewrittenQuery, {
      topK: 4,
      minScoreThreshold: 1.0,
      approvalOnly: true,
    });

    // 3. Sufficiency Evaluation
    const evaluation = evaluateEvidenceSufficiency(
      analysis.rewrittenQuery,
      analysis.intent,
      chunks
    );

    // 4. Grounded Generation
    const generation = await generateGroundedAnswer({
      query: item.query,
      rewrittenQuery: analysis.rewrittenQuery,
      intent: analysis.intent,
      evaluation,
      retrievedChunks: chunks,
    });

    const latencyMs = Date.now() - startTime;
    totalLatency += latencyMs;

    // Check pass criteria
    const intentPassed = Boolean(
      analysis.intent === item.expectedIntent ||
      (item.expectedMustRefuse && (analysis.isOutOfScope || analysis.intent === "OUT_OF_SCOPE_MEDICAL"))
    );

    const statusPassed = Boolean(
      evaluation.status === item.expectedStatus ||
      (item.expectedMustRefuse && evaluation.status !== "SUPPORTED") ||
      (!item.expectedMustRefuse && (evaluation.status === "SUPPORTED" || evaluation.status === "PARTIALLY_SUPPORTED"))
    );

    const refusalPassed = Boolean(
      item.expectedMustRefuse
        ? generation.responseMode === "REFUSAL_INSUFFICIENT" ||
          generation.evidenceStatus === "OUT_OF_SCOPE" ||
          generation.evidenceStatus === "INSUFFICIENT_EVIDENCE" ||
          generation.evidenceStatus === "EMERGENCY"
        : generation.evidenceStatus === "SUPPORTED" || generation.evidenceStatus === "PARTIALLY_SUPPORTED"
    );

    if (item.expectedMustRefuse) {
      expectedRefusals++;
      if (refusalPassed) correctRefusals++;
    }

    if (item.expectedSourceIds && item.expectedSourceIds.length > 0) {
      totalRetrievalExpected++;
      const retrievedDocIds = chunks.map((c) => c.documentId);
      const hit = item.expectedSourceIds.some((expectedId) =>
        retrievedDocIds.includes(expectedId)
      );
      if (hit) correctRetrievalHits++;
    }

    const itemPassed = Boolean(intentPassed && statusPassed && refusalPassed);

    results.push({
      id: item.id,
      category: item.category,
      query: item.query,
      passed: itemPassed,
      intentPassed,
      statusPassed,
      refusalPassed,
      citationsCount: generation.citations.length,
      latencyMs,
      details: `Intent: ${analysis.intent} | Status: ${evaluation.status} | Mode: ${generation.responseMode}`,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const overallPassRatePercent = Math.round((passedCount / results.length) * 100);
  const refusalAccuracyPercent =
    expectedRefusals > 0 ? Math.round((correctRefusals / expectedRefusals) * 100) : 100;
  const retrievalRecallAtK =
    totalRetrievalExpected > 0
      ? Math.round((correctRetrievalHits / totalRetrievalExpected) * 100) / 100
      : 1.0;
  const averageLatencyMs = Math.round(totalLatency / results.length);

  return {
    timestamp: new Date().toISOString(),
    totalBenchmarks: results.length,
    passedCount,
    overallPassRatePercent,
    retrievalRecallAtK,
    refusalAccuracyPercent,
    averageLatencyMs,
    results,
  };
}
