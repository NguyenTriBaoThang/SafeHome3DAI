import { NextRequest, NextResponse } from "next/server";
import { explainHazardFinding } from "@/lib/risk/explanationEngine";
import { RiskFinding } from "@/lib/risk/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { findingId: string } }
) {
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
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

