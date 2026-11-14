import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { z } from "zod";

const SaveWorkflowStateSchema = z.object({
  projectId: z.string().optional(),
  surveyId: z.string().optional(),
  projectName: z.string(),
  residentInfo: z.string(),
  roomType: z.string(),
  currentStep: z.number(),
  workflowStatus: z.string(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  checklist: z.record(z.any()),
  sceneObjects: z.array(z.any()),
  assessmentResult: z.any().optional(),
  comparisonResult: z.any().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = SaveWorkflowStateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu trạng thái quy trình không hợp lệ", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // 1. Upsert Project
    let project;
    if (data.projectId) {
      project = await prisma.project.upsert({
        where: { id: data.projectId },
        create: {
          id: data.projectId,
          name: data.projectName,
          description: data.residentInfo,
        },
        update: {
          name: data.projectName,
          description: data.residentInfo,
        },
      });
    } else {
      project = await prisma.project.create({
        data: {
          name: data.projectName,
          description: data.residentInfo,
        },
      });
    }

    // 2. Ensure Home and Room exist
    let home = await prisma.home.findFirst({
      where: { projectId: project.id },
    });

    if (!home) {
      home = await prisma.home.create({
        data: {
          projectId: project.id,
          name: "Không gian sống khảo sát",
          targetResidentProfile: data.residentInfo,
        },
      });
    }

    let room = await prisma.room.findFirst({
      where: { homeId: home.id },
    });

    if (!room) {
      room = await prisma.room.create({
        data: {
          homeId: home.id,
          name: data.roomType === "BEDROOM" ? "Phòng ngủ người cao tuổi" : "Nhà vệ sinh an toàn",
          roomType: data.roomType,
          width: data.dimensions.width,
          length: data.dimensions.length,
          height: data.dimensions.height,
        },
      });
    } else {
      room = await prisma.room.update({
        where: { id: room.id },
        data: {
          width: data.dimensions.width,
          length: data.dimensions.length,
          height: data.dimensions.height,
        },
      });
    }

    // 3. Upsert Scene Objects
    if (data.sceneObjects && data.sceneObjects.length > 0) {
      // Clear existing objects for this room to avoid duplicates
      await prisma.sceneObject.deleteMany({
        where: { roomId: room.id },
      });

      for (const obj of data.sceneObjects) {
        await prisma.sceneObject.create({
          data: {
            id: obj.id,
            roomId: room.id,
            name: obj.name,
            category: obj.category || "FURNITURE",
            modelType: obj.modelType || "chair",
            positionX: obj.position ? obj.position[0] : 0,
            positionY: obj.position ? obj.position[1] : 0,
            positionZ: obj.position ? obj.position[2] : 0,
            rotationY: obj.rotation ? obj.rotation[1] : 0,
            width: obj.dimensions?.width || 1.0,
            length: obj.dimensions?.length || 1.0,
            height: obj.dimensions?.height || 1.0,
            isWalkwayObstacle: Boolean(obj.isWalkwayObstacle),
            isFixed: Boolean(obj.isFixed),
            isLoose: Boolean(obj.isLoose),
            isSlippery: Boolean(obj.isSlippery),
          },
        });
      }
    }

    // 4. Save HomeSurvey record for audit trail & survey engine compatibility
    let surveyId = data.surveyId;
    if (surveyId) {
      await prisma.homeSurvey.upsert({
        where: { id: surveyId },
        create: {
          id: surveyId,
          name: data.projectName,
          targetResident: data.residentInfo,
          status: data.workflowStatus,
        },
        update: {
          name: data.projectName,
          targetResident: data.residentInfo,
          status: data.workflowStatus,
        },
      });
    } else {
      const newSurvey = await prisma.homeSurvey.create({
        data: {
          name: data.projectName,
          targetResident: data.residentInfo,
          status: data.workflowStatus,
        },
      });
      surveyId = newSurvey.id;
    }

    // Record audit event
    await prisma.surveyAuditEvent.create({
      data: {
        surveyId,
        eventType: "WORKFLOW_STATE_SAVED",
        changedFields: JSON.stringify({
          currentStep: data.currentStep,
          status: data.workflowStatus,
          objectsCount: data.sceneObjects.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        homeId: home.id,
        roomId: room.id,
        surveyId,
        savedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Lỗi lưu trạng thái workflow:", error);
    return NextResponse.json(
      { error: "Không thể lưu trạng thái quy trình", details: error.message },
      { status: 500 }
    );
  }
}

