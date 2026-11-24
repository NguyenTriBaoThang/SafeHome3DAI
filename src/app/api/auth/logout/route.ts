import { NextResponse } from "next/server";
import { revokeSession, sessionCookie } from "@/lib/auth/accounts";
import { sameOrigin } from "@/lib/auth/withAccount";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Nguồn không hợp lệ." }, { status: 403 });
  await revokeSession(request);
  return NextResponse.json({ success: true }, { headers: { "Set-Cookie": sessionCookie("", request), "Cache-Control": "no-store" } });
}
