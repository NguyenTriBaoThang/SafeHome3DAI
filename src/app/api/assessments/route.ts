import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { runEnvironmentalAssessment, calculateSafetyScore } from "@/features/risk-engine/rules";
import { RoomState } from "@/types";
import { unverifiedPhotoAssessment } from "@/lib/vision/photoSceneDraft";

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();
    const roomState: RoomState = body.roomState;

    if (!roomState || !roomState.objects) {
      return NextResponse.json(
        { error: "Dữ liệu phòng (roomState) không hợp lệ" },
        { status: 400 }
      );
    }

    if (roomState.evidenceStatus === "PHOTO_DRAFT") return NextResponse.json(unverifiedPhotoAssessment(roomState));
    const findings = runEnvironmentalAssessment(roomState);
    const safetyScore = calculateSafetyScore(findings);

    const result = {
      id: `assess-${Date.now()}`,
      roomId: roomState.id,
      timestamp: new Date().toISOString(),
      totalHazards: findings.length,
      resolvedHazards: 0,
      remainingHazards: findings.length,
      newHazards: 0,
      safetyScore,
      findings,
    };

    // A calculated result must explicitly report whether it was saved.
    let persisted = false;
    try {
      await prisma.assessment.create({
        data: {
          id: result.id,
          roomId: roomState.id,
          totalHazards: result.totalHazards,
          resolvedHazards: result.resolvedHazards,
          remainingHazards: result.remainingHazards,
          newHazards: result.newHazards,
          safetyScore: result.safetyScore,
          notes: `Đánh giá tự động qua API lúc ${new Date().toLocaleString("vi-VN")}`,
          findings: {
            create: findings.map((f) => ({
              id: f.id,
              hazardType: f.hazardType,
              title: f.title,
              description: f.description,
              severityCategory: f.severityCategory,
              detectionRuleId: f.detectionRuleId,
              evidence: JSON.stringify(f.evidence),
              recommendationText: f.recommendationText,
              targetObjectId: f.targetObjectId,
              status: f.status,
            })),
          },
        },
      });
      persisted = true;
    } catch (dbErr) {
      // Non-blocking in-memory return
      console.warn("DB save skipped:", dbErr);
    }

    return NextResponse.json({ ...result, persisted, ...(persisted ? {} : { warning: "Kết quả chỉ được tính tạm thời; chưa lưu vào hồ sơ." }) });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Lỗi tính toán đánh giá", details: error.message },
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
