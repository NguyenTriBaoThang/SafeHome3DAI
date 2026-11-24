import { NextResponse } from "next/server";
import { sessionAccount } from "@/lib/auth/accounts";
export async function GET(request: Request) {
  const account = await sessionAccount(request);
  return NextResponse.json({ account }, { status: account ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}
