import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { z } from "zod";
import { addRoomToSurvey } from "@/lib/survey/surveyManager";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

const AddRoomSchema = z.object({
  roomType: z.enum(["BEDROOM", "BATHROOM", "LIVING_ROOM", "KITCHEN"]),
  name: z.string().optional(),
});

async function POSTHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const body = await request.json();
    const parseResult = AddRoomSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu phòng không hợp lệ", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const room = await addRoomToSurvey(
      params.id,
      parseResult.data.roomType,
      parseResult.data.name
    );

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error: any) {
    console.error("Lỗi thêm phòng vào khảo sát:", error);
    return NextResponse.json(
      buildSafeErrorPayload(error, "Không thể thêm phòng", "SURVEYS_ROOMS_ERROR"),
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
