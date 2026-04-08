// =============================================================================
// D1 database helper — typed query functions for the Prince Photography project
// =============================================================================

import type { Env } from "@/types/cloudflare";

// ---------------------------------------------------------------------------
// Domain types (mirror schema.sql exactly)
// ---------------------------------------------------------------------------

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  cover_image_key: string | null;
  created_at: string;
}

export interface Print {
  id: number;
  collection_id: number;
  title: string;
  description: string | null;
  r2_key: string;
  r2_thumbnail_key: string | null;
  /** 8×10 price in cents */
  price_small: number;
  /** 12×16 price in cents */
  price_medium: number;
  /** 16×20 price in cents */
  price_large: number;
  /** 20×30 price in cents */
  price_xlarge: number;
  /** SQLite stores booleans as 0|1 */
  is_featured: 0 | 1;
  is_available: 0 | 1;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined fields (present when fetched with collection info)
  collection_name?: string;
  collection_slug?: string;
}

export interface Inquiry {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  message: string | null;
  cart_json: string;
  status: "pending" | "replied" | "completed";
  created_at: string;
}

export interface AdminSession {
  id: number;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateInquiryInput {
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  message?: string | null;
  cart_json: string; // JSON-serialised CartItem[]
}

export interface CartItem {
  printId: number;
  title: string;
  size: "small" | "medium" | "large" | "xlarge";
  price: number; // in cents
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// DB accessor
// ---------------------------------------------------------------------------

/**
 * Returns the D1 database binding from the Cloudflare env.
 * Pass `getRequestContext().env` from an edge route.
 */
export function getDB(env: Env): D1Database {
  return env.DB;
}

// ---------------------------------------------------------------------------
// Collection queries
// ---------------------------------------------------------------------------

/**
 * Fetch all collections ordered by creation date (newest first).
 */
export async function getCollections(db: D1Database): Promise<Collection[]> {
  const result = await db
    .prepare(
      `SELECT id, name, slug, description, cover_image_key, created_at
       FROM   collections
       ORDER  BY created_at DESC`
    )
    .all<Collection>();

  return result.results ?? [];
}

/**
 * Fetch a single collection by its URL slug.
 * Returns null when not found.
 */
export async function getCollection(
  db: D1Database,
  slug: string
): Promise<Collection | null> {
  const result = await db
    .prepare(
      `SELECT id, name, slug, description, cover_image_key, created_at
       FROM   collections
       WHERE  slug = ?1
       LIMIT  1`
    )
    .bind(slug)
    .first<Collection>();

  return result ?? null;
}

// ---------------------------------------------------------------------------
// Print queries
// ---------------------------------------------------------------------------

/**
 * Fetch prints, optionally filtered by collection ID.
 * Results include joined collection name and slug.
 * Only available prints are returned (is_available = 1).
 */
export async function getPrints(
  db: D1Database,
  collectionId?: number
): Promise<Print[]> {
  const baseQuery = `
    SELECT p.id,
           p.collection_id,
           p.title,
           p.description,
           p.r2_key,
           p.r2_thumbnail_key,
           p.price_small,
           p.price_medium,
           p.price_large,
           p.price_xlarge,
           p.is_featured,
           p.is_available,
           p.sort_order,
           p.created_at,
           p.updated_at,
           c.name  AS collection_name,
           c.slug  AS collection_slug
    FROM   prints p
    JOIN   collections c ON c.id = p.collection_id
    WHERE  p.is_available = 1
  `;

  if (collectionId !== undefined) {
    const result = await db
      .prepare(`${baseQuery} AND p.collection_id = ?1 ORDER BY p.sort_order ASC, p.id ASC`)
      .bind(collectionId)
      .all<Print>();
    return result.results ?? [];
  }

  const result = await db
    .prepare(`${baseQuery} ORDER BY p.sort_order ASC, p.id ASC`)
    .all<Print>();
  return result.results ?? [];
}

/**
 * Fetch prints that are marked as featured (is_featured = 1).
 * Returns up to 12 results ordered by sort_order.
 */
export async function getFeaturedPrints(db: D1Database): Promise<Print[]> {
  const result = await db
    .prepare(
      `SELECT p.id,
              p.collection_id,
              p.title,
              p.description,
              p.r2_key,
              p.r2_thumbnail_key,
              p.price_small,
              p.price_medium,
              p.price_large,
              p.price_xlarge,
              p.is_featured,
              p.is_available,
              p.sort_order,
              p.created_at,
              p.updated_at,
              c.name  AS collection_name,
              c.slug  AS collection_slug
       FROM   prints p
       JOIN   collections c ON c.id = p.collection_id
       WHERE  p.is_featured  = 1
       AND    p.is_available = 1
       ORDER  BY p.sort_order ASC, p.id ASC
       LIMIT  12`
    )
    .all<Print>();

  return result.results ?? [];
}

/**
 * Fetch a single print by its ID.
 */
export async function getPrint(
  db: D1Database,
  id: number
): Promise<Print | null> {
  const result = await db
    .prepare(
      `SELECT p.id,
              p.collection_id,
              p.title,
              p.description,
              p.r2_key,
              p.r2_thumbnail_key,
              p.price_small,
              p.price_medium,
              p.price_large,
              p.price_xlarge,
              p.is_featured,
              p.is_available,
              p.sort_order,
              p.created_at,
              p.updated_at,
              c.name  AS collection_name,
              c.slug  AS collection_slug
       FROM   prints p
       JOIN   collections c ON c.id = p.collection_id
       WHERE  p.id = ?1
       LIMIT  1`
    )
    .bind(id)
    .first<Print>();

  return result ?? null;
}

// ---------------------------------------------------------------------------
// Inquiry mutations
// ---------------------------------------------------------------------------

/**
 * Insert a new inquiry record. Returns the newly created inquiry ID.
 */
export async function createInquiry(
  db: D1Database,
  data: CreateInquiryInput
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO inquiries
         (customer_name, customer_email, customer_phone, message, cart_json, status)
       VALUES (?1, ?2, ?3, ?4, ?5, 'pending')`
    )
    .bind(
      data.customer_name,
      data.customer_email,
      data.customer_phone ?? null,
      data.message ?? null,
      data.cart_json
    )
    .run();

  if (!result.success) {
    throw new Error("Failed to insert inquiry into D1");
  }

  // D1 returns the last inserted row ID via meta
  return result.meta.last_row_id as number;
}

/**
 * Update an inquiry's status.
 */
export async function updateInquiryStatus(
  db: D1Database,
  id: number,
  status: Inquiry["status"]
): Promise<void> {
  await db
    .prepare(`UPDATE inquiries SET status = ?1 WHERE id = ?2`)
    .bind(status, id)
    .run();
}

// ---------------------------------------------------------------------------
// Admin session helpers
// ---------------------------------------------------------------------------

/**
 * Store a new admin session (hashed JWT token + expiry).
 */
export async function createAdminSession(
  db: D1Database,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO admin_sessions (token_hash, expires_at)
       VALUES (?1, ?2)`
    )
    .bind(tokenHash, expiresAt.toISOString())
    .run();
}

/**
 * Verify that a token hash exists and has not expired.
 */
export async function isSessionValid(
  db: D1Database,
  tokenHash: string
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM admin_sessions
       WHERE  token_hash = ?1
       AND    expires_at > datetime('now')
       LIMIT  1`
    )
    .bind(tokenHash)
    .first<{ id: number }>();

  return row !== null;
}

/**
 * Remove expired sessions (call periodically from a scheduled Worker or cron).
 */
export async function purgeExpiredSessions(db: D1Database): Promise<void> {
  await db
    .prepare(`DELETE FROM admin_sessions WHERE expires_at <= datetime('now')`)
    .run();
}

// ---------------------------------------------------------------------------
// Print size utilities — shared between components and API
// ---------------------------------------------------------------------------

export type PrintSize = "small" | "medium" | "large" | "xlarge";

export const PRINT_SIZE_LABELS: Record<PrintSize, string> = {
  small:  '8×10"',
  medium: '12×16"',
  large:  '16×20"',
  xlarge: '20×30"',
};

export const PRINT_SIZES: PrintSize[] = ["small", "medium", "large", "xlarge"];

/**
 * Return the price in cents for the given size variant of a print.
 */
export function priceForSize(
  print: Pick<Print, "price_small" | "price_medium" | "price_large" | "price_xlarge">,
  size: PrintSize,
): number {
  const map: Record<PrintSize, number> = {
    small:  print.price_small,
    medium: print.price_medium,
    large:  print.price_large,
    xlarge: print.price_xlarge,
  };
  return map[size];
}

/**
 * Format a cent amount as a USD string — e.g. 4900 → "$49.00"
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
