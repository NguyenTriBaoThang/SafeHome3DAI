import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { INITIAL_ROOMS } from "@/data/mockRooms";
import { runEnvironmentalAssessment, calculateSafetyScore } from "@/features/risk-engine/rules";
import { createSimulation, createSimulationSchema, restoreSimulation, snapshotInclude } from "@/lib/simulations/persistence";

async function GETHandler() {
  try {
    const rooms = await prisma.room.findMany({ include: { ...snapshotInclude, home: { include: { project: true } },
      assessments: { orderBy: { assessmentDate: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } });
    const custom = rooms.filter(r => !INITIAL_ROOMS.some(t => t.id === r.id)).map(r => {
      const state = restoreSimulation(r), latest = r.assessments[0];
      return { id: r.id, name: r.name, roomType: r.roomType, dimensions: state.dimensions,
        evidenceStatus: state.evidenceStatus, projectName: r.home.project.name, targetResident: r.home.targetResidentProfile,
        objectsCount: state.objects.length, safetyScore: state.evidenceStatus === "PHOTO_DRAFT" ? null : latest?.safetyScore ?? null,
        hazardsResolved: latest?.resolvedHazards ?? 0, hazardsRemaining: latest?.remainingHazards ?? null,
        totalHazards: latest?.totalHazards ?? null, updatedAt: r.updatedAt.toISOString(), isCustom: true };
    });
    const templates = INITIAL_ROOMS.map(r => {
      const findings = runEnvironmentalAssessment(r);
      return { id: r.id, name: r.name, roomType: r.roomType, dimensions: r.dimensions,
        projectName: "Dữ liệu mẫu để mô phỏng", targetResident: null, objectsCount: r.objects.length,
        safetyScore: calculateSafetyScore(findings), hazardsResolved: 0, hazardsRemaining: findings.length,
        totalHazards: findings.length, updatedAt: null, isCustom: false };
    });
    return NextResponse.json({ success: true, data: [...templates, ...custom] });
  } catch {
    return NextResponse.json({ success: false, error: "Không tải được kho mô phỏng. Hãy thử lại." }, { status: 503 });
  }
}
async function POSTHandler(request: Request) {
  const data = createSimulationSchema.safeParse(await request.json().catch(() => null));
  if (!data.success || data.data.roomState && data.data.roomState.roomType !== data.data.roomType)
    return NextResponse.json({ success: false, error: "Bản dựng không hợp lệ. Ảnh phải được lưu qua luồng ảnh riêng tư." }, { status: 400 });
  try {
    const state = await createSimulation(data.data);
    return NextResponse.json({ success: true, data: state }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Không thể lưu phòng. Chưa có thay đổi nào được lưu." }, { status: 503 });
  }
}
export const GET = withAccount(GETHandler);
export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
