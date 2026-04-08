-- =============================================================================
-- Prince Photography — Real Photo Seed Data
-- Syncs 24 photos from public/assets/photos/ into D1 database
-- Deploy via: wrangler d1 execute prince-database --file=seed-photos.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Clear old placeholder data
-- ---------------------------------------------------------------------------
DELETE FROM prints;
DELETE FROM collections;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('prints', 'collections');

-- ---------------------------------------------------------------------------
-- Collections (3: Wildlife, Nature, Birds)
-- ---------------------------------------------------------------------------
INSERT INTO collections (id, name, slug, description, cover_image_key) VALUES
  (1, 'Wildlife',  'wildlife',  'Intimate portraits of animals in their natural habitats — from majestic lions to golden elk resting in morning mist.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM.jpeg'),

  (2, 'Nature',    'nature',    'Sweeping landscapes and serene wilderness captured across America''s most breathtaking vistas.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.15 AM (1).jpeg'),

  (3, 'Birds',     'birds',     'Stunning close-up portraits of birds in flight, at rest, and in action — every feather frozen in time.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (1).jpeg');

-- ---------------------------------------------------------------------------
-- Prints — Wildlife collection (collection_id = 1)
-- ---------------------------------------------------------------------------
INSERT INTO prints (
  collection_id, title, description,
  r2_key, r2_thumbnail_key,
  price_small, price_medium, price_large, price_xlarge,
  is_featured, is_available, sort_order
) VALUES
  -- Seagull taking off
  (1,
   'Seagull Ascent',
   'A ring-billed gull skims the water''s surface, wings fully extended as it launches skyward. Every feather rendered in exquisite detail against the dark rippling water.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM.jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM.jpeg',
   4900, 7900, 12900, 19900, 1, 1, 1),

  -- Elk in golden mist
  (1,
   'Golden Reverie',
   'A bull elk rests in a sun-drenched forest, its magnificent antlers silhouetted against a warm amber haze. A transcendent moment of stillness in the wild.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.17 AM (2).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.17 AM (2).jpeg',
   5900, 8900, 14900, 22900, 1, 1, 2),

  -- Elk by the river
  (1,
   'Autumn Solitude',
   'A lone elk stands at the edge of a still river, surrounded by golden autumn grasses and the deep shadow of a pine forest. Peak fall color frames this timeless scene.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.15 AM (2).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.15 AM (2).jpeg',
   5900, 8900, 14900, 22900, 1, 1, 3),

  -- Lion on rock
  (1,
   'King''s Repose',
   'A magnificent male lion rests upon a stone ledge, his golden mane catching the light as he surveys his domain with quiet authority.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.15 AM.jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.15 AM.jpeg',
   5900, 8900, 14900, 22900, 1, 1, 4),

  -- Mallard duck
  (1,
   'Emerald Drake',
   'A male mallard glides across dark water, its iridescent emerald head shimmering with jewel-like brilliance. A masterclass in nature''s colour palette.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (1).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (1).jpeg',
   4900, 7900, 12900, 19900, 0, 1, 5),

  -- Additional wildlife 1
  (1,
   'Wetland Watch',
   'A wildlife portrait capturing the raw energy and quiet patience of nature''s most skilled hunters in their element.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (2).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (2).jpeg',
   4900, 7900, 12900, 19900, 0, 1, 6),

  -- Additional wildlife 2
  (1,
   'Nature''s Gaze',
   'An intimate moment with one of North America''s most compelling wildlife subjects, captured with striking clarity and emotional depth.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (3).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (3).jpeg',
   4900, 7900, 12900, 19900, 0, 1, 7),

  -- Additional wildlife 3
  (1,
   'Wild Stillness',
   'A fleeting moment of perfect stillness in the wild — where light, subject, and environment align in rare harmony.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (4).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (4).jpeg',
   4900, 7900, 12900, 19900, 0, 1, 8),

  -- Additional wildlife 4
  (1,
   'The Hunt',
   'A riveting display of animal instinct — power, precision, and purpose distilled into a single unforgettable frame.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (5).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (5).jpeg',
   5900, 8900, 14900, 22900, 0, 1, 9),

  -- Additional wildlife 5
  (1,
   'Twilight Creature',
   'As dusk settles, a wild subject emerges from shadow — a moody, atmospheric portrait that blurs the line between nature and art.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (6).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (6).jpeg',
   4900, 7900, 12900, 19900, 0, 1, 10),

  -- Additional wildlife 6
  (1,
   'Morning Encounter',
   'The quiet magic of an early morning encounter with one of nature''s most photogenic subjects, bathed in soft golden-hour light.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (7).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.44 AM (7).jpeg',
   4900, 7900, 12900, 19900, 0, 1, 11);

-- ---------------------------------------------------------------------------
-- Prints — Nature / Landscape collection (collection_id = 2)
-- ---------------------------------------------------------------------------
INSERT INTO prints (
  collection_id, title, description,
  r2_key, r2_thumbnail_key,
  price_small, price_medium, price_large, price_xlarge,
  is_featured, is_available, sort_order
) VALUES
  -- Rocky Mountain panorama
  (2,
   'Rocky Mountain Panorama',
   'A sweeping panoramic view across a broad mountain valley in the Rockies — forested ridgelines, open meadows, and jagged peaks stretching to the horizon under a vast blue sky.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.15 AM (1).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.15 AM (1).jpeg',
   5900, 9900, 15900, 24900, 1, 1, 1),

  -- Landscape 2
  (2,
   'Valley Light',
   'Golden afternoon light floods a pristine mountain valley, illuminating the patchwork of meadow and forest below the treeline. A landscape of extraordinary scale and beauty.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.16 AM.jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.16 AM.jpeg',
   5900, 9900, 15900, 24900, 0, 1, 2),

  -- Landscape 3
  (2,
   'Wilderness Edge',
   'Where civilization ends and the wild begins — a dramatic landscape portrait capturing the raw, untamed beauty of America''s great open spaces.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.17 AM.jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.17 AM.jpeg',
   5900, 9900, 15900, 24900, 0, 1, 3),

  -- Landscape 4
  (2,
   'High Country Dusk',
   'The last glow of day clings to high-elevation terrain as shadows deepen across an alpine wilderness. Rich, layered tones of amber and blue define the hour.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.18 AM.jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.18 AM.jpeg',
   5900, 9900, 15900, 24900, 0, 1, 4),

  -- Landscape 5
  (2,
   'Still Waters',
   'A mirror-calm body of water reflects the surrounding wilderness in perfect symmetry. Stillness captured at its most profound.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.18 AM (1).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.18 AM (1).jpeg',
   4900, 7900, 12900, 19900, 0, 1, 5),

  -- Landscape 6
  (2,
   'Forest Passage',
   'Light filters through a stand of ancient trees, casting dappled shadows across the forest floor. An immersive portrait of wilderness in its most elemental form.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.18 AM (2).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.18 AM (2).jpeg',
   4900, 7900, 12900, 19900, 0, 1, 6),

  -- Landscape 7
  (2,
   'Golden Hour Vista',
   'The golden hour transforms an already spectacular landscape into something otherworldly — warm tones suffusing every rock, tree, and ridge in liquid amber.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.19 AM.jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.19 AM.jpeg',
   5900, 9900, 15900, 24900, 0, 1, 7),

  -- Landscape 8
  (2,
   'Open Range',
   'An expansive view of untouched wilderness stretching to distant mountains — a landscape of freedom, solitude, and infinite possibility.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.19 AM (1).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.19 AM (1).jpeg',
   5900, 9900, 15900, 24900, 0, 1, 8),

  -- Landscape 9
  (2,
   'Ridgeline',
   'A dramatic ridgeline cuts across the sky — bold, angular, and timeless. This is the American West distilled to its essential geometry.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.19 AM (2).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.19 AM (2).jpeg',
   5900, 9900, 15900, 24900, 0, 1, 9);

-- ---------------------------------------------------------------------------
-- Prints — Birds collection (collection_id = 3)
-- ---------------------------------------------------------------------------
INSERT INTO prints (
  collection_id, title, description,
  r2_key, r2_thumbnail_key,
  price_small, price_medium, price_large, price_xlarge,
  is_featured, is_available, sort_order
) VALUES
  -- Red-winged blackbird on cattail
  (3,
   'Red-Wing Perch',
   'A vivid red-winged blackbird clings to a cattail stem against a soft bokeh of green marshland. The bird''s scarlet epaulet blazes against jet-black plumage in this stunning close-up.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.16 AM (1).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.16 AM (1).jpeg',
   4900, 7900, 12900, 19900, 1, 1, 1),

  -- American robin in snow
  (3,
   'Winter Robin',
   'An American robin, puffed against the cold, forages among bare branches as snow falls softly around it. Orange breast glowing warm against a monochrome winter world.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.16 AM (2).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.16 AM (2).jpeg',
   4900, 7900, 12900, 19900, 1, 1, 2),

  -- Eastern bluebird on branch
  (3,
   'Bluebird Vigil',
   'An Eastern bluebird rests on a bare winter branch against a cool blue sky, its rust-orange chest and cobalt-blue wings creating a palette of extraordinary beauty.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.16 AM (3).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.16 AM (3).jpeg',
   4900, 7900, 12900, 19900, 1, 1, 3),

  -- Bird in flight 1
  (3,
   'Wings Over Water',
   'A bird captured mid-flight over a shimmering body of water — motion and grace frozen in a single decisive moment.',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.17 AM (1).jpeg',
   'assets/photos/WhatsApp Image 2026-03-30 at 10.14.17 AM (1).jpeg',
   4900, 7900, 12900, 19900, 0, 1, 4);
