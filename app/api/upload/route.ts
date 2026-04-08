// =============================================================================
// POST /api/upload
// Admin-only image upload: uploads file to Cloudinary, records print in D1.
// Protected by JWT — must supply `Authorization: Bearer <token>` header.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { getCloudflareContext }           from "@opennextjs/cloudflare";
import { verifyJWT, extractBearerToken }  from "@/lib/auth";
import { generateUploadKey, uploadToCloudinary, getImageUrl, getThumbnailUrl } from "@/lib/storage";
import { getDB }                          from "@/lib/db";
import type { Env }                       from "@/types/cloudflare";

// Max allowed upload size: 25 MB
const MAX_BYTES = 25 * 1024 * 1024;

// Accepted MIME types for print images
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
]);

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // -------------------------------------------------------------------------
  // Auth — verify JWT before doing anything else
  // -------------------------------------------------------------------------
  const { env } = await getCloudflareContext<Env>({ async: true });

  const authHeader = request.headers.get("Authorization");
  const token      = extractBearerToken(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("[upload] JWT_SECRET is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  // -------------------------------------------------------------------------
  // Check Cloudinary config
  // -------------------------------------------------------------------------
  if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    console.error("[upload] CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // -------------------------------------------------------------------------
  // Parse multipart form data
  // -------------------------------------------------------------------------
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data" },
      { status: 400 }
    );
  }

  // Required form fields
  const file         = formData.get("file");
  const collection   = formData.get("collection");
  const title        = formData.get("title");
  const collectionId = formData.get("collectionId");

  // Optional metadata fields
  const description  = formData.get("description");
  const priceSm      = formData.get("price_small");
  const priceMd      = formData.get("price_medium");
  const priceLg      = formData.get("price_large");
  const priceXl      = formData.get("price_xlarge");
  const isFeatured   = formData.get("is_featured");
  const sortOrder    = formData.get("sort_order");

  // -------------------------------------------------------------------------
  // Validate form fields
  // -------------------------------------------------------------------------
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field is required" }, { status: 422 });
  }
  if (typeof collection !== "string" || collection.trim().length === 0) {
    return NextResponse.json({ error: "collection field is required" }, { status: 422 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title field is required" }, { status: 422 });
  }
  if (typeof collectionId !== "string" || isNaN(parseInt(collectionId, 10))) {
    return NextResponse.json({ error: "collectionId must be a numeric string" }, { status: 422 });
  }

  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${contentType}. Allowed: JPEG, PNG, WebP, TIFF` },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: 25 MB` },
      { status: 413 }
    );
  }

  // -------------------------------------------------------------------------
  // Upload to Cloudinary
  // -------------------------------------------------------------------------
  const publicId = generateUploadKey(file.name, collection.trim());

  let uploadedPublicId: string;
  try {
    uploadedPublicId = await uploadToCloudinary(
      file,
      publicId,
      env.CLOUDINARY_API_KEY,
      env.CLOUDINARY_API_SECRET
    );
  } catch (err) {
    console.error("[upload] Cloudinary upload failed:", err);
    return NextResponse.json(
      { error: "Failed to store image. Please try again." },
      { status: 500 }
    );
  }

  // -------------------------------------------------------------------------
  // Insert print record into D1
  // -------------------------------------------------------------------------
  const db = getDB(env);

  const parsedCollectionId = parseInt(collectionId, 10);
  const parsedPriceSm      = priceSm  ? parseInt(String(priceSm),  10) : 4900;
  const parsedPriceMd      = priceMd  ? parseInt(String(priceMd),  10) : 7900;
  const parsedPriceLg      = priceLg  ? parseInt(String(priceLg),  10) : 12900;
  const parsedPriceXl      = priceXl  ? parseInt(String(priceXl),  10) : 19900;
  const parsedFeatured     = isFeatured === "true" || isFeatured === "1" ? 1 : 0;
  const parsedSortOrder    = sortOrder ? parseInt(String(sortOrder), 10) : 0;

  let printId: number;
  try {
    const result = await db
      .prepare(
        `INSERT INTO prints
           (collection_id, title, description, r2_key, r2_thumbnail_key,
            price_small, price_medium, price_large, price_xlarge,
            is_featured, is_available, sort_order)
         VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, ?9, 1, ?10)`
      )
      .bind(
        parsedCollectionId,
        title.trim(),
        typeof description === "string" ? description.trim() || null : null,
        uploadedPublicId,
        parsedPriceSm,
        parsedPriceMd,
        parsedPriceLg,
        parsedPriceXl,
        parsedFeatured,
        parsedSortOrder
      )
      .run();

    if (!result.success) {
      throw new Error("D1 insert returned success=false");
    }

    printId = result.meta.last_row_id as number;
  } catch (err) {
    console.error("[upload] D1 insert failed:", err);
    return NextResponse.json(
      { error: "Failed to save print metadata. Please try again." },
      { status: 500 }
    );
  }

  // -------------------------------------------------------------------------
  // Return the newly created print
  // -------------------------------------------------------------------------
  return NextResponse.json(
    {
      success: true,
      print: {
        id:           printId,
        collectionId: parsedCollectionId,
        title:        title.trim(),
        publicId:     uploadedPublicId,
        imageUrl:     getImageUrl(uploadedPublicId),
        thumbnailUrl: getThumbnailUrl(uploadedPublicId),
        prices: {
          small:  parsedPriceSm,
          medium: parsedPriceMd,
          large:  parsedPriceLg,
          xlarge: parsedPriceXl,
        },
        isFeatured:  parsedFeatured === 1,
        isAvailable: true,
        sortOrder:   parsedSortOrder,
      },
    },
    { status: 201 }
  );
}
