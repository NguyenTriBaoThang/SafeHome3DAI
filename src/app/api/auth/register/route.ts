import { NextResponse } from "next/server";
import { createAccount, createSession, consumeLimit, sessionCookie } from "@/lib/auth/accounts";
import { sameOrigin } from "@/lib/auth/withAccount";
import { readBoundedBody, BodyLimitError } from "@/lib/http/body";

export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
    if (!await consumeLimit("register:global", 5, 60000)) return NextResponse.json({ error: "Hãy thử lại sau một phút." }, { status: 429 });
    const body = JSON.parse((await readBoundedBody(request, 4096)).toString("utf8"));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 256 || body.consent !== true) {
      return NextResponse.json({ error: "Nhập email hợp lệ, mật khẩu 12–256 ký tự và đồng ý lưu dữ liệu gia đình." }, { status: 400 });
    }
    const account = await createAccount(email, body.password), token = await createSession(account.id);
    return NextResponse.json({ account }, { status: 201, headers: { "Set-Cookie": sessionCookie(token, request), "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Không thể tạo tài khoản. Email có thể đã được sử dụng; hãy thử đăng nhập." }, { status: error instanceof BodyLimitError ? 413 : 409 });
  }
}
