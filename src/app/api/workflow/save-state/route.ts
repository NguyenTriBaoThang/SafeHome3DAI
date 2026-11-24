import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";

// The legacy seven-step page is an interactive demo. Its presets must never be
// written as a family's measured survey. Real collection uses /api/surveys.
async function POSTHandler() {
  return NextResponse.json({ success: false, code: "DEMO_WORKFLOW",
    error: "Quy trình này dùng dữ liệu mẫu. Hãy mở Khảo sát thực tế để lưu hồ sơ gia đình.",
    surveyUrl: "/ai-guided-survey" }, { status: 410 });
}
export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
