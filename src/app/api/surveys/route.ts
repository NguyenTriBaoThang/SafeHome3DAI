import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHomeSurvey, getSurveys } from "@/lib/survey/surveyManager";

const CreateSurveySchema = z.object({
  name: z.string().optional(),
  targetResident: z.string().optional(),
  roomTypes: z.array(z.string()).optional(),
  consentGiven: z.boolean().optional(),
  generalNotes: z.string().optional(),
});

async function GETHandler() {
  try {
    const surveys = await getSurveys();
    return NextResponse.json({
      success: true,
      surveys,
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách khảo sát:", error);
    return NextResponse.json(
      { error: "Không thể lấy danh sách khảo sát", details: error.message },
      { status: 500 }
    );
  }
}

async function POSTHandler(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = CreateSurveySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const survey = await createHomeSurvey(parseResult.data);

    return NextResponse.json({
      success: true,
      survey,
    });
  } catch (error: any) {
    console.error("Lỗi tạo khảo sát mới:", error);
    return NextResponse.json(
      { error: "Không thể tạo khảo sát", details: error.message },
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
