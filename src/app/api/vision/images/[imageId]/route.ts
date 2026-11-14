import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { deleteImageFile } from "@/lib/vision/imageStorage";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const { imageId } = params;

    const img = await prisma.roomImage.findUnique({
      where: { id: imageId },
    });

    if (img) {
      await deleteImageFile(img.storageKey);
      await prisma.roomImage.delete({
        where: { id: imageId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

