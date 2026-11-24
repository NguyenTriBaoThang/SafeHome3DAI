import { NextResponse } from "next/server";
import { findAccount, verifyPassword, createSession, consumeLimit, sessionCookie, hashPassword } from "@/lib/auth/accounts";
import { sameOrigin } from "@/lib/auth/withAccount";
import { readBoundedBody, BodyLimitError } from "@/lib/http/body";

const dummy = hashPassword("dummy-password-for-timing-only");
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
    const body = JSON.parse((await readBoundedBody(request, 4096)).toString("utf8"));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    if (typeof body.password !== "string" || body.password.length > 256) return NextResponse.json({ error: "Thông tin đăng nhập không hợp lệ." }, { status: 400 });
    if (!await consumeLimit("login:global", 60, 60000) || !await consumeLimit(`login:${email}`, 10, 900000)) {
      return NextResponse.json({ error: "Quá nhiều lần đăng nhập. Hãy thử lại sau." }, { status: 429 });
    }
    const account = await findAccount(email);
    const valid = await verifyPassword(body.password, account?.passwordHash || await dummy);
    if (!account || !valid) return NextResponse.json({ error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
    const token = await createSession(account.id);
    return NextResponse.json({ account: { id: account.id, email: account.email } }, { headers: { "Set-Cookie": sessionCookie(token, request), "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Không thể đăng nhập." }, { status: error instanceof BodyLimitError ? 413 : 503 });
  }
}
