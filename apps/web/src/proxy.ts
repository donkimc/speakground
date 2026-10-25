import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Cookie presence only — not a session validation.
 * Protected actions still call getSession() on the server.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/join", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/onboarding", "/placement", "/practice", "/notebook", "/progress"],
};
