import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { getSurveyById, deleteSurvey } from "@/lib/survey/surveyManager";

async function GETHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
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

async function DELETEHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
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


export const GET = withAccount(GETHandler);
export const DELETE = withAccount(DELETEHandler);
export const dynamic = "force-dynamic";
