// =============================================================================
// POST /api/inquiry
// Validates a Cloudflare Turnstile token, stores the inquiry in D1,
// and fires a Resend notification email to the admin.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { getCloudflareContext }           from "@opennextjs/cloudflare";
import { getDB, createInquiry }           from "@/lib/db";
import { sendInquiryEmail }               from "@/lib/email";
import { getImageUrl }                    from "@/lib/storage";
import type { Env }                       from "@/types/cloudflare";
import type { CartItem as EmailCartItem } from "@/lib/email";

// ---------------------------------------------------------------------------
// Request body type
// ---------------------------------------------------------------------------

interface CartItemInput {
  printId:  number;
  title:    string;
  size:     "small" | "medium" | "large" | "xlarge";
  price:    number;   // cents
  r2Key?:   string;   // optional, used to build imageUrl for the email
}

interface InquiryRequestBody {
  name:            string;
  email:           string;
  phone?:          string;
  message?:        string;
  cartItems:       CartItemInput[];
  turnstileToken:  string;
}

// ---------------------------------------------------------------------------
// Turnstile verification
// ---------------------------------------------------------------------------

async function verifyTurnstile(
  token: string,
  secretKey: string,
  remoteIp?: string
): Promise<boolean> {
  const formData = new FormData();
  formData.append("secret",   secretKey);
  formData.append("response", token);
  if (remoteIp) formData.append("remoteip", remoteIp);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: formData }
  );

  if (!response.ok) return false;

  const data = (await response.json()) as { success: boolean };
  return data.success === true;
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

function isValidEmail(email: string): boolean {
  // RFC-5322 simplified regex — sufficient for basic server-side guard
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateBody(body: unknown): {
  valid: true;
  data: InquiryRequestBody;
} | { valid: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.name !== "string" || b.name.trim().length === 0) {
    return { valid: false, error: "name is required" };
  }

  if (typeof b.email !== "string" || !isValidEmail(b.email)) {
    return { valid: false, error: "A valid email address is required" };
  }

  if (!Array.isArray(b.cartItems) || b.cartItems.length === 0) {
    return { valid: false, error: "cartItems must be a non-empty array" };
  }

  const VALID_SIZES = new Set(["small", "medium", "large", "xlarge"]);
  for (const [i, item] of (b.cartItems as unknown[]).entries()) {
    if (typeof item !== "object" || item === null) {
      return { valid: false, error: `cartItems[${i}] is invalid` };
    }
    const it = item as Record<string, unknown>;
    if (typeof it.printId !== "number") {
      return { valid: false, error: `cartItems[${i}].printId must be a number` };
    }
    if (typeof it.title !== "string" || it.title.trim().length === 0) {
      return { valid: false, error: `cartItems[${i}].title is required` };
    }
    if (typeof it.size !== "string" || !VALID_SIZES.has(it.size)) {
      return { valid: false, error: `cartItems[${i}].size must be small|medium|large|xlarge` };
    }
    if (typeof it.price !== "number" || it.price < 0) {
      return { valid: false, error: `cartItems[${i}].price must be a non-negative number` };
    }
  }

  if (typeof b.turnstileToken !== "string" || b.turnstileToken.trim().length === 0) {
    return { valid: false, error: "turnstileToken is required" };
  }

  return {
    valid: true,
    data: {
      name:           (b.name as string).trim(),
      email:          (b.email as string).trim().toLowerCase(),
      phone:          typeof b.phone === "string" ? b.phone.trim() || undefined : undefined,
      message:        typeof b.message === "string" ? b.message.trim() || undefined : undefined,
      cartItems:      b.cartItems as CartItemInput[],
      turnstileToken: (b.turnstileToken as string).trim(),
    },
  };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // -------------------------------------------------------------------------
  // Parse request body
  // -------------------------------------------------------------------------
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = validateBody(rawBody);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const { name, email, phone, message, cartItems, turnstileToken } = validation.data;

  // -------------------------------------------------------------------------
  // Grab Cloudflare env bindings
  // -------------------------------------------------------------------------
  const { env } = await getCloudflareContext<Env>({ async: true });

  if (!env.TURNSTILE_SECRET_KEY) {
    console.error("[inquiry] TURNSTILE_SECRET_KEY is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // -------------------------------------------------------------------------
  // Verify Turnstile CAPTCHA
  // -------------------------------------------------------------------------
  const remoteIp =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    undefined;

  const turnstileOk = await verifyTurnstile(
    turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    remoteIp
  );

  if (!turnstileOk) {
    return NextResponse.json(
      { error: "CAPTCHA verification failed. Please try again." },
      { status: 403 }
    );
  }

  // -------------------------------------------------------------------------
  // Persist inquiry to D1
  // -------------------------------------------------------------------------
  const db = getDB(env);

  const cartJson = JSON.stringify(
    cartItems.map((item) => ({
      printId: item.printId,
      title:   item.title,
      size:    item.size,
      price:   item.price,
    }))
  );

  let inquiryId: number;
  try {
    inquiryId = await createInquiry(db, {
      customer_name:  name,
      customer_email: email,
      customer_phone: phone ?? null,
      message:        message ?? null,
      cart_json:      cartJson,
    });
  } catch (err) {
    console.error("[inquiry] D1 insert failed:", err);
    return NextResponse.json(
      { error: "Failed to save your inquiry. Please try again later." },
      { status: 500 }
    );
  }

  // -------------------------------------------------------------------------
  // Send notification email (non-blocking — don't fail the request if email fails)
  // -------------------------------------------------------------------------
  const emailCartItems: EmailCartItem[] = cartItems.map((item) => ({
    title:    item.title,
    size:     item.size,
    price:    item.price,
    imageUrl: item.r2Key ? getImageUrl(item.r2Key) : "",
  }));

  const fromEmail  = env.FROM_EMAIL  ?? "noreply@princephoto.com";
  const adminEmail = env.ADMIN_EMAIL ?? "admin@princephoto.com";

  if (env.RESEND_API_KEY) {
    sendInquiryEmail(
      { customerName: name, email, phone, message, cartItems: emailCartItems },
      env.RESEND_API_KEY,
      fromEmail,
      adminEmail
    ).catch((err) => {
      console.error("[inquiry] Email send error (non-fatal):", err);
    });
  } else {
    console.warn("[inquiry] RESEND_API_KEY not set — skipping email notification");
  }

  // -------------------------------------------------------------------------
  // Return success
  // -------------------------------------------------------------------------
  return NextResponse.json(
    { success: true, inquiryId },
    { status: 201 }
  );
}
