import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "chutes_session"; // match whatever is in serverAuth.ts

export function middleware(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE);
  const isProtected =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/upload");

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/upload/:path*"],
};
