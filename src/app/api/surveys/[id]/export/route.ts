import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { exportSurveyData } from "@/lib/survey/surveyManager";

async function GETHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const data = await exportSurveyData(params.id);
    return NextResponse.json({
      success: true,
      export: data,
    });
  } catch (error: any) {
    console.error("Lỗi xuất dữ liệu khảo sát:", error);
    return NextResponse.json(
      { error: "Không thể xuất dữ liệu", details: error.message },
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
