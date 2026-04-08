// =============================================================================
// POST /api/admin/logout
// Clears the admin_token cookie and deletes the matching session row in D1.
// Safe to call without a valid session — always returns 200.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { getCloudflareContext }           from "@opennextjs/cloudflare";
import { hashToken }                       from "@/lib/auth";
import { getDB }                           from "@/lib/db";
import type { Env }                        from "@/types/cloudflare";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );

  const token = request.cookies.get("admin_token")?.value;
  response.cookies.delete("admin_token");

  if (!token) {
    return response;
  }

  try {
    const { env } = await getCloudflareContext<Env>({ async: true });
    const db = getDB(env);
    const tokenHashHex = await hashToken(token);

    await db
      .prepare(`DELETE FROM admin_sessions WHERE token_hash = ?1`)
      .bind(tokenHashHex)
      .run();
  } catch (err) {
    // Logout should never fail from the user's perspective
    console.error("[admin/logout] Failed to purge session row:", err);
  }

  return response;
}
