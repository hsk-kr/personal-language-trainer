import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const COOKIE_NAME = "session";

function isValidSession(request: NextRequest): boolean {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  const session = request.cookies.get(COOKIE_NAME);
  if (!session) return false;

  const expected = createHmac("sha256", secret).update("session").digest("hex");
  return session.value === expected;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // Check auth for everything else
  if (!isValidSession(request)) {
    // API routes return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Pages redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
