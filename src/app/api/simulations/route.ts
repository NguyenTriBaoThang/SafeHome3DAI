import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { z } from "zod";
import { INITIAL_ROOMS } from "@/data/mockRooms";

const CreateRoomSchema = z.object({
  name: z.string().min(2),
  roomType: z.enum(["BEDROOM", "BATHROOM", "LIVING_ROOM"]),
  projectName: z.string().optional(),
  targetResident: z.string().optional(),
  width: z.number().default(4.0),
  length: z.number().default(5.0),
  height: z.number().default(2.8),
  lightingLevel: z.number().default(150),
  objects: z.array(z.any()).optional(),
  photoUrl: z.string().optional(),
});

export async function GET() {
  try {
    const dbRooms = await prisma.room.findMany({
      include: {
        home: {
          include: {
            project: true,
          },
        },
        sceneObjects: true,
        assessments: {
          include: {
            findings: true,
          },
          orderBy: {
            assessmentDate: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Map database rooms into standard simulation card payload
    const formattedRooms = dbRooms.map((r) => {
      const latestAssessment = r.assessments[0];
      const findings = latestAssessment?.findings || [];
      const resolvedCount = findings.filter((f) => f.status === "RESOLVED").length;
      const activeCount = findings.filter((f) => f.status === "ACTIVE").length;

      return {
        id: r.id,
        name: r.name,
        roomType: r.roomType,
        dimensions: {
          width: r.width,
          length: r.length,
          height: r.height,
        },
        projectName: r.home?.project?.name || "Khảo sát không gian sống",
        targetResident: r.home?.targetResidentProfile || "Bác Nam (75 tuổi)",
        objectsCount: r.sceneObjects.length,
        lightingLevel: r.lightingLevel,
        isWet: r.isWet,
        isSlipResistant: r.isSlipResistant,
        safetyScore: latestAssessment?.safetyScore || (r.roomType === "BEDROOM" ? 72 : 65),
        hazardsResolved: resolvedCount,
        hazardsRemaining: activeCount,
        totalHazards: findings.length,
        updatedAt: r.updatedAt.toISOString(),
        isCustom: true,
      };
    });

    // If DB is empty, map initial mock rooms so the gallery is never empty
    if (formattedRooms.length === 0) {
      const initialFormatted = INITIAL_ROOMS.map((r, idx) => ({
        id: r.id,
        name: r.name,
        roomType: r.roomType,
        dimensions: r.dimensions,
        projectName: "Dự án mẫu - Căn hộ 502",
        targetResident: "Bác Nam (75 tuổi, giảm thị lực)",
        objectsCount: r.objects.length,
        lightingLevel: r.lightingLevel,
        isWet: r.isWet,
        isSlipResistant: r.isSlipResistant,
        safetyScore: idx === 0 ? 38 : idx === 1 ? 45 : 60,
        hazardsResolved: 1,
        hazardsRemaining: idx === 0 ? 3 : 2,
        totalHazards: idx === 0 ? 4 : 3,
        updatedAt: new Date().toISOString(),
        isCustom: false,
      }));
      return NextResponse.json({ success: true, data: initialFormatted });
    }

    return NextResponse.json({ success: true, data: formattedRooms });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách phòng 3D:", error);
    // Fallback to in-memory initial rooms
    const fallbackRooms = INITIAL_ROOMS.map((r, idx) => ({
      id: r.id,
      name: r.name,
      roomType: r.roomType,
      dimensions: r.dimensions,
      projectName: "Dự án mẫu - Căn hộ 502",
      targetResident: "Bác Nam (75 tuổi)",
      objectsCount: r.objects.length,
      lightingLevel: r.lightingLevel,
      isWet: r.isWet,
      isSlipResistant: r.isSlipResistant,
      safetyScore: idx === 0 ? 38 : 45,
      hazardsResolved: 0,
      hazardsRemaining: 3,
      totalHazards: 3,
      updatedAt: new Date().toISOString(),
      isCustom: false,
    }));
    return NextResponse.json({ success: true, data: fallbackRooms });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = CreateRoomSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // 1. Find or create default project
    let project = await prisma.project.findFirst({
      where: { name: data.projectName || "Dự án SafeHome 3D" },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          name: data.projectName || "Dự án SafeHome 3D",
          description: data.targetResident || "Người cao tuổi",
        },
      });
    }

    // 2. Find or create Home
    let home = await prisma.home.findFirst({
      where: { projectId: project.id },
    });

    if (!home) {
      home = await prisma.home.create({
        data: {
          projectId: project.id,
          name: "Không gian sống",
          targetResidentProfile: data.targetResident || "Bác Nam (75 tuổi)",
        },
      });
    }

    // 3. Create Room
    const room = await prisma.room.create({
      data: {
        homeId: home.id,
        name: data.name,
        roomType: data.roomType,
        width: data.width,
        length: data.length,
        height: data.height,
        lightingLevel: data.lightingLevel,
      },
    });

    // 3.1. Create RoomImage if photoUrl provided
    if (data.photoUrl) {
      try {
        await prisma.roomImage.create({
          data: {
            roomId: room.id,
            storageKey: data.photoUrl,
            imageWidth: 1280,
            imageHeight: 720,
            caption: `Ảnh chụp không gian ${data.name}`,
            viewpoint: "ENTRANCE",
          },
        });
      } catch (imgErr) {
        console.warn("Lưu RoomImage thất bại:", imgErr);
      }
    }

    // 4. Create default scene objects according to room type
    const initialObjects = data.objects && data.objects.length > 0 ? data.objects : (
      data.roomType === "BEDROOM" ? [
        { name: "Giường ngủ", modelType: "bed", category: "FURNITURE", posX: 0, posY: 0.4, posZ: -1.2, w: 1.8, l: 2.0, h: 0.8 },
        { name: "Tab đầu giường", modelType: "nightstand", category: "FURNITURE", posX: 1.2, posY: 0.3, posZ: -1.2, w: 0.5, l: 0.5, h: 0.6 },
        { name: "Thảm trải sàn", modelType: "rug", category: "RUG", posX: 0.5, posY: 0.02, posZ: -0.6, w: 1.2, l: 0.8, h: 0.02, isLoose: true },
      ] : data.roomType === "BATHROOM" ? [
        { name: "Bồn cầu vệ sinh", modelType: "toilet", category: "FURNITURE", posX: -0.8, posY: 0.4, posZ: -0.8, w: 0.5, l: 0.7, h: 0.8 },
        { name: "Khay tắm đứng", modelType: "shower", category: "FURNITURE", posX: 0.7, posY: 0.1, posZ: -0.5, w: 0.9, l: 0.9, h: 0.2, isSlippery: true },
      ] : [
        { name: "Ghế sofa", modelType: "sofa", category: "FURNITURE", posX: 0, posY: 0.4, posZ: -1.0, w: 2.0, l: 0.9, h: 0.8 },
        { name: "Bàn trà nhỏ", modelType: "coffee_table", category: "FURNITURE", posX: 0, posY: 0.25, posZ: 0.2, w: 1.0, l: 0.6, h: 0.5 },
      ]
    );

    for (const obj of initialObjects) {
      await prisma.sceneObject.create({
        data: {
          roomId: room.id,
          name: obj.name,
          modelType: obj.modelType,
          category: obj.category,
          positionX: obj.posX || 0,
          positionY: obj.posY || 0,
          positionZ: obj.posZ || 0,
          width: obj.w || 1.0,
          length: obj.l || 1.0,
          height: obj.h || 0.8,
          isLoose: Boolean(obj.isLoose),
          isSlippery: Boolean(obj.isSlippery),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: room.id,
        name: room.name,
        roomType: room.roomType,
      },
    });
  } catch (error: any) {
    console.error("Lỗi tạo phòng 3D:", error);
    return NextResponse.json(
      { error: "Không thể tạo phòng mô phỏng mới", details: error.message },
      { status: 500 }
    );
  }
}

