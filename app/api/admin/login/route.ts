// =============================================================================
// POST /api/admin/login
// Accepts { password } JSON body. Verifies against admin_users table using
// PBKDF2-SHA256, issues a 24h HMAC JWT, stores the session hash in D1, and
// sets the `admin_token` HttpOnly cookie.
//
// Edge runtime — uses Web Crypto via lib/auth.ts helpers.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { getCloudflareContext }           from "@opennextjs/cloudflare";
import {
  signJWT,
  hashPassword,
  hashToken,
  safeCompare,
}                                          from "@/lib/auth";
import { getDB, createAdminSession }       from "@/lib/db";
import type { Env }                        from "@/types/cloudflare";

const ADMIN_USERNAME = "admin";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours — must match signJWT expiry

interface AdminUserRow {
  id:             number;
  username:       string;
  password_hash:  string;
  password_salt:  string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { env } = await getCloudflareContext<Env>({ async: true });
    const db = getDB(env);

    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("[admin/login] JWT_SECRET binding is missing");
      return NextResponse.json(
        { error: "Server is not configured" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // ---------------------------------------------------------------------
    // Parse body
    // ---------------------------------------------------------------------
    let body: { password?: unknown };
    try {
      body = (await request.json()) as { password?: unknown };
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const password = typeof body.password === "string" ? body.password : "";
    if (password.length === 0) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // ---------------------------------------------------------------------
    // Look up the admin user
    // ---------------------------------------------------------------------
    const user = await db
      .prepare(
        `SELECT id, username, password_hash, password_salt
         FROM   admin_users
         WHERE  username = ?1
         LIMIT  1`
      )
      .bind(ADMIN_USERNAME)
      .first<AdminUserRow>();

    if (!user) {
      // Don't reveal whether the user exists — same error as wrong password
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // ---------------------------------------------------------------------
    // Verify password
    // ---------------------------------------------------------------------
    const derived = await hashPassword(password, user.password_salt);
    const ok      = await safeCompare(derived, user.password_hash);

    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // ---------------------------------------------------------------------
    // Issue JWT + persist session hash
    // ---------------------------------------------------------------------
    const token = await signJWT({ sub: user.id, username: user.username }, jwtSecret);
    const tokenHashHex = await hashToken(token);
    const expiresAt    = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

    await createAdminSession(db, tokenHashHex, expiresAt);

    // ---------------------------------------------------------------------
    // Set cookie + respond
    // ---------------------------------------------------------------------
    const response = NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   SESSION_TTL_SECONDS,
    });

    return response;
  } catch (err) {
    console.error("[admin/login] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
