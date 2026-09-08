import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export function middleware(request: NextRequest) {
  let sid = request.cookies.get(SESSION_COOKIE)?.value;
  const requestHeaders = new Headers(request.headers);

  if (!sid) {
    sid = crypto.randomUUID();
  }
  requestHeaders.set("x-evolyn-sid", sid);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sid,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: request.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
