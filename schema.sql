-- =============================================================================
-- Prince Photography — D1 SQLite Schema
-- Deploy via: wrangler d1 execute prince-photography-db --file=schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- collections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  slug            TEXT    NOT NULL UNIQUE,
  description     TEXT,
  cover_image_key TEXT,                          -- R2 object key
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections (slug);

-- ---------------------------------------------------------------------------
-- prints
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prints (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id       INTEGER NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  title               TEXT    NOT NULL,
  description         TEXT,
  r2_key              TEXT    NOT NULL,          -- full-resolution R2 object key
  r2_thumbnail_key    TEXT,                      -- thumbnail R2 object key
  price_small         INTEGER NOT NULL DEFAULT 0,   -- 8×10  in cents
  price_medium        INTEGER NOT NULL DEFAULT 0,   -- 12×16 in cents
  price_large         INTEGER NOT NULL DEFAULT 0,   -- 16×20 in cents
  price_xlarge        INTEGER NOT NULL DEFAULT 0,   -- 20×30 in cents
  is_featured         INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_available        INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prints_collection_id ON prints (collection_id);
CREATE INDEX IF NOT EXISTS idx_prints_is_featured    ON prints (is_featured);
CREATE INDEX IF NOT EXISTS idx_prints_is_available   ON prints (is_available);
CREATE INDEX IF NOT EXISTS idx_prints_sort_order     ON prints (collection_id, sort_order);

-- Automatically update updated_at on row modification
CREATE TRIGGER IF NOT EXISTS trg_prints_updated_at
  AFTER UPDATE ON prints
  FOR EACH ROW
BEGIN
  UPDATE prints SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ---------------------------------------------------------------------------
-- inquiries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name   TEXT    NOT NULL,
  customer_email  TEXT    NOT NULL,
  customer_phone  TEXT,
  message         TEXT,
  cart_json       TEXT    NOT NULL DEFAULT '[]',  -- JSON array of {printId, title, size, price}
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'replied', 'completed')),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status       ON inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer_email ON inquiries (customer_email);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at   ON inquiries (created_at DESC);

-- ---------------------------------------------------------------------------
-- admin_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash  TEXT    NOT NULL UNIQUE,   -- SHA-256 hex of the raw JWT string
  expires_at  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- Seed data — 3 collections
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO collections (id, name, slug, description, cover_image_key) VALUES
  (1, 'Nature',   'nature',   'Landscapes and the natural world captured in stunning detail.',            'nature/covers/nature-cover.jpg'),
  (2, 'Wildlife', 'wildlife', 'Intimate portraits of animals in their natural habitats.',                 'wildlife/covers/wildlife-cover.jpg'),
  (3, 'Urban',    'urban',    'The geometry, light, and rhythm of cities around the world.',              'urban/covers/urban-cover.jpg');

-- ---------------------------------------------------------------------------
-- Seed data — 6 prints (2 per collection)
-- Prices in cents: small=4900, medium=7900, large=12900, xlarge=19900
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO prints (
  id, collection_id, title, description,
  r2_key, r2_thumbnail_key,
  price_small, price_medium, price_large, price_xlarge,
  is_featured, is_available, sort_order
) VALUES
  -- Nature prints
  (1, 1,
   'Mountain Dawn',
   'First light spills over the Rockies, painting the peaks in gold and amber.',
   'nature/mountain-dawn.jpg', 'nature/thumbs/mountain-dawn.jpg',
   4900, 7900, 12900, 19900,
   1, 1, 1),

  (2, 1,
   'Misty Waterfall',
   'A cascading waterfall shrouded in morning mist in the Pacific Northwest.',
   'nature/misty-waterfall.jpg', 'nature/thumbs/misty-waterfall.jpg',
   4900, 7900, 12900, 19900,
   0, 1, 2),

  -- Wildlife prints
  (3, 2,
   'Eagle in Flight',
   'A bald eagle banks sharply against a steel-blue winter sky.',
   'wildlife/eagle-in-flight.jpg', 'wildlife/thumbs/eagle-in-flight.jpg',
   5900, 8900, 13900, 21900,
   1, 1, 1),

  (4, 2,
   'Wolf Pack at Dusk',
   'Three wolves pause at the tree-line as the last light fades from the horizon.',
   'wildlife/wolf-pack-dusk.jpg', 'wildlife/thumbs/wolf-pack-dusk.jpg',
   5900, 8900, 13900, 21900,
   0, 1, 2),

  -- Urban prints
  (5, 3,
   'Neon Rain',
   'Tokyo at midnight — neon reflections dance on rain-soaked asphalt.',
   'urban/neon-rain.jpg', 'urban/thumbs/neon-rain.jpg',
   4900, 7900, 12900, 19900,
   1, 1, 1),

  (6, 3,
   'Steel and Glass',
   'The angular geometry of a downtown financial district at golden hour.',
   'urban/steel-and-glass.jpg', 'urban/thumbs/steel-and-glass.jpg',
   4900, 7900, 12900, 19900,
   0, 1, 2);
