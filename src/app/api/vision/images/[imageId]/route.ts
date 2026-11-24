import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { deleteImageFile } from "@/lib/vision/imageStorage";
import { deleteVisionImage } from "@/lib/vision/deleteVisionImage";

async function DELETEHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ imageId: string }> }
) {
  const params = await routeParams;
  try {
    const { imageId } = params;

    const data = await deleteVisionImage(imageId);
    return NextResponse.json({ success: !!data, data }, { status: data ? 200 : 404 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


export const DELETE = withAccount(DELETEHandler);
export const dynamic = "force-dynamic";
