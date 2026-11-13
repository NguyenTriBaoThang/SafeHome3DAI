import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { INITIAL_ROOMS } from "@/data/mockRooms";

export async function GET() {
  try {
    const dbRooms = await prisma.room.findMany({
      include: {
        sceneObjects: true,
        assessments: {
          include: {
            findings: true,
          },
        },
      },
    });

    if (dbRooms && dbRooms.length > 0) {
      return NextResponse.json(dbRooms);
    }

    // Return initial rooms if DB not seeded yet
    return NextResponse.json(INITIAL_ROOMS);
  } catch (error) {
    console.warn("DB query failed, using in-memory mock rooms:", error);
    return NextResponse.json(INITIAL_ROOMS);
  }
}

