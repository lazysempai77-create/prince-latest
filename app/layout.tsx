import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import '@/app/globals.css';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import { CartProvider } from '@/context/CartContext';

// =============================================================================
// Font loading via next/font/google
// Loaded at build time — zero layout shift, self-hosted via Next.js font system
// =============================================================================

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-body',
  display: 'swap',
});

// =============================================================================
// Site-wide metadata
// =============================================================================

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://princephoto.com',
  ),
  title: {
    template: '%s | Prince Photography',
    default: 'Prince Photography — Fine Art Nature Prints',
  },
  description:
    'Museum-quality fine art nature photography prints by Prince. Each piece is archival, signed, and numbered — crafted for the discerning collector.',
  keywords: [
    'fine art photography',
    'nature prints',
    'wildlife photography',
    'limited edition prints',
    'archival prints',
    'Prince Photography',
  ],
  authors: [{ name: 'Prince Photography' }],
  creator: 'Prince Photography',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Prince Photography',
    title: 'Prince Photography — Fine Art Nature Prints',
    description:
      'Museum-quality fine art nature photography prints. Archival, signed, and numbered — for the discerning collector.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Prince Photography — Fine Art Nature Prints',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prince Photography — Fine Art Nature Prints',
    description:
      'Museum-quality fine art nature photography prints. Archival, signed, and numbered.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
};

// =============================================================================
// Root Layout
// =============================================================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${inter.variable}`}
    >
      <body className="font-body bg-off-white text-dark antialiased">
        <CartProvider>
          {/* Skip-to-content link for keyboard / screen-reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-dark focus:text-off-white focus:rounded focus:text-sm focus:font-body focus:font-semibold"
          >
            Skip to main content
          </a>

          <Navbar />

          <main id="main-content" tabIndex={-1}>
            {children}
          </main>

          <CartDrawer />

          <footer className="bg-dark text-sand py-12 mt-24">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <p className="font-heading text-off-white text-xl mb-3">
                  Prince Photography
                </p>
                <p className="font-body font-light text-stone text-sm leading-relaxed">
                  Fine art nature photography prints for the discerning
                  collector. Every piece is museum-quality archival, signed,
                  and numbered.
                </p>
              </div>

              <nav aria-label="Footer navigation">
                <p className="font-body font-semibold text-xs tracking-widest uppercase text-stone mb-4">
                  Explore
                </p>
                <ul className="space-y-2">
                  {[
                    { href: '/shop', label: 'All Prints' },
                    { href: '/shop?collection=nature', label: 'Nature' },
                    { href: '/shop?collection=wildlife', label: 'Wildlife' },
                    { href: '/shop?collection=urban', label: 'Urban' },
                  ].map(({ href, label }) => (
                    <li key={href}>
                      <a
                        href={href}
                        className="font-body text-sm text-stone hover:text-sand transition-colors"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div>
                <p className="font-body font-semibold text-xs tracking-widest uppercase text-stone mb-4">
                  Contact
                </p>
                <p className="font-body text-sm text-stone leading-relaxed">
                  All prints are made-to-order. Inquiries are answered within
                  48 hours.
                </p>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-10 pt-6 border-t border-stone/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="font-body text-xs text-stone">
                &copy; {new Date().getFullYear()} Prince Photography. All rights
                reserved.
              </p>
              <p className="font-body text-xs text-stone">
                All images are original works. Reproduction prohibited.
              </p>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
