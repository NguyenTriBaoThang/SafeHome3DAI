import { NextResponse } from "next/server";
import { getSurveyById, deleteSurvey } from "@/lib/survey/surveyManager";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const survey = await getSurveyById(params.id);
    if (!survey) {
      return NextResponse.json(
        { error: "Không tìm thấy hồ sơ khảo sát" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      survey,
    });
  } catch (error: any) {
    console.error("Lỗi lấy thông tin khảo sát:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải khảo sát", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteSurvey(params.id);
    return NextResponse.json({
      success: true,
      message: "Đã xóa khảo sát thành công",
    });
  } catch (error: any) {
    console.error("Lỗi xóa khảo sát:", error);
    return NextResponse.json(
      { error: "Không thể xóa khảo sát", details: error.message },
      { status: 500 }
    );
  }
}

