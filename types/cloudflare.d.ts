// =============================================================================
// Cloudflare runtime environment bindings
// Consumed by Next.js routes via getCloudflareContext() from @opennextjs/cloudflare
// =============================================================================

export interface Env {
  // D1 database
  DB: D1Database;

  // Resend transactional email API key
  RESEND_API_KEY: string;

  // Secret used to sign/verify admin JWTs (min 32 chars recommended)
  JWT_SECRET: string;

  // Cloudflare Turnstile server-side secret key
  TURNSTILE_SECRET_KEY: string;

  // Cloudinary credentials for image storage
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;

  // Admin email address — receives inquiry notifications
  ADMIN_EMAIL: string;

  // From address used in outgoing emails
  FROM_EMAIL: string;
}

declare global {
  type CloudflareEnv = Env;
}
