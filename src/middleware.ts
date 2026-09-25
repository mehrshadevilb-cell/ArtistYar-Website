import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ENAMAD_CODE = "43325481";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const privatePath = /^(\/(admin|panel|learn|files|projects|my-artistyar|profile))(\/|$)/.test(pathname);
  if (privatePath || pathname === "/login" || pathname === "/register") {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  // Pure-text response so Enamad/Cloudflare bots never hit the Next HTML shell
  if (pathname === `/${ENAMAD_CODE}.txt` || pathname === `/${ENAMAD_CODE}`) {
    return new NextResponse(ENAMAD_CODE, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Robots-Tag": "noindex",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/43325481.txt",
    "/43325481",
    "/admin/:path*",
    "/panel/:path*",
    "/learn/:path*",
    "/files/:path*",
    "/projects/:path*",
    "/my-artistyar/:path*",
    "/profile/:path*",
    "/login",
    "/register",
  ],
};
