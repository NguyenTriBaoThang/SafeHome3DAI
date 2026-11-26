import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateRoomHazardsCanonical } from "@/lib/risk/canonicalEngine";
import {
  buildDecisionGraphFromTraces,
  buildDecisionTracesFromCanonical,
  createLooseRugEmpiricalTrace,
  DECISION_TRACE_VERSION,
} from "@/lib/risk/decisionTrace";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

const TraceabilityRequestSchema = z.object({
  roomInput: z.record(z.string(), z.any()),
  snapshotId: z
    .string()
    .regex(/^snap-[a-zA-Z0-9_-]+$/)
    .optional(),
  objectNamesById: z.record(z.string(), z.string()).optional(),
  provenanceMap: z.record(z.string(), z.any()).optional(),
  deterministicTimestamp: z.string().optional(),
  format: z.enum(["json", "export"]).optional().default("json"),
});

async function GETHandler(req: NextRequest) {
  try {
    const sample = req.nextUrl.searchParams.get("sample") || "loose-rug";
    if (sample === "loose-rug") {
      const bundle = createLooseRugEmpiricalTrace();
      return NextResponse.json({
        success: true,
        explainabilityType: "RULE_BASED_PROVENANCE",
        data: bundle,
      });
    }

    return NextResponse.json(
      { success: false, error: `Mẫu traceability không được hỗ trợ: ${sample}` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi truy xuất decision trace", "RISKASSESSMENT_TRACEABILITY_ERROR"),
      { status: 500 }
    );
  }
}

async function POSTHandler(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = TraceabilityRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dữ liệu yêu cầu decision traceability không hợp lệ.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      roomInput,
      snapshotId,
      objectNamesById,
      provenanceMap,
      deterministicTimestamp,
      format,
    } = parsed.data;

    const canonical = evaluateRoomHazardsCanonical(roomInput, {
      provenanceMap: provenanceMap as any,
      deterministicTimestamp,
    });
    const resolvedSnapshotId =
      snapshotId || `snap-${canonical.assessmentId.replace(/^asmt-/, "")}`;

    const traces = buildDecisionTracesFromCanonical(canonical, {
      snapshotId: resolvedSnapshotId,
      objectNamesById,
    });
    const roomName =
      typeof roomInput.roomName === "string" && roomInput.roomName.trim()
        ? roomInput.roomName.trim()
        : canonical.roomId;
    const graph = buildDecisionGraphFromTraces(
      canonical.roomId,
      roomName,
      resolvedSnapshotId,
      traces
    );

    const payload = {
      success: true,
      traceVersion: DECISION_TRACE_VERSION,
      explainabilityType: "RULE_BASED_PROVENANCE" as const,
      explainabilityNotice:
        "Rule-based explainability / decision provenance từ động cơ quy tắc xác định (không phải lời giải thích nội tại của Gemini).",
      snapshotId: resolvedSnapshotId,
      assessmentId: canonical.assessmentId,
      traces,
      graph,
      exportedAt: new Date().toISOString(),
    };

    if (format === "export") {
      return new NextResponse(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="decision-trace-${resolvedSnapshotId}.json"`,
        },
      });
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi xử lý decision traceability", "RISKASSESSMENT_TRACEABILITY_ERROR"),
      { status: 500 }
    );
  }
}

export const GET = withAccount(GETHandler);
export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";

