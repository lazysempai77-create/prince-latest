// =============================================================================
// Standalone Cloudflare Worker — Email Notification Service
//
// Deploy separately from the Next.js app:
//   wrangler deploy workers/email-worker.ts --name prince-email-worker
//
// wrangler.toml snippet for this worker (create workers/wrangler.email.toml):
// -----------------------------------------------------------------------
// name            = "prince-email-worker"
// main            = "workers/email-worker.ts"
// compatibility_date = "2024-12-01"
// compatibility_flags = ["nodejs_compat"]
//
// [vars]
// ADMIN_EMAIL = "admin@princephoto.com"
// FROM_EMAIL  = "noreply@princephoto.com"
// ALLOWED_ORIGIN = "https://princephoto.com"
//
// [secrets]   # set via: wrangler secret put MAILCHANNELS_API_KEY
// # MAILCHANNELS_API_KEY  (if using paid MailChannels account)
// # RESEND_API_KEY        (alternative: Resend)
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkerEnv {
  ADMIN_EMAIL:          string;
  FROM_EMAIL:           string;
  ALLOWED_ORIGIN:       string;
  RESEND_API_KEY?:      string;
  MAILCHANNELS_API_KEY?: string;
}

interface CartItem {
  printId:  number;
  title:    string;
  size:     "small" | "medium" | "large" | "xlarge";
  price:    number;   // cents
  imageUrl?: string;
}

interface InquiryPayload {
  customerName: string;
  email:        string;
  phone?:       string | null;
  message?:     string | null;
  cartItems:    CartItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZE_LABELS: Record<CartItem["size"], string> = {
  small:  '8×10"',
  medium: '12×16"',
  large:  '16×20"',
  xlarge: '20×30"',
};

function cents(n: number): string {
  return `$${(n / 100).toFixed(2)}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// CORS helper
// ---------------------------------------------------------------------------

function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const allowed =
    allowedOrigin === "*" || origin === allowedOrigin ? origin : allowedOrigin;

  return {
    "Access-Control-Allow-Origin":  allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age":       "86400",
  };
}

// ---------------------------------------------------------------------------
// MailChannels sender (free on Cloudflare Workers, no API key required for
// basic usage; paid plans require an API key for domain auth).
// Docs: https://api.mailchannels.net/tx/v1/documentation
// ---------------------------------------------------------------------------

async function sendViaMailChannels(
  inquiry: InquiryPayload,
  env: WorkerEnv
): Promise<boolean> {
  const total = inquiry.cartItems.reduce((s, i) => s + i.price, 0);

  const textLines: string[] = [
    "New Print Inquiry — Prince Photography",
    "=======================================",
    `Name:  ${inquiry.customerName}`,
    `Email: ${inquiry.email}`,
  ];
  if (inquiry.phone)   textLines.push(`Phone: ${inquiry.phone}`);
  if (inquiry.message) textLines.push("", "Message:", inquiry.message);

  textLines.push("", "Selected Prints:");
  for (const item of inquiry.cartItems) {
    textLines.push(`  • ${item.title} (${SIZE_LABELS[item.size]}) — ${cents(item.price)}`);
  }
  textLines.push(``, `Total: ${cents(total)}`);

  const mailBody = {
    personalizations: [
      {
        to:   [{ email: env.ADMIN_EMAIL }],
        dkim_domain:     env.FROM_EMAIL.split("@")[1] ?? "",
        dkim_selector:   "mailchannels",
        dkim_private_key: "",  // populated via Worker secret / Durable Objects
      },
    ],
    from: {
      email: env.FROM_EMAIL,
      name:  "Prince Photography",
    },
    reply_to: {
      email: inquiry.email,
      name:  inquiry.customerName,
    },
    subject: `New Inquiry from ${inquiry.customerName} (${inquiry.cartItems.length} print${inquiry.cartItems.length !== 1 ? "s" : ""})`,
    content: [
      {
        type:  "text/plain",
        value: textLines.join("\n"),
      },
      {
        type:  "text/html",
        value: buildMailChannelsHtml(inquiry),
      },
    ],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (env.MAILCHANNELS_API_KEY) {
    headers["X-Auth-Token"] = env.MAILCHANNELS_API_KEY;
  }

  const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method:  "POST",
    headers,
    body:    JSON.stringify(mailBody),
  });

  if (response.ok || response.status === 202) {
    return true;
  }

  const errText = await response.text();
  console.error(
    `[email-worker] MailChannels error ${response.status}: ${errText}`
  );
  return false;
}

// ---------------------------------------------------------------------------
// Resend fallback sender
// ---------------------------------------------------------------------------

async function sendViaResend(
  inquiry: InquiryPayload,
  env: WorkerEnv
): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;

  const total = inquiry.cartItems.reduce((s, i) => s + i.price, 0);

  const rows = inquiry.cartItems
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.title)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${SIZE_LABELS[item.size]}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${cents(item.price)}</td>
        </tr>`
    )
    .join("");

  const html = `
    <h2>New Print Inquiry</h2>
    <p><strong>From:</strong> ${escapeHtml(inquiry.customerName)} &lt;${escapeHtml(inquiry.email)}&gt;</p>
    ${inquiry.phone ? `<p><strong>Phone:</strong> ${escapeHtml(inquiry.phone)}</p>` : ""}
    ${inquiry.message ? `<p><strong>Message:</strong><br>${escapeHtml(inquiry.message).replace(/\n/g, "<br>")}</p>` : ""}
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;background:#f3f4f6;">Print</th>
          <th style="text-align:left;padding:8px;background:#f3f4f6;">Size</th>
          <th style="text-align:right;padding:8px;background:#f3f4f6;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:8px;font-weight:bold;text-align:right;">Total</td>
          <td style="padding:8px;font-weight:bold;text-align:right;">${cents(total)}</td>
        </tr>
      </tfoot>
    </table>`;

  const response = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:     env.FROM_EMAIL,
      to:       [env.ADMIN_EMAIL],
      reply_to: inquiry.email,
      subject:  `New Inquiry from ${inquiry.customerName}`,
      html,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[email-worker] Resend error ${response.status}: ${errText}`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// HTML builder for MailChannels payload
// ---------------------------------------------------------------------------

function buildMailChannelsHtml(inquiry: InquiryPayload): string {
  const total = inquiry.cartItems.reduce((s, i) => s + i.price, 0);

  const rows = inquiry.cartItems
    .map(
      (item) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
          ${
            item.imageUrl
              ? `<img src="${escapeHtml(item.imageUrl)}" width="56" height="56" alt="${escapeHtml(item.title)}"
                      style="border-radius:4px;object-fit:cover;display:block;"/>`
              : ""
          }
        </td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:15px;color:#111827;">${escapeHtml(item.title)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">${SIZE_LABELS[item.size]}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">${cents(item.price)}</td>
      </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#111827;padding:24px 28px;">
      <h1 style="margin:0;color:#f9fafb;font-size:20px;font-family:Georgia,serif;font-weight:normal;">
        Prince Photography
      </h1>
      <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.1em;">
        New Print Inquiry
      </p>
    </div>
    <div style="padding:24px 28px;">
      <p><strong>Name:</strong> ${escapeHtml(inquiry.customerName)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></p>
      ${inquiry.phone ? `<p><strong>Phone:</strong> ${escapeHtml(inquiry.phone)}</p>` : ""}
      ${inquiry.message ? `<p><strong>Message:</strong><br/>${escapeHtml(inquiry.message).replace(/\n/g, "<br/>")}</p>` : ""}
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;margin-top:16px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px;text-align:left;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Preview</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Print</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Size</th>
            <th style="padding:10px;text-align:right;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#f9fafb;">
            <td colspan="3" style="padding:12px 10px;font-weight:700;text-align:right;font-size:14px;">Estimated Total</td>
            <td style="padding:12px 10px;font-weight:700;text-align:right;font-size:15px;">${cents(total)}</td>
          </tr>
        </tfoot>
      </table>
      <div style="margin-top:24px;">
        <a href="mailto:${escapeHtml(inquiry.email)}?subject=Re%3A%20Your%20Print%20Inquiry"
           style="background:#111827;color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;display:inline-block;">
          Reply to ${escapeHtml(inquiry.customerName)}
        </a>
      </div>
    </div>
    <div style="background:#f3f4f6;padding:14px 28px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Prince Photography — automated inquiry notification
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

function validatePayload(body: unknown): { ok: true; data: InquiryPayload } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;
  if (typeof b.customerName !== "string" || !b.customerName.trim()) {
    return { ok: false, error: "customerName is required" };
  }
  if (typeof b.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) {
    return { ok: false, error: "Valid email is required" };
  }
  if (!Array.isArray(b.cartItems) || b.cartItems.length === 0) {
    return { ok: false, error: "cartItems must be a non-empty array" };
  }

  return {
    ok:   true,
    data: b as unknown as InquiryPayload,
  };
}

// ---------------------------------------------------------------------------
// Worker export — Cloudflare Workers module syntax
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "*";
    const cors   = corsHeaders(origin, env.ALLOWED_ORIGIN ?? "*");

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // Only handle POST /send-inquiry
    if (request.method !== "POST" || url.pathname !== "/send-inquiry") {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const validation = validatePayload(rawBody);
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 422, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const { data } = validation;

    // Try MailChannels first, fall back to Resend
    let sent = false;

    try {
      sent = await sendViaMailChannels(data, env);
    } catch (err) {
      console.error("[email-worker] MailChannels threw:", err);
    }

    if (!sent && env.RESEND_API_KEY) {
      try {
        sent = await sendViaResend(data, env);
      } catch (err) {
        console.error("[email-worker] Resend threw:", err);
      }
    }

    if (!sent) {
      return new Response(
        JSON.stringify({ error: "Failed to send email via all providers" }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  },
} satisfies ExportedHandler<WorkerEnv>;
