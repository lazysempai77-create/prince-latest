import type { Metadata } from 'next';
import type { Print, Collection } from '@/lib/db';
import Gallery from '@/components/Gallery';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

// =============================================================================
// Types
// =============================================================================

interface ShopPageProps {
  searchParams: Promise<{ collection?: string }>;
}

// API response shape (camelCase from /api/gallery)
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

// Map camelCase API shape → flat Print type consumed by Gallery / PrintCard
function mapApiPrint(p: GalleryApiPrint): Print {
  return {
    id: p.id,
    collection_id: p.collection.id,
    collection_name: p.collection.name,
    collection_slug: p.collection.slug,
    title: p.title,
    description: p.description,
    r2_key: p.imageUrl,
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

// =============================================================================
// Data fetching
// =============================================================================

async function getShopData(
  collectionSlug?: string,
): Promise<{ prints: Print[]; collections: Collection[] }> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

  const url = collectionSlug
    ? `${baseUrl}/api/gallery?collection=${encodeURIComponent(collectionSlug)}`
    : `${baseUrl}/api/gallery`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
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
    console.error('Failed to fetch shop data:', err);
    return { prints: [], collections: [] };
  }
}

// =============================================================================
// Dynamic metadata
// =============================================================================

export async function generateMetadata({
  searchParams,
}: ShopPageProps): Promise<Metadata> {
  const params = await searchParams;
  const collectionSlug = params.collection;

  if (!collectionSlug) {
    return {
      title: 'Shop All Prints',
      description:
        'Browse all fine art photography prints by Prince — nature, wildlife, and urban. Museum-quality, archival, signed, and numbered.',
      openGraph: {
        title: 'Shop All Prints | Prince Photography',
        description:
          'Browse all fine art photography prints — museum-quality, archival, signed, and numbered.',
      },
    };
  }

  const { collections } = await getShopData(collectionSlug);
  const col = collections.find((c) => c.slug === collectionSlug);
  const name = col?.name ?? capitalise(collectionSlug);
  const desc =
    col?.description ??
    `Browse ${name} fine art photography prints by Prince.`;

  return {
    title: `${name} Prints`,
    description: desc,
    openGraph: {
      title: `${name} Prints | Prince Photography`,
      description: desc,
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =============================================================================
// Page
// =============================================================================

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const collectionSlug = params.collection;
  const { prints, collections } = await getShopData(collectionSlug);

  const activeCollection = collectionSlug
    ? collections.find((c) => c.slug === collectionSlug)
    : null;

  const pageTitle = activeCollection?.name ?? 'All Prints';
  const pageDescription =
    activeCollection?.description ??
    'Every print is museum-quality archival, signed, and numbered.';

  return (
    <div className="min-h-screen bg-off-white">
      {/* ====================================================================
          Page Header
      ==================================================================== */}
      <div className="pt-32 pb-12 px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="max-w-2xl">
          <span className="block text-xs font-body font-semibold tracking-[0.2em] uppercase text-terra mb-3">
            {activeCollection ? activeCollection.name : 'Shop'}
          </span>
          <h1 className="font-heading text-dark">{pageTitle}</h1>
          <p className="font-body text-stone mt-4 text-lg leading-relaxed">
            {pageDescription}
          </p>
        </div>

        {/* Breadcrumb */}
        {activeCollection && (
          <nav
            aria-label="Breadcrumb"
            className="mt-6 flex items-center gap-2 text-sm font-body text-stone"
          >
            <a
              href="/shop"
              className="hover:text-dark transition-colors focus-visible:ring-2 focus-visible:ring-terra rounded"
            >
              All Prints
            </a>
            <span aria-hidden="true">/</span>
            <span className="text-dark font-medium" aria-current="page">
              {activeCollection.name}
            </span>
          </nav>
        )}

        {/* Collection filter pills — link-based, no JS required */}
        <div
          className="mt-8 flex flex-wrap gap-2"
          role="navigation"
          aria-label="Filter by collection"
        >
          <a
            href="/shop"
            aria-current={!collectionSlug ? 'page' : undefined}
            className={[
              'px-5 py-2 text-sm font-body font-semibold tracking-wide rounded-sm transition-all duration-200',
              !collectionSlug
                ? 'bg-dark text-off-white'
                : 'bg-cream text-stone hover:bg-sand hover:text-dark',
            ].join(' ')}
          >
            All
          </a>
          {collections.map((col) => (
            <a
              key={col.id}
              href={`/shop?collection=${col.slug}`}
              aria-current={collectionSlug === col.slug ? 'page' : undefined}
              className={[
                'px-5 py-2 text-sm font-body font-semibold tracking-wide rounded-sm transition-all duration-200',
                collectionSlug === col.slug
                  ? 'bg-dark text-off-white'
                  : 'bg-cream text-stone hover:bg-sand hover:text-dark',
              ].join(' ')}
            >
              {col.name}
            </a>
          ))}
        </div>
      </div>

      {/* ====================================================================
          Gallery
      ==================================================================== */}
      <div className="pb-24 px-6 lg:px-10 max-w-7xl mx-auto">
        {prints.length === 0 ? (
          <div className="py-24 text-center">
            <h2 className="font-heading text-stone text-3xl">No prints found</h2>
            <p className="font-body text-stone mt-3 text-lg">
              {activeCollection
                ? `No prints are currently available in the ${activeCollection.name} collection.`
                : 'No prints are currently available.'}
            </p>
            {activeCollection && (
              <a
                href="/shop"
                className="inline-block mt-6 px-6 py-3 bg-dark text-off-white font-body font-semibold text-sm tracking-widest uppercase rounded-sm hover:bg-terra transition-colors duration-200"
              >
                Browse All Prints
              </a>
            )}
          </div>
        ) : (
          <Gallery prints={prints} />
        )}
      </div>
    </div>
  );
}
