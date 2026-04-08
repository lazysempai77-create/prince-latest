'use client';

import React, { useRef, useLayoutEffect } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MagneticButton from '@/components/MagneticButton';

gsap.registerPlugin(ScrollTrigger);

// =============================================================================
// Types
// =============================================================================

interface HeroProps {
  featuredImageUrl: string;
  featuredImageAlt: string;
}

// =============================================================================
// Component
// =============================================================================

export default function Hero({ featuredImageUrl, featuredImageAlt }: HeroProps) {
  const containerRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const imagePanelRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    // Respect prefers-reduced-motion — skip heavy animation setup
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const ctx = gsap.context(() => {
      if (prefersReduced) {
        // Just make everything visible instantly
        gsap.set(
          [headlineRef.current, subheadlineRef.current, ctaRef.current, eyebrowRef.current, imagePanelRef.current],
          { opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' },
        );
        return;
      }

      // -----------------------------------------------------------------------
      // Split headline text into word spans for stagger
      // -----------------------------------------------------------------------
      const headline = headlineRef.current;
      if (headline) {
        const originalText = headline.textContent ?? '';
        const words = originalText.split(' ');
        headline.innerHTML = words
          .map(
            (word) =>
              `<span class="word-split"><span class="word-inner" style="display:inline-block;transform:translateY(60px);opacity:0;clip-path:inset(100% 0 0 0)">${word}</span></span>`,
          )
          .join(' ');
      }

      // -----------------------------------------------------------------------
      // Main entrance timeline
      // -----------------------------------------------------------------------
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      // Image panel: clip-path reveal from bottom
      tl.fromTo(
        imagePanelRef.current,
        { clipPath: 'inset(100% 0 0 0)' },
        { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'power4.inOut' },
        0,
      );

      // Eyebrow label
      tl.fromTo(
        eyebrowRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8 },
        0.3,
      );

      // Headline words stagger in
      const wordInners = headline?.querySelectorAll('.word-inner');
      if (wordInners && wordInners.length > 0) {
        tl.to(
          wordInners,
          {
            y: 0,
            opacity: 1,
            clipPath: 'inset(0% 0 0 0)',
            duration: 0.9,
            stagger: 0.1,
            ease: 'power3.out',
          },
          0.5,
        );
      }

      // Subheadline
      tl.fromTo(
        subheadlineRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7 },
        1.0,
      );

      // CTA button
      tl.fromTo(
        ctaRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6 },
        1.25,
      );

      // -----------------------------------------------------------------------
      // ScrollTrigger parallax — image moves at 0.4× scroll speed
      // -----------------------------------------------------------------------
      if (imageRef.current) {
        gsap.to(imageRef.current, {
          yPercent: 20,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col lg:flex-row overflow-hidden bg-cream"
      aria-label="Hero section"
    >
      {/* ====================================================================
          Left — Text Panel (40%)
      ==================================================================== */}
      <div className="relative z-10 flex flex-col justify-center px-8 py-20 lg:px-16 xl:px-24 lg:w-[40%] lg:min-h-screen">
        {/* Eyebrow */}
        <span
          ref={eyebrowRef}
          className="inline-block mb-6 text-xs font-body font-semibold tracking-[0.2em] uppercase text-stone opacity-0"
          aria-hidden="true"
        >
          Fine Art Photography
        </span>

        {/* Headline */}
        <h1
          ref={headlineRef}
          className="font-heading text-dark leading-[1.1] mb-6 text-balance"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Light. Captured. Forever.
        </h1>

        {/* Subheadline */}
        <p
          ref={subheadlineRef}
          className="font-body font-light text-stone text-lg leading-relaxed mb-10 max-w-md opacity-0"
        >
          Fine art nature photography prints for the discerning collector.
          Each piece is printed on museum-quality archival paper, signed and numbered.
        </p>

        {/* CTA */}
        <div ref={ctaRef} className="flex flex-wrap gap-4 opacity-0">
          <MagneticButton
            href="/shop"
            variant="primary"
            aria-label="Browse all prints in the shop"
          >
            Browse Prints
          </MagneticButton>
          <MagneticButton
            href="#featured"
            variant="outline"
            aria-label="View featured collections"
          >
            View Collections
          </MagneticButton>
        </div>

        {/* Scroll indicator */}
        <div
          className="hidden lg:flex items-center gap-3 mt-16 text-stone"
          aria-hidden="true"
        >
          <span className="block w-8 h-px bg-stone" />
          <span className="text-xs font-body tracking-widest uppercase">
            Scroll to explore
          </span>
        </div>
      </div>

      {/* ====================================================================
          Right — Image Panel (60%)
      ==================================================================== */}
      <div
        ref={imagePanelRef}
        className="relative lg:w-[60%] h-72 sm:h-96 lg:h-auto overflow-hidden"
        style={{ clipPath: 'inset(100% 0 0 0)' }}
      >
        {/* Parallax wrapper — GSAP moves this element on scroll */}
        <div
          ref={imageRef}
          className="absolute inset-0 scale-110"
          style={{ willChange: 'transform' }}
        >
          <Image
            src={featuredImageUrl}
            alt={featuredImageAlt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover object-center"
            quality={90}
          />
        </div>

        {/* Subtle gradient overlay for text legibility on mobile */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              'linear-gradient(to bottom, rgba(234,231,220,0.9) 0%, transparent 40%)',
          }}
          aria-hidden="true"
        />

        {/* Corner accent */}
        <div
          className="absolute bottom-8 right-8 text-right hidden lg:block"
          aria-hidden="true"
        >
          <p className="text-xs font-body text-white/70 tracking-widest uppercase">
            Prince Photography
          </p>
        </div>
      </div>
    </section>
  );
}
