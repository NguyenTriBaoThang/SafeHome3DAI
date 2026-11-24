import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  let decoded = path;
  try { for (let i = 0; i < 3; i++) decoded = decodeURIComponent(decoded); } catch { return new NextResponse(null, { status: 400 }); }
  decoded = decoded.replace(/\\/g, "/").replace(/\/+/g, "/").toLowerCase();
  // Legacy files remain on disk but are never served as public household media.
  if (decoded === "/uploads" || decoded.startsWith("/uploads/")) return new NextResponse(null, { status: 404 });
  if (path === "/sign-in" || path.startsWith("/api/auth/")) return NextResponse.next();
  if (!path.startsWith("/api/") && (path.startsWith("/_next/") || /\.[a-z0-9]+$/i.test(path))) return NextResponse.next();
  if (request.cookies.has("safehome_session")) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  return NextResponse.redirect(new URL("/sign-in", request.url));
}
export const config = { matcher: ["/:path*"] };
