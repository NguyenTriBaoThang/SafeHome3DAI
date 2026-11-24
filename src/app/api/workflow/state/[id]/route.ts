import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

async function GETHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const id = params.id;

    // Search by projectId or surveyId
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        homes: {
          include: {
            rooms: {
              include: {
                sceneObjects: true,
                assessments: {
                  include: {
                    findings: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (project) {
      return NextResponse.json({
        success: true,
        data: {
          type: "PROJECT",
          project,
        },
      });
    }

    // Try finding by surveyId
    const survey = await prisma.homeSurvey.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            answers: true,
            profile: true,
            findings: true,
          },
        },
      },
    });

    if (survey) {
      return NextResponse.json({
        success: true,
        data: {
          type: "SURVEY",
          survey,
        },
      });
    }

    return NextResponse.json(
      { error: "Không tìm thấy hồ sơ quy trình với ID yêu cầu" },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Lỗi lấy trạng thái quy trình:", error);
    return NextResponse.json(
      { error: "Lỗi truy vấn cơ sở dữ liệu", details: error.message },
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
