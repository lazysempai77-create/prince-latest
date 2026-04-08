// =============================================================================
// R2 storage helper
// All image assets live in the `prince-photography-images` R2 bucket.
// Public access is served through a custom domain / Cloudflare R2 public URL.
// =============================================================================

// ---------------------------------------------------------------------------
// Public URL helper
// ---------------------------------------------------------------------------

/**
 * Constructs the public CDN URL for an R2 object.
 *
 * `NEXT_PUBLIC_R2_PUBLIC_URL` must be set (e.g. https://images.princephoto.com)
 * in both wrangler.toml [vars] and as a Cloudflare Pages environment variable.
 *
 * @example
 *   getImageUrl("nature/mountain-dawn.jpg")
 *   // → "https://images.princephoto.com/nature/mountain-dawn.jpg"
 */
export function getImageUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  if (!base) return ""; // no R2 configured — caller handles missing image

  // Ensure no double slashes between base URL and key
  const cleanBase = base.replace(/\/+$/, "");
  const cleanKey  = key.replace(/^\/+/, "");

  return `${cleanBase}/${cleanKey}`;
}

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

/**
 * Generates a clean, collision-resistant R2 object key.
 *
 * Rules applied:
 *  - Collection name is lower-cased and non-alphanumeric chars replaced with `-`
 *  - Filename is lower-cased, spaces → `-`, extension normalised to `.webp`
 *  - Unix timestamp (seconds) is prepended to the filename for uniqueness
 *
 * @example
 *   generateUploadKey("Mountain Dawn.jpg", "Nature")
 *   // → "nature/1704067200-mountain-dawn.webp"
 *
 * @example
 *   generateUploadKey("wolf pack at dusk.PNG", "Wildlife")
 *   // → "wildlife/1704067200-wolf-pack-at-dusk.webp"
 */
export function generateUploadKey(filename: string, collection: string): string {
  const slugify = (s: string): string =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const collectionSlug = slugify(collection);

  // Strip original extension and slugify the bare name
  const dotIndex  = filename.lastIndexOf(".");
  const baseName  = dotIndex !== -1 ? filename.slice(0, dotIndex) : filename;
  const slugName  = slugify(baseName);

  const ts = Math.floor(Date.now() / 1000);

  return `${collectionSlug}/${ts}-${slugName}.webp`;
}

/**
 * Generates a thumbnail key from a full-resolution key.
 * Thumbnail keys live under a `thumbs/` subdirectory within the same collection.
 *
 * @example
 *   generateThumbnailKey("nature/1704067200-mountain-dawn.webp")
 *   // → "nature/thumbs/1704067200-mountain-dawn.webp"
 */
export function generateThumbnailKey(fullKey: string): string {
  const lastSlash = fullKey.lastIndexOf("/");
  if (lastSlash === -1) {
    return `thumbs/${fullKey}`;
  }
  const dir      = fullKey.slice(0, lastSlash);
  const fileName = fullKey.slice(lastSlash + 1);
  return `${dir}/thumbs/${fileName}`;
}

// ---------------------------------------------------------------------------
// R2 object deletion
// ---------------------------------------------------------------------------

/**
 * Deletes a single object from R2.
 * Silently succeeds even if the key does not exist (R2 delete is idempotent).
 */
export async function deleteObject(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key);
}

/**
 * Deletes multiple objects from R2 in a single batch.
 * Silently skips keys that do not exist.
 */
export async function deleteObjects(
  bucket: R2Bucket,
  keys: string[]
): Promise<void> {
  if (keys.length === 0) return;
  // R2 Workers API supports deleting multiple keys by passing an array
  await bucket.delete(keys);
}

// ---------------------------------------------------------------------------
// R2 object metadata helper
// ---------------------------------------------------------------------------

/**
 * Checks whether a given key exists in the R2 bucket.
 * Uses `head()` to avoid fetching the full object body.
 */
export async function objectExists(
  bucket: R2Bucket,
  key: string
): Promise<boolean> {
  const head = await bucket.head(key);
  return head !== null;
}

// ---------------------------------------------------------------------------
// HTTP metadata builder
// ---------------------------------------------------------------------------

/**
 * Returns the correct R2 `httpMetadata` for an image upload,
 * derived from the uploaded file's MIME type.
 */
export function buildHttpMetadata(contentType: string): R2HTTPMetadata {
  return {
    contentType,
    cacheControl: "public, max-age=31536000, immutable",
  };
}
