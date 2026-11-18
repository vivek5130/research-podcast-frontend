import { NextResponse, type NextRequest } from "next/server";

/**
 * Route guard: signed-out visitors to app pages are sent to the sign-in page,
 * remembering where they were going (e.g. the run link from the email).
 *
 * This only checks that the session cookie *exists*. The backend validates it on
 * every API call, and the app layout signs the user out if it turns out invalid.
 */
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "dailycast_session";

export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/schedulers/:path*", "/runs/:path*"],
};
