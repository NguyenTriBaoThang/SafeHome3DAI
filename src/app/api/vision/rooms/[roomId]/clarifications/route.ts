import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

async function GETHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ roomId: string }> }
) {
  const params = await routeParams;
  try {
    const { roomId } = params;
    const questions = await prisma.visionClarification.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
    });

    const mapped = questions.map((q) => ({
      id: q.id,
      roomId: q.roomId,
      observationId: q.observationId,
      surveyQuestionId: q.surveyQuestionId,
      questionText: q.questionText,
      options: JSON.parse(q.optionsJson || "[]"),
      status: q.status,
      userResponse: q.userResponse,
      createdAt: q.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
