// =============================================================================
// Resend email helper — uses fetch() only (edge-compatible, no SDK)
// Sends rich HTML inquiry notifications to the studio admin.
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
  title:    string;
  size:     "small" | "medium" | "large" | "xlarge";
  price:    number;   // in cents
  imageUrl: string;
}

export interface InquiryEmailData {
  customerName: string;
  email:        string;
  phone?:       string | null;
  message?:     string | null;
  cartItems:    CartItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SIZE_LABELS: Record<CartItem["size"], string> = {
  small:  '8×10"',
  medium: '12×16"',
  large:  '16×20"',
  xlarge: '20×30"',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ---------------------------------------------------------------------------
// HTML email builder
// ---------------------------------------------------------------------------

function buildInquiryHtml(data: InquiryEmailData): string {
  const { customerName, email, phone, message, cartItems } = data;
  const total = buildCartTotal(cartItems);

  const printRows = cartItems
    .map(
      (item) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;vertical-align:middle;">
          <img
            src="${escapeHtml(item.imageUrl)}"
            alt="${escapeHtml(item.title)}"
            width="60"
            height="60"
            style="border-radius:4px;object-fit:cover;display:block;"
          />
        </td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;vertical-align:middle;font-family:Georgia,serif;font-size:15px;color:#1f2937;">
          ${escapeHtml(item.title)}
        </td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;vertical-align:middle;font-size:14px;color:#6b7280;white-space:nowrap;">
          ${SIZE_LABELS[item.size]}
        </td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;vertical-align:middle;font-size:14px;color:#1f2937;white-space:nowrap;text-align:right;">
          ${formatPrice(item.price)}
        </td>
      </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>New Print Inquiry</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:28px 32px;">
              <h1 style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#f9fafb;letter-spacing:0.05em;">
                Prince Photography
              </h1>
              <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;letter-spacing:0.1em;text-transform:uppercase;">
                New Print Inquiry
              </p>
            </td>
          </tr>

          <!-- Customer details -->
          <tr>
            <td style="padding:28px 32px 0;">
              <h2 style="margin:0 0 16px;font-size:16px;color:#374151;font-weight:600;">
                Customer Details
              </h2>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#6b7280;width:120px;">Name</td>
                  <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:500;">${escapeHtml(customerName)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#6b7280;">Email</td>
                  <td style="padding:4px 0;font-size:14px;">
                    <a href="mailto:${escapeHtml(email)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(email)}</a>
                  </td>
                </tr>
                ${
                  phone
                    ? `<tr>
                  <td style="padding:4px 0;font-size:14px;color:#6b7280;">Phone</td>
                  <td style="padding:4px 0;font-size:14px;color:#111827;">${escapeHtml(phone)}</td>
                </tr>`
                    : ""
                }
              </table>
            </td>
          </tr>

          ${
            message
              ? `<!-- Message -->
          <tr>
            <td style="padding:24px 32px 0;">
              <h2 style="margin:0 0 12px;font-size:16px;color:#374151;font-weight:600;">
                Message
              </h2>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;background:#f3f4f6;padding:16px;border-radius:6px;border-left:3px solid #d1d5db;">
                ${escapeHtml(message).replace(/\n/g, "<br />")}
              </p>
            </td>
          </tr>`
              : ""
          }

          <!-- Cart table -->
          <tr>
            <td style="padding:24px 32px 0;">
              <h2 style="margin:0 0 12px;font-size:16px;color:#374151;font-weight:600;">
                Selected Prints
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:10px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;width:72px;">
                      Preview
                    </th>
                    <th style="padding:10px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">
                      Print
                    </th>
                    <th style="padding:10px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;white-space:nowrap;">
                      Size
                    </th>
                    <th style="padding:10px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;white-space:nowrap;">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${printRows}
                </tbody>
                <tfoot>
                  <tr style="background:#f9fafb;">
                    <td colspan="3"
                        style="padding:12px 10px;font-size:14px;font-weight:600;color:#374151;text-align:right;">
                      Estimated Total
                    </td>
                    <td style="padding:12px 10px;font-size:15px;font-weight:700;color:#111827;text-align:right;white-space:nowrap;">
                      ${formatPrice(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                * Prices are estimates only. Final quote provided upon confirmation.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:28px 32px;">
              <a href="mailto:${escapeHtml(email)}?subject=Re%3A%20Your%20Print%20Inquiry"
                 style="display:inline-block;background:#111827;color:#f9fafb;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:500;text-decoration:none;letter-spacing:0.02em;">
                Reply to ${escapeHtml(customerName)}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f3f4f6;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                This notification was sent by Prince Photography's inquiry system.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Email sender
// ---------------------------------------------------------------------------

/**
 * Sends an inquiry notification email to the admin via the Resend API.
 *
 * @param inquiry      - Structured inquiry data (customer + cart).
 * @param resendApiKey - Resend API key from env (process.env.RESEND_API_KEY or env.RESEND_API_KEY).
 * @param fromEmail    - Verified "from" address in Resend (e.g. noreply@princephoto.com).
 * @param toEmail      - Admin email that will receive the notification.
 * @returns            `true` on success, `false` on any error.
 */
export async function sendInquiryEmail(
  inquiry: InquiryEmailData,
  resendApiKey: string,
  fromEmail: string,
  toEmail: string
): Promise<boolean> {
  const html = buildInquiryHtml(inquiry);

  const subject = `New Print Inquiry from ${inquiry.customerName} (${inquiry.cartItems.length} item${
    inquiry.cartItems.length === 1 ? "" : "s"
  })`;

  const body = JSON.stringify({
    from:    fromEmail,
    to:      [toEmail],
    reply_to: inquiry.email,
    subject,
    html,
    text: buildPlainText(inquiry),
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[email] Resend API error ${response.status}: ${errorBody}`
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Failed to reach Resend API:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Plain-text fallback
// ---------------------------------------------------------------------------

function buildPlainText(data: InquiryEmailData): string {
  const lines: string[] = [
    "NEW PRINT INQUIRY — Prince Photography",
    "========================================",
    "",
    `Name:    ${data.customerName}`,
    `Email:   ${data.email}`,
  ];

  if (data.phone) lines.push(`Phone:   ${data.phone}`);
  if (data.message) {
    lines.push("", "Message:", data.message);
  }

  lines.push("", "Selected Prints:", "----------------");
  for (const item of data.cartItems) {
    lines.push(
      `• ${item.title} — ${SIZE_LABELS[item.size]} — ${formatPrice(item.price)}`
    );
  }

  const total = buildCartTotal(data.cartItems);
  lines.push("", `Estimated Total: ${formatPrice(total)}`);

  return lines.join("\n");
}
