import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { INITIAL_ROOMS } from "@/data/mockRooms";
import {
  classifyDataPartition,
  excludeDemoFromRealQueries,
  buildDemoBanner,
} from "@/lib/persistence/demoBoundary";

async function GETHandler(request: Request) {
  try {
    const url = new URL(request.url);
    const includeDemo = url.searchParams.get("includeDemo") === "1";

    const dbRooms = await prisma.room.findMany({
      include: {
        home: true,
        sceneObjects: true,
        assessments: {
          include: {
            findings: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const partitionedDbRooms = dbRooms.map((r) => {
      const dataPartition = classifyDataPartition(r);
      return {
        ...r,
        dataPartition,
        persistenceStatus: r.persistenceStatus || "saved",
        demoBanner: buildDemoBanner({ ...r, dataPartition }),
      };
    });

    const realRooms = excludeDemoFromRealQueries(partitionedDbRooms);

    if (!includeDemo) {
      return NextResponse.json({
        success: true,
        persistenceStatus: "saved",
        dataPartition: "REAL",
        rooms: realRooms,
      });
    }

    const demoRooms = INITIAL_ROOMS.map((r) => ({
      ...r,
      dataPartition: "DEMO" as const,
      isDemo: true,
      persistenceStatus: "saved" as const,
      demoBanner: buildDemoBanner({ ...r, dataPartition: "DEMO" }),
    }));

    return NextResponse.json({
      success: true,
      persistenceStatus: "saved",
      dataPartition: "MIXED_WITH_EXPLICIT_LABELS",
      rooms: [...realRooms, ...demoRooms],
    });
  } catch (error: any) {
    // NEVER replace a DB failure with in-memory mock rooms disguised as persisted state!
    return NextResponse.json(
      {
        success: false,
        persistenceStatus: "failed",
        code: "DB_QUERY_FAILED",
        error: "Không thể truy cập cơ sở dữ liệu phòng. Chưa tải được dữ liệu thực tế.",
      },
      { status: 503 }
    );
  }
}

export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
