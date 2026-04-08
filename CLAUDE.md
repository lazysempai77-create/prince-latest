# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (localhost)
npm run build        # Standard Next.js production build
npm run cf:build     # Build for Cloudflare Pages (via opennextjs-cloudflare)
npm run cf:dev       # Dev server using wrangler (simulates Cloudflare edge)
npm run cf:deploy    # Deploy to Cloudflare Pages via wrangler
```

No test or lint scripts are configured.

**Database migrations:**
```bash
wrangler d1 execute prince-photography-db --file=schema.sql
```

## Architecture

This is a **Next.js 15 photography portfolio and print-shop** deployed on **Cloudflare Pages + Workers** via the `opennextjs-cloudflare` adapter.

### Layers

```
Browser → Next.js Edge Middleware (middleware.ts)
        → Next.js Route Handlers (app/api/*)    ← all edge runtime
        → lib/db.ts (Cloudflare D1 / SQLite)
        → lib/auth.ts, lib/email.ts, lib/storage.ts
```

**Edge runtime everywhere.** All API routes and middleware run on Cloudflare's edge, not Node.js. This means:
- Use `getCloudflareContext()` from `@opennextjs/cloudflare` to access env bindings (`DB`, secrets) — never `process.env` in route handlers.
- No Node.js `crypto` module. All cryptography is done via `crypto.subtle.*` (Web Crypto API) in `lib/auth.ts`.
- `next: { revalidate }` is silently ignored on edge — use `cache: 'no-store'` instead.

### Key API Routes

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/gallery` | GET | Fetch prints + collections | Public |
| `/api/inquiry` | POST | Submit print inquiry + cart | Turnstile CAPTCHA |
| `/api/upload` | POST | Admin image upload to Cloudinary | JWT |

### Auth Flow

- Admin login issues a **HMAC-SHA256 JWT** (24h expiry) signed with `JWT_SECRET`.
- The token is stored as a cookie (`admin_token`) and also sent as `Authorization: Bearer`.
- `middleware.ts` validates the JWT on every `/admin/*` request before the route handler runs.
- Session token hashes (SHA-256) are stored in D1 `admin_sessions` — raw JWTs are never persisted.
- Password hashing uses PBKDF2-SHA256 with 200,000 iterations.

### Database (Cloudflare D1 / SQLite)

Schema lives in `schema.sql`. Key tables: `collections`, `prints`, `inquiries`, `admin_sessions`.

- Prices are stored in **cents** (integers). `lib/db.ts` exports helpers like `priceForSize()`.
- Print sizes: `small` (8×10"), `medium` (12×16"), `large` (16×20"), `xlarge` (20×30"). The `PRINT_SIZE_LABELS` map in `lib/db.ts` is the single source of truth — `lib/email.ts` and `workers/email-worker.ts` have their own copies that must stay in sync.
- Soft-delete via `is_available` flag; no hard deletes on prints.
- Cart state is serialized as JSON into the `inquiries` table.
- All queries in `lib/db.ts` use SQLite positional parameters (`?1`, `?2`, …).

### Image Storage

Cloudinary is the active storage layer (`lib/storage.ts`). Uploads are signed server-side with a SHA-256 HMAC using `CLOUDINARY_API_SECRET` before the client posts directly to Cloudinary. `lib/r2.ts` is legacy/unused.

### Cart

The cart is managed by `context/CartContext.tsx` (React context + localStorage). `hooks/useCart.ts` exists only for the exported `CartItem` type — the `useCart()` function was removed. All components must use `useCartContext()` from `CartContext`.

### Email

`lib/email.ts` sends via Resend. `workers/email-worker.ts` is a standalone Cloudflare Worker (deployed separately) that sends via MailChannels with Resend as fallback. Both build HTML emails with user-supplied data — always use `escapeHtml()` before interpolating any user value into HTML strings.

## Environment / Bindings

Local dev uses `.env.local`. Cloudflare environments are in `wrangler.toml` (three: default, `preview`, `production`).

**Required secrets** (set via `wrangler secret put`):
- `JWT_SECRET` — admin JWT signing key
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile
- `RESEND_API_KEY` — Resend email
- `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — image uploads

**D1 binding:** `DB` → `prince-photography-db`
