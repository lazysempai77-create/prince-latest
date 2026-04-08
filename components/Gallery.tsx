'use client';

import React, { useState, useRef, useLayoutEffect, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Print } from '@/lib/db';
import PrintCard from '@/components/PrintCard';

gsap.registerPlugin(ScrollTrigger);

// =============================================================================
// Types
// =============================================================================

interface GalleryProps {
  prints: Print[];
}

// =============================================================================
// Skeleton Card
// =============================================================================

function SkeletonCard({ index }: { index: number }) {
  const heights = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-square'];
  const heightClass = heights[index % heights.length];
  return (
    <div className="break-inside-avoid mb-6 rounded-sm overflow-hidden bg-cream">
      <div className={`skeleton ${heightClass} w-full`} aria-hidden="true" />
      <div className="p-5 space-y-2">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded mt-1" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

// =============================================================================
// Filter Tab
// =============================================================================

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={[
        'px-5 py-2 text-sm font-body font-semibold tracking-wide rounded-sm',
        'transition-all duration-200 focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2',
        active
          ? 'bg-dark text-off-white'
          : 'bg-cream text-stone hover:bg-sand hover:text-dark',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function Gallery({ prints }: GalleryProps) {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [isLoaded, setIsLoaded] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);
  // Clear stale refs before each render so GSAP only animates currently-mounted cards
  cardRefs.current = [];

  // Derive unique collection names for filter tabs
  const collections = useMemo(() => {
    const names = new Set<string>();
    prints.forEach((p) => {
      if (p.collection_name) names.add(p.collection_name);
    });
    return Array.from(names);
  }, [prints]);

  // Filtered print list
  const filteredPrints = useMemo(() => {
    if (activeFilter === 'All') return prints;
    return prints.filter((p) => p.collection_name === activeFilter);
  }, [prints, activeFilter]);

  // Simulate "loaded" state (in real usage the data is already passed as props)
  React.useEffect(() => {
    const t = setTimeout(() => setIsLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  // GSAP ScrollTrigger reveals on each card
  useLayoutEffect(() => {
    if (!isLoaded || filteredPrints.length === 0) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const cards = cardRefs.current.filter(Boolean);
    if (cards.length === 0) return;

    const ctx = gsap.context(() => {
      if (prefersReduced) {
        gsap.set(cards, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(cards, { opacity: 0, y: 40 });

      cards.forEach((card, i) => {
        gsap.to(card, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          delay: (i % 3) * 0.12, // stagger by column position, not index
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      });
    }, gridRef);

    return () => ctx.revert();
  }, [isLoaded, filteredPrints]);

  // Re-trigger ScrollTrigger refresh when filter changes (layout shifts)
  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [activeFilter]);

  return (
    <section aria-label="Photography prints gallery">
      {/* ======================================================================
          Filter Tabs
      ====================================================================== */}
      <div
        role="group"
        aria-label="Filter prints by collection"
        className="flex flex-wrap gap-2 mb-10"
      >
        <FilterTab
          label="All"
          active={activeFilter === 'All'}
          onClick={() => setActiveFilter('All')}
        />
        {collections.map((name) => (
          <FilterTab
            key={name}
            label={name}
            active={activeFilter === name}
            onClick={() => setActiveFilter(name)}
          />
        ))}
      </div>

      {/* ======================================================================
          Count indicator
      ====================================================================== */}
      <p
        className="text-sm font-body text-stone mb-6"
        aria-live="polite"
        aria-atomic="true"
      >
        {isLoaded
          ? `${filteredPrints.length} print${filteredPrints.length !== 1 ? 's' : ''}`
          : 'Loading prints…'}
      </p>

      {/* ======================================================================
          Masonry Grid
      ====================================================================== */}
      <div
        ref={gridRef}
        className="columns-1 md:columns-2 lg:columns-3 gap-6"
        aria-busy={!isLoaded}
      >
        {!isLoaded
          ? Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} index={i} />
            ))
          : filteredPrints.length === 0
          ? (
            <div className="col-span-full py-24 text-center">
              <p className="font-heading text-stone text-2xl">No prints found</p>
              <p className="font-body text-stone mt-2">
                Try selecting a different collection above.
              </p>
            </div>
          )
          : filteredPrints.map((print, i) => (
              <div
                key={`${print.id}-${activeFilter}`}
                ref={(el) => {
                  if (el) cardRefs.current[i] = el;
                }}
              >
                <PrintCard print={print} />
              </div>
            ))}
      </div>
    </section>
  );
}
