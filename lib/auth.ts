// =============================================================================
// JWT + crypto utilities — 100% Web Crypto API (edge-compatible)
// No Node.js `crypto` module is used; this runs on Cloudflare Workers / Pages.
// =============================================================================

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Encode an arbitrary object as a URL-safe Base64 string. */
function encodeBase64Url(data: ArrayBuffer | string): string {
  let bytes: Uint8Array;
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = new Uint8Array(data);
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Decode a URL-safe Base64 string to a UTF-8 string. */
function decodeBase64Url(str: string): string {
  // Re-pad
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const standard = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(standard);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Import a raw HMAC-SHA256 signing key from a string secret. */
async function importHmacKey(secret: string): Promise<CryptoKey> {
  const keyBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

const JWT_HEADER = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));

/**
 * Signs a JWT using HMAC-SHA256 with a 24-hour expiry.
 *
 * @param payload  - Arbitrary claims object; `iat` and `exp` are added automatically.
 * @param secret   - Signing secret (stored in JWT_SECRET env var).
 * @returns        A compact JWT string (header.payload.signature).
 */
export async function signJWT(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24, // 24 hours
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(claims));
  const signingInput   = `${JWT_HEADER}.${encodedPayload}`;

  const key       = await importHmacKey(secret);
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput)
  );

  const signature = encodeBase64Url(sigBuffer);
  return `${signingInput}.${signature}`;
}

/**
 * Verifies a JWT and returns its decoded payload.
 * Returns `null` if the token is malformed, the signature is invalid,
 * or the token has expired.
 *
 * @param token  - The raw JWT string.
 * @param secret - The same secret used to sign the token.
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    // Re-derive header to make sure it's HS256
    const header = JSON.parse(decodeBase64Url(encodedHeader)) as {
      alg: string;
      typ: string;
    };
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;

    // Verify signature
    const signingInput  = `${encodedHeader}.${encodedPayload}`;
    const sigBytes      = Uint8Array.from(
      atob(encodedSignature.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (encodedSignature.length % 4)) % 4)),
      (c) => c.charCodeAt(0)
    );

    const key   = await importHmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(signingInput)
    );

    if (!valid) return null;

    // Decode and check expiry
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as Record<
      string,
      unknown
    >;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) {
      return null; // expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts a JWT from a standard `Authorization: Bearer <token>` header value.
 * Returns `null` if the header is absent or malformed.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

// ---------------------------------------------------------------------------
// Token hashing (for session storage)
// ---------------------------------------------------------------------------

/**
 * Produces a SHA-256 hex digest of the provided token string.
 * Used to store session identifiers in D1 without keeping raw JWTs.
 *
 * @param token - The raw JWT (or any string) to hash.
 * @returns     Lowercase hex string (64 characters).
 */
export async function hashToken(token: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Password hashing (for admin password storage / verification)
// ---------------------------------------------------------------------------

/**
 * Derives a hex hash of a password using PBKDF2-SHA256.
 * Safe for storing admin credentials in D1.
 *
 * @param password - Plain-text password.
 * @param salt     - Random hex salt (generate once and store alongside the hash).
 * @returns        Hex string of the derived key.
 */
export async function hashPassword(
  password: string,
  salt: string
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name:       "PBKDF2",
      hash:       "SHA-256",
      salt:       new TextEncoder().encode(salt),
      iterations: 200_000,
    },
    keyMaterial,
    256 // bits
  );

  return Array.from(new Uint8Array(derived))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time comparison of two hex strings to prevent timing attacks.
 */
export async function safeCompare(a: string, b: string): Promise<boolean> {
  // No early-exit on length — that would leak info via timing.
  // Encode both strings and use `crypto.subtle.timingSafeEqual` via HMAC verify
  const enc   = new TextEncoder();
  const keyBuf = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  const sigA = await crypto.subtle.sign("HMAC", keyBuf, enc.encode(a));
  return crypto.subtle.verify("HMAC", keyBuf, sigA, enc.encode(b));
}

// ---------------------------------------------------------------------------
// Random token generator (for session IDs / CSRF tokens)
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically secure random hex token.
 * @param bytes - Number of random bytes (default: 32 → 64 hex chars).
 */
export function generateSecureToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
