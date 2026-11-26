import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { explainHazardFinding } from "@/lib/risk/explanationEngine";
import { RiskFinding } from "@/lib/risk/types";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function POSTHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ findingId: string }> }
) {
  const params = await routeParams;
  try {
    const body = await req.json();
    const finding: RiskFinding = body.finding;

    if (!finding || !finding.ruleId) {
      return NextResponse.json(
        { success: false, error: "Thiếu dữ liệu mối nguy (finding) để giải thích." },
        { status: 400 }
      );
    }

    const explanation = explainHazardFinding(finding);
    return NextResponse.json({ success: true, data: explanation });
  } catch (error: any) {
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi hệ thống", "RISKASSESSMENT_FINDINGS_EXPLAIN_ERROR"),
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
