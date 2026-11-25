import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { revokeConsent } from "@/lib/privacy/consentService";
import { resolveAccountScopeId } from "@/lib/persistence/reliablePersistence";
import { prisma } from "@/lib/database/prisma";
import { deleteVisionImage } from "@/lib/vision/deleteVisionImage";

async function POSTHandler(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const accountId = resolveAccountScopeId();
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : undefined;
    const purgeStoredImages = body?.purgeStoredImages === true;

    const record = await revokeConsent({ accountId, reason });

    let purgedImagesCount = 0;
    const cleanupPendingIds: string[] = [];

    if (purgeStoredImages) {
      const images = await prisma.roomImage.findMany({ select: { id: true } });
      for (const img of images) {
        const res = await deleteVisionImage(img.id);
        if (res) {
          purgedImagesCount++;
          if (res.cleanupPending) cleanupPendingIds.push(img.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      persistenceStatus: "saved",
      consent: record,
      purgedImagesCount,
      cleanupPendingIds,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, persistenceStatus: "failed", error: error?.message || "Không thể thu hồi đồng ý." },
      { status: 503 }
    );
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";

