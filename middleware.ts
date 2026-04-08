// =============================================================================
// Next.js Edge Middleware — Admin route protection
// Runs on every request matching /admin and /admin/* paths.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, extractBearerToken } from "@/lib/auth";

// The login page must always be accessible without a valid session.
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Allow the login page through unconditionally
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // -------------------------------------------------------------------------
  // Token extraction — check Authorization header first, then cookie fallback
  // -------------------------------------------------------------------------
  const authHeader  = request.headers.get("Authorization");
  let   token: string | null = extractBearerToken(authHeader);

  if (!token) {
    // Cookie fallback (used by browser-rendered admin pages)
    token = request.cookies.get("admin_token")?.value ?? null;
  }

  // -------------------------------------------------------------------------
  // Validate JWT
  // -------------------------------------------------------------------------
  const jwtSecret = process.env.JWT_SECRET ?? "";

  if (!jwtSecret) {
    console.error("[middleware] JWT_SECRET env var is not configured");
    return redirectToLogin(request);
  }

  if (!token) {
    return redirectToLogin(request);
  }

  const payload = await verifyJWT(token, jwtSecret);

  if (!payload) {
    // Token is missing, expired, or has an invalid signature
    const response = redirectToLogin(request);
    // Clear the cookie so the browser doesn't keep sending a bad token
    response.cookies.delete("admin_token");
    return response;
  }

  // Token is valid — attach the decoded payload as a request header so
  // downstream edge routes can read it without re-verifying.
  const requestWithClaims = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        "x-admin-payload": JSON.stringify(payload),
      }),
    },
  });

  return requestWithClaims;
}

// ---------------------------------------------------------------------------
// Helper: build a redirect response to the login page
// ---------------------------------------------------------------------------

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/admin/login", request.url);

  // Preserve the originally requested path so we can redirect back after login
  const returnTo = request.nextUrl.pathname + request.nextUrl.search;
  if (returnTo && returnTo !== "/admin/login") {
    loginUrl.searchParams.set("returnTo", returnTo);
  }

  return NextResponse.redirect(loginUrl);
}

// ---------------------------------------------------------------------------
// Route matcher config
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all paths under /admin, including /admin itself.
     * Exclude Next.js internal paths and static files to avoid
     * accidentally protecting _next/static, _next/image, favicon, etc.
     */
    "/admin",
    "/admin/:path*",
  ],
};
