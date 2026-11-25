import { NextResponse } from "next/server";
import { sessionAccount, sessionCookie } from "@/lib/auth/accounts";
import { withAccount } from "@/lib/auth/withAccount";
import { deleteAccountAndFamilyData } from "@/lib/privacy/accountDataDeletion";
import { resolveAccountScopeId } from "@/lib/persistence/reliablePersistence";

export async function GET(request: Request) {
  const account = await sessionAccount(request);
  return NextResponse.json({ account }, { status: account ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}

async function DELETEHandler(request: Request) {
  const accountId = resolveAccountScopeId();
  if (!accountId || accountId === "offline-test") {
    return NextResponse.json(
      { success: false, error: "Không xác định được tài khoản để xóa." },
      { status: 400 }
    );
  }
  const result = await deleteAccountAndFamilyData(accountId);
  return NextResponse.json(result, {
    status: 200,
    headers: { "Set-Cookie": sessionCookie("", request), "Cache-Control": "no-store" },
  });
}

export const DELETE = withAccount(DELETEHandler);
export const dynamic = "force-dynamic";
