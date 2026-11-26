import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { getSurveyById, deleteSurvey } from "@/lib/survey/surveyManager";
import { authorizeObjectAccess, AuthorizationError } from "@/lib/auth/authorization";
import { resolveAccountScopeId, recordAuditEventBestEffort } from "@/lib/persistence/reliablePersistence";

async function GETHandler(
  _request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const survey = await getSurveyById(params.id);
    if (!survey) {
      return NextResponse.json(
        { error: "Không tìm thấy hồ sơ khảo sát" },
        { status: 404 }
      );
    }

    await authorizeObjectAccess({
      resourceType: "SURVEY",
      resourceId: survey.id,
      resourceOwnerId: survey.ownerId,
      callerAccountId: resolveAccountScopeId(),
      action: "READ",
    });

    return NextResponse.json({
      success: true,
      survey,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, code: "SURVEYS_ERROR", error: "Lỗi hệ thống khi tải khảo sát" },
      { status: 500 }
    );
  }
}

async function DELETEHandler(
  _request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const survey = await getSurveyById(params.id);
    if (!survey) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ khảo sát" }, { status: 404 });
    }

    const callerId = resolveAccountScopeId();
    await authorizeObjectAccess({
      resourceType: "SURVEY",
      resourceId: survey.id,
      resourceOwnerId: survey.ownerId,
      callerAccountId: callerId,
      action: "DELETE",
    });

    await deleteSurvey(params.id);
    await recordAuditEventBestEffort({
      accountId: callerId,
      resourceType: "SURVEY",
      resourceId: params.id,
      action: "DELETED",
      status: "saved",
    });

    return NextResponse.json({
      success: true,
      persistenceStatus: "saved",
      message: "Đã xóa khảo sát thành công",
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, code: "SURVEYS_ERROR", error: "Không thể xóa khảo sát" },
      { status: 500 }
    );
  }
}

export const GET = withAccount(GETHandler);
export const DELETE = withAccount(DELETEHandler);
export const dynamic = "force-dynamic";
