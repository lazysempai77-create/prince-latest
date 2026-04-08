// =============================================================================
// GET /api/gallery
// Returns prints with collection info, optionally filtered by collection slug.
// Runs on the Cloudflare edge runtime (D1 access via getRequestContext).
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { getCloudflareContext }           from "@opennextjs/cloudflare";
import { getDB, getCollections, getPrints, getCollection, getFeaturedPrints } from "@/lib/db";
import { getImageUrl, getThumbnailUrl }   from "@/lib/storage";
import type { Env }                      from "@/types/cloudflare";

// Cache: edge caches the response for 60 s; serve stale for up to 5 min.
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

// ---------------------------------------------------------------------------
// Shape of each print returned by the gallery endpoint
// ---------------------------------------------------------------------------

interface GalleryPrint {
  id:                 number;
  title:              string;
  description:        string | null;
  imageUrl:           string;
  thumbnailUrl:       string | null;
  prices: {
    small:  number;
    medium: number;
    large:  number;
    xlarge: number;
  };
  isFeatured:         boolean;
  collection: {
    id:   number;
    name: string;
    slug: string;
  };
}

interface GalleryResponse {
  prints:      GalleryPrint[];
  collections: { id: number; name: string; slug: string; coverImageUrl: string | null }[];
  total:       number;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { env } = await getCloudflareContext<Env>({ async: true });
    const db  = getDB(env);

    const { searchParams } = new URL(request.url);
    const collectionSlug  = searchParams.get("collection");
    const featured        = searchParams.get("featured") === "true";
    const limitParam      = searchParams.get("limit");
    const limit           = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 100;

    // Resolve optional collection filter
    let collectionId: number | undefined;
    if (collectionSlug) {
      const col = await getCollection(db, collectionSlug);
      if (!col) {
        return NextResponse.json(
          { error: `Collection '${collectionSlug}' not found` },
          { status: 404, headers: { "Cache-Control": "no-store" } }
        );
      }
      collectionId = col.id;
    }

    // Fetch prints and all collections in parallel
    const [rawPrints, rawCollections] = await Promise.all([
      featured ? getFeaturedPrints(db) : getPrints(db, collectionId),
      getCollections(db),
    ]);

    // Map prints to response shape
    const prints: GalleryPrint[] = rawPrints.slice(0, limit).map((p) => ({
      id:           p.id,
      title:        p.title,
      description:  p.description,
      imageUrl:     getImageUrl(p.r2_key),
      thumbnailUrl: getThumbnailUrl(p.r2_key),
      prices: {
        small:  p.price_small,
        medium: p.price_medium,
        large:  p.price_large,
        xlarge: p.price_xlarge,
      },
      isFeatured: p.is_featured === 1,
      collection: {
        id:   p.collection_id,
        name: p.collection_name ?? "",
        slug: p.collection_slug ?? "",
      },
    }));

    // Map collections to response shape
    const collections = rawCollections.map((c) => ({
      id:            c.id,
      name:          c.name,
      slug:          c.slug,
      coverImageUrl: c.cover_image_key ? getImageUrl(c.cover_image_key) : null,
    }));

    const payload: GalleryResponse = {
      prints,
      collections,
      total: prints.length,
    };

    return NextResponse.json(payload, {
      status:  200,
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (err) {
    console.error("[gallery] Unhandled error:", err);
    const message = process.env.NODE_ENV === "development"
      ? String(err instanceof Error ? err.stack ?? err.message : err)
      : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
