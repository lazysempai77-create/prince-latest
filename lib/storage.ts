// =============================================================================
// Cloudinary storage helper
// All image assets are stored in Cloudinary.
// Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in env.
// =============================================================================

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

// ---------------------------------------------------------------------------
// Public URL helpers
// ---------------------------------------------------------------------------

/**
 * Returns the full-resolution image URL for a given key.
 * - Keys starting with "assets/" are served from the Next.js public folder (local).
 * - All other keys are treated as Cloudinary public IDs.
 * Returns "" when neither source is configured or key is empty.
 */
export function getImageUrl(publicId: string): string {
  if (!publicId) return "";
  // Local public folder — used before images are uploaded to Cloudinary
  if (publicId.startsWith("assets/")) {
    return `/${publicId}`;
  }
  if (!CLOUD_NAME) return "";
  return `${UPLOAD_BASE}/${publicId}`;
}

/**
 * Returns a thumbnail URL.
 * - Local public-folder keys return the same path (no CDN transform available).
 * - Cloudinary keys get an on-demand 400×400 crop URL.
 */
export function getThumbnailUrl(publicId: string): string {
  if (!publicId) return "";
  if (publicId.startsWith("assets/")) {
    return `/${publicId}`;
  }
  if (!CLOUD_NAME) return "";
  return `${UPLOAD_BASE}/w_400,h_400,c_fill/${publicId}`;
}

// ---------------------------------------------------------------------------
// Public ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a clean, collision-resistant Cloudinary public ID.
 * Format: "prince-photography/<collection>/<timestamp>-<filename>"
 *
 * @example
 *   generateUploadKey("Mountain Dawn.jpg", "Nature")
 *   // → "prince-photography/nature/1704067200-mountain-dawn"
 */
export function generateUploadKey(filename: string, collection: string): string {
  const slugify = (s: string): string =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const collectionSlug = slugify(collection);
  const dotIndex = filename.lastIndexOf(".");
  const baseName = dotIndex !== -1 ? filename.slice(0, dotIndex) : filename;
  const slugName = slugify(baseName);
  const ts = Math.floor(Date.now() / 1000);

  return `prince-photography/${collectionSlug}/${ts}-${slugName}`;
}

// ---------------------------------------------------------------------------
// Signed upload
// ---------------------------------------------------------------------------

/**
 * Computes a Cloudinary SHA-256 upload signature.
 * Cloudinary signature: hex(SHA256(sorted_params_string + api_secret))
 */
async function signCloudinaryUpload(
  params: Record<string, string>,
  apiSecret: string
): Promise<string> {
  const sortedStr = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const toHash = sortedStr + apiSecret;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(toHash));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Uploads a file to Cloudinary using a signed request.
 * Returns the Cloudinary public_id of the uploaded asset.
 */
export async function uploadToCloudinary(
  file: File,
  publicId: string,
  apiKey: string,
  apiSecret: string
): Promise<string> {
  const timestamp = String(Math.floor(Date.now() / 1000));

  const signParams: Record<string, string> = {
    public_id: publicId,
    timestamp,
  };

  const signature = await signCloudinaryUpload(signParams, apiSecret);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("public_id", publicId);
  formData.append("timestamp", timestamp);
  formData.append("api_key", apiKey);
  formData.append("signature", signature);
  formData.append("signature_algorithm", "sha256");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${err}`);
  }

  const data = (await response.json()) as { public_id: string };
  return data.public_id;
}
