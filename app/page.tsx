import type { Metadata } from 'next';
import type { Print, Collection } from '@/lib/db';
import Hero from '@/components/Hero';
import Gallery from '@/components/Gallery';
import MagneticButton from '@/components/MagneticButton';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: 'Fine Art Nature Photography Prints',
  description:
    'Museum-quality fine art photography prints by Prince. Nature, wildlife, and urban — archival, signed, and numbered.',
};

// =============================================================================
// API response types (as returned by /api/gallery)
// =============================================================================

interface GalleryApiPrint {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  prices: { small: number; medium: number; large: number; xlarge: number };
  isFeatured: boolean;
  collection: { id: number; name: string; slug: string };
}

interface GalleryApiCollection {
  id: number;
  name: string;
  slug: string;
  coverImageUrl: string | null;
}

interface GalleryApiResponse {
  prints: GalleryApiPrint[];
  collections: GalleryApiCollection[];
  total: number;
}

// Map the API shape to the Print type consumed by components
function mapApiPrint(p: GalleryApiPrint): Print {
  return {
    id: p.id,
    collection_id: p.collection.id,
    collection_name: p.collection.name,
    collection_slug: p.collection.slug,
    title: p.title,
    description: p.description,
    r2_key: p.imageUrl,       // already a fully-qualified URL from the API
    r2_thumbnail_key: p.thumbnailUrl,
    price_small: p.prices.small,
    price_medium: p.prices.medium,
    price_large: p.prices.large,
    price_xlarge: p.prices.xlarge,
    is_featured: p.isFeatured ? 1 : 0,
    is_available: 1,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  };
}

function mapApiCollection(c: GalleryApiCollection): Collection {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: null,
    cover_image_key: c.coverImageUrl,
    created_at: '',
  };
}

async function getFeaturedData(): Promise<{ prints: Print[]; collections: Collection[] }> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

  try {
    const res = await fetch(`${baseUrl}/api/gallery?featured=true`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`Gallery API responded with ${res.status}`);
      return { prints: [], collections: [] };
    }

    const data = await res.json() as GalleryApiResponse;
    return {
      prints: data.prints.map(mapApiPrint),
      collections: data.collections.map(mapApiCollection),
    };
  } catch (err) {
    console.error('Failed to fetch gallery data:', err);
    return { prints: [], collections: [] };
  }
}

// =============================================================================
// Featured Collections Section
// =============================================================================

function FeaturedCollections({ collections }: { collections: Collection[] }) {
  if (collections.length === 0) return null;

  return (
    <section
      id="featured"
      className="py-20 px-6 lg:px-10 max-w-7xl mx-auto"
      aria-labelledby="collections-heading"
    >
      <div className="mb-12">
        <span className="block text-xs font-body font-semibold tracking-[0.2em] uppercase text-terra mb-3">
          Collections
        </span>
        <h2 id="collections-heading" className="font-heading text-dark">
          Explore the Series
        </h2>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="scroll-row"
        role="list"
        aria-label="Photography collections"
      >
        {collections.map((col) => (
          <a
            key={col.id}
            href={`/shop?collection=${col.slug}`}
            role="listitem"
            aria-label={`View ${col.name} collection`}
            className="group relative w-72 flex-shrink-0 rounded-sm overflow-hidden bg-cream block focus-visible:ring-2 focus-visible:ring-terra"
          >
            {/* Collection image */}
            <div className="relative h-80 overflow-hidden">
              {col.cover_image_key ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={col.cover_image_key}
                  alt={`${col.name} collection cover`}
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sand to-stone" />
              )}

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgba(26,26,26,0.75) 0%, transparent 55%)',
                }}
                aria-hidden="true"
              />
            </div>

            {/* Label */}
            <div className="absolute bottom-0 inset-x-0 p-5">
              <p className="font-heading text-white text-xl leading-tight">
                {col.name}
              </p>
              {col.description && (
                <p className="font-body text-white/70 text-xs mt-1 line-clamp-2">
                  {col.description}
                </p>
              )}
              <span className="inline-block mt-3 text-xs font-body font-semibold tracking-widest uppercase text-terra">
                View Collection →
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// Commission CTA Section
// =============================================================================

function CommissionSection() {
  return (
    <section
      className="py-24 px-6 lg:px-10 bg-dark"
      aria-labelledby="commission-heading"
    >
      <div className="max-w-3xl mx-auto text-center">
        <span className="block text-xs font-body font-semibold tracking-[0.2em] uppercase text-terra mb-4">
          Bespoke Work
        </span>
        <h2
          id="commission-heading"
          className="font-heading text-off-white mb-6"
        >
          Commission a Print
        </h2>
        <p className="font-body font-light text-stone text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Looking for a specific location, subject, or format? Commission a
          custom fine art print tailored precisely to your vision and space.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <MagneticButton
            href="/shop"
            variant="primary"
            aria-label="Browse all available prints"
          >
            Browse Prints
          </MagneticButton>
          <MagneticButton
            href="mailto:hello@princephoto.com"
            variant="outline"
            className="!text-off-white !border-off-white hover:!bg-off-white hover:!text-dark"
            aria-label="Email us about a commission"
          >
            Enquire Now
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Page
// =============================================================================

export default async function HomePage() {
  const { prints, collections } = await getFeaturedData();

  // Use first featured print for the hero, or a fallback placeholder
  // r2_key here is already a fully-qualified URL (mapped from imageUrl in the API response)
  const heroImage =
    prints.length > 0
      ? (prints[0].r2_thumbnail_key ?? prints[0].r2_key)
      : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80';

  const heroAlt =
    prints.length > 0
      ? `${prints[0].title} — featured fine art print`
      : 'Fine art nature photography by Prince';

  return (
    <>
      {/* Hero */}
      <Hero featuredImageUrl={heroImage} featuredImageAlt={heroAlt} />

      {/* Featured Collections horizontal scroll */}
      <FeaturedCollections collections={collections} />

      {/* Featured Prints masonry gallery */}
      {prints.length > 0 && (
        <section
          className="py-20 px-6 lg:px-10 max-w-7xl mx-auto"
          aria-labelledby="featured-prints-heading"
        >
          <div className="mb-12">
            <span className="block text-xs font-body font-semibold tracking-[0.2em] uppercase text-terra mb-3">
              Selected Works
            </span>
            <h2
              id="featured-prints-heading"
              className="font-heading text-dark"
            >
              Featured Prints
            </h2>
          </div>
          <Gallery prints={prints} />
        </section>
      )}

      {/* Commission CTA */}
      <CommissionSection />
    </>
  );
}
