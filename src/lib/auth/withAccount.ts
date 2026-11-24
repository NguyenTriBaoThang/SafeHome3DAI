import { NextRequest, NextResponse } from "next/server";
import { accountScope } from "./context";
import { sessionAccount, familyDatabase, consumeLimit } from "./accounts";
import { readBoundedBody, BodyLimitError } from "@/lib/http/body";

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const target = process.env.SAFEHOME_APP_ORIGIN || new URL(request.url).origin;
  return !origin || origin === target;
}
const runtimeState = globalThis as typeof globalThis & { safehomeActiveInference?: Map<string, number> };
const active = runtimeState.safehomeActiveInference ||= new Map<string, number>();
export function withAccount<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (request: Request, ...args: any[]) => {
    // Explicit offline test configuration only; never enabled by an HTTP parameter.
    if (process.env.NODE_ENV === "test" && process.env.SAFEHOME_ISOLATED_TESTS === "1") return handler(request, ...args);
    let accountId: string | undefined, costly = false;
    try {
      if (!["GET", "HEAD"].includes(request.method) && !sameOrigin(request)) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
      const account = await sessionAccount(request);
      if (!account) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
      const expected = request.headers.get("X-SafeHome-Account");
      if (expected && expected !== account.id) return NextResponse.json({ error: "Tài khoản đã thay đổi. Hãy mở lại hồ sơ." },
        { status: 403, headers: { "X-SafeHome-Account-Changed": "1" } });
      const pathname = new URL(request.url).pathname;
      costly = request.method === "POST" && /(?:scan-photo|\/analyze$|assess-item|\/chat(?:\/stream)?$|interpret-nlp|\/rag(?:\/search)?$)/.test(pathname);
      if (costly) {
        if ((active.get(account.id) || 0) >= 2 || !await consumeLimit(`ai:${account.id}`, 30, 3600000)) {
          return NextResponse.json({ error: "Đã đạt giới hạn phân tích. Hãy thử lại sau." }, { status: 429, headers: { "Retry-After": "60" } });
        }
        accountId = account.id; active.set(accountId, (active.get(accountId) || 0) + 1);
      }
      let bounded = request;
      if (!["GET", "HEAD"].includes(request.method)) {
        const maximum = pathname.includes("/vision/images") || pathname.includes("/scan-photo") ? 14 * 1024 * 1024 : 1024 * 1024;
        const bytes = await readBoundedBody(request, maximum);
        bounded = new NextRequest(request.url, { method: request.method, headers: request.headers, body: new Uint8Array(bytes), signal: request.signal });
      }
      const database = await familyDatabase(account.id);
      return await accountScope.run({ ...account, database }, async () => {
        const response = await handler(bounded, ...args);
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      });
    } catch (error) {
      return NextResponse.json({ error: error instanceof BodyLimitError ? error.message : "Không thể hoàn tất yêu cầu." }, { status: error instanceof BodyLimitError ? 413 : 503 });
    } finally {
      if (accountId) {
        const remaining = (active.get(accountId) || 1) - 1;
        if (remaining > 0) active.set(accountId, remaining); else active.delete(accountId);
      }
    }
  }) as T;
}
