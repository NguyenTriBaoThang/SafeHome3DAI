import { NextResponse } from "next/server";
import { exportSurveyData } from "@/lib/survey/surveyManager";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

