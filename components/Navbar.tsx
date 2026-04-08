'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useCartContext } from '@/context/CartContext';

// =============================================================================
// Component
// =============================================================================

export default function Navbar() {
  const { itemCount, lastAdded, openCart } = useCartContext();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartIconRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Scroll-based background transition
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cart icon pulse when an item is added
  useEffect(() => {
    if (!lastAdded || !cartIconRef.current) return;
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) return;

    gsap.fromTo(
      cartIconRef.current,
      { scale: 1 },
      {
        scale: 1.3,
        duration: 0.2,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          gsap.set(cartIconRef.current, { scale: 1 });
        },
      },
    );
  }, [lastAdded]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navLinks = [
    { href: '/shop', label: 'Shop' },
    { href: '/shop?collection=nature', label: 'Nature' },
    { href: '/shop?collection=wildlife', label: 'Wildlife' },
    { href: '/shop?collection=urban', label: 'Urban' },
  ];

  return (
    <header
      ref={navRef}
      className={[
        'fixed top-0 left-0 right-0 z-40 transition-all duration-500',
        scrolled
          ? 'bg-off-white/95 backdrop-blur-md shadow-sm'
          : 'bg-transparent',
      ].join(' ')}
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="font-heading text-dark text-xl tracking-tight hover:text-terra transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-terra rounded"
          aria-label="Prince Photography — home"
        >
          Prince
        </Link>

        {/* Desktop links */}
        <ul
          className="hidden md:flex items-center gap-8"
          role="list"
        >
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="font-body text-sm font-medium text-stone hover:text-dark transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-terra after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 focus-visible:ring-2 focus-visible:ring-terra rounded"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Cart button */}
          <button
            ref={cartIconRef}
            onClick={openCart}
            aria-label={`Open cart — ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
            className="relative p-2 text-dark hover:text-terra transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-terra rounded"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>

            {/* Badge */}
            {itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-terra text-white text-[10px] font-body font-bold"
                aria-hidden="true"
              >
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-dark hover:text-terra transition-colors focus-visible:ring-2 focus-visible:ring-terra rounded"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="md:hidden bg-off-white/98 backdrop-blur-md border-t border-cream px-6 py-6 animate-fade-up"
          role="menu"
          aria-label="Mobile navigation"
        >
          <ul className="space-y-4" role="list">
            {navLinks.map(({ href, label }) => (
              <li key={href} role="none">
                <Link
                  href={href}
                  role="menuitem"
                  className="block font-body font-medium text-dark hover:text-terra transition-colors py-1 focus-visible:ring-2 focus-visible:ring-terra rounded"
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
