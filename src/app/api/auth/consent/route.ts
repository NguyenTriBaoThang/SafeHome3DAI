import { buildSafeErrorPayload } from "@/lib/security/resilience";
import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import {
  grantConsent,
  getLatestConsentStatus,
  GrantConsentSchema,
} from "@/lib/privacy/consentService";
import { resolveAccountScopeId } from "@/lib/persistence/reliablePersistence";

async function GETHandler(_request: Request) {
  try {
    const status = await getLatestConsentStatus(resolveAccountScopeId());
    return NextResponse.json({ success: true, consent: status });
  } catch (error: any) {
    return NextResponse.json(
      buildSafeErrorPayload(error, "Không tải được trạng thái đồng ý.", "AUTH_CONSENT_ERROR"),
      { status: 503 }
    );
  }
}

async function POSTHandler(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = GrantConsentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Thông tin đồng ý không hợp lệ.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const record = await grantConsent(parsed.data, {
      accountId: resolveAccountScopeId(),
      origin: request.headers.get("origin"),
    });

    return NextResponse.json(
      {
        success: true,
        persistenceStatus: "saved",
        consent: record,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ...buildSafeErrorPayload(error, "Không lưu được đồng ý.", "AUTH_CONSENT_ERROR"), persistenceStatus: "failed" },
      { status: 503 }
    );
  }
}

export const GET = withAccount(GETHandler);
export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";

