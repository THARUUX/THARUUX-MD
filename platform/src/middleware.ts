import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("tharuux_session");

  let session: { id: string; email: string; role: string; plan?: string } | null = null;
  if (sessionCookie?.value) {
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie.value));
    } catch {
      try {
        session = JSON.parse(sessionCookie.value);
      } catch {}
    }
  }

  // 1. Protect Admin Routes: Must be logged in AND have role === 'admin'
  if (pathname.startsWith("/admin")) {
    if (!session || session.role !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      // Clean invalid session cookie if any
      if (session && session.role !== "admin") {
        res.cookies.delete("tharuux_session");
      }
      return res;
    }
  }

  // 2. Protect Client Dashboard Routes: Must be logged in
  if (pathname.startsWith("/dashboard")) {
    if (!session || !session.id) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
  ],
};
