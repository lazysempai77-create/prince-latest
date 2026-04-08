'use client';

import React, { useState, useId } from 'react';
import Image from 'next/image';
import type { Print, PrintSize } from '@/lib/db';
import { formatPrice, priceForSize, PRINT_SIZE_LABELS, PRINT_SIZES } from '@/lib/db';
import MagneticButton from '@/components/MagneticButton';
import { useCartContext } from '@/context/CartContext';

// =============================================================================
// Types
// =============================================================================

interface PrintCardProps {
  print: Print;
}

// =============================================================================
// Component
// =============================================================================

export default function PrintCard({ print }: PrintCardProps) {
  const sizeGroupId = useId();
  const [selectedSize, setSelectedSize] = useState<PrintSize>('medium');
  const { addItem, openCart } = useCartContext();

  // r2_key and r2_thumbnail_key are already fully-qualified URLs
  // (mapped from imageUrl/thumbnailUrl in the gallery API response)
  const imageUrl = print.r2_thumbnail_key ?? print.r2_key;

  const price = priceForSize(print, selectedSize);
  const isAvailable = print.is_available === 1;

  function handleAddToCart() {
    if (!isAvailable) return;
    addItem({
      printId: String(print.id),
      title: print.title,
      size: selectedSize,
      price,
      imageUrl,
      r2Key: print.r2_key,
    });
    openCart();
  }

  return (
    <article
      className="print-card group break-inside-avoid mb-6 bg-cream rounded-sm shadow-card hover:shadow-card-hover transition-shadow duration-500"
      aria-label={`${print.title} fine art print`}
    >
      {/* ====================================================================
          Image
      ==================================================================== */}
      <div className="print-card__image-wrapper relative overflow-hidden aspect-[4/5]">
        <div className="print-card__image absolute inset-0">
          <Image
            src={imageUrl}
            alt={`${print.title} — ${print.collection_name ?? 'Photography'} print`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover object-center"
            quality={80}
          />
        </div>

        {/* Hover overlay */}
        <div
          className="print-card__overlay"
          aria-hidden="true"
        >
          <p className="text-white font-body text-sm font-semibold tracking-widest uppercase">
            View Print
          </p>
        </div>

        {/* Sold-out badge */}
        {!isAvailable && (
          <div
            className="absolute top-3 left-3 bg-stone/90 text-white text-xs font-body font-semibold px-2 py-1 rounded-sm tracking-wide"
            aria-label="This print is currently unavailable"
          >
            Available on Request
          </div>
        )}

        {/* Featured badge */}
        {print.is_featured === 1 && isAvailable && (
          <div
            className="absolute top-3 right-3 bg-terra/90 text-white text-xs font-body font-semibold px-2 py-1 rounded-sm tracking-wide"
            aria-hidden="true"
          >
            Featured
          </div>
        )}
      </div>

      {/* ====================================================================
          Info
      ==================================================================== */}
      <div className="p-5 space-y-4">
        {/* Collection + Title */}
        <div>
          {print.collection_name && (
            <p className="text-xs font-body font-semibold tracking-[0.15em] uppercase text-terra mb-1">
              {print.collection_name}
            </p>
          )}
          <h3 className="font-heading text-dark text-xl leading-tight">
            {print.title}
          </h3>
          {print.description && (
            <p className="mt-1 text-sm font-body text-stone line-clamp-2">
              {print.description}
            </p>
          )}
        </div>

        {/* Size Selector */}
        <fieldset aria-label={`Size options for ${print.title}`}>
          <legend className="text-xs font-body font-semibold tracking-widest uppercase text-stone mb-2">
            Select Size
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {PRINT_SIZES.map((size) => {
              const id = `${sizeGroupId}-${size}`;
              const sizePrice = priceForSize(print, size);
              return (
                <label
                  key={size}
                  htmlFor={id}
                  className={[
                    'flex flex-col items-start px-3 py-2 border rounded-sm cursor-pointer',
                    'transition-all duration-200',
                    'focus-within:ring-2 focus-within:ring-terra focus-within:ring-offset-1',
                    selectedSize === size
                      ? 'border-dark bg-dark text-off-white'
                      : 'border-sand bg-off-white text-dark hover:border-stone',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    id={id}
                    name={`${sizeGroupId}-size`}
                    value={size}
                    checked={selectedSize === size}
                    onChange={() => setSelectedSize(size)}
                    className="sr-only"
                    aria-label={`${PRINT_SIZE_LABELS[size]} — ${formatPrice(sizePrice)}`}
                  />
                  <span className="text-xs font-body font-semibold">
                    {PRINT_SIZE_LABELS[size]}
                  </span>
                  <span
                    className={`text-xs font-body ${
                      selectedSize === size ? 'text-sand' : 'text-stone'
                    }`}
                  >
                    {formatPrice(sizePrice)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-1">
          <p className="font-heading text-2xl text-dark">
            {formatPrice(price)}
          </p>

          {isAvailable ? (
            <MagneticButton
              variant="primary"
              onClick={handleAddToCart}
              aria-label={`Add ${print.title} (${PRINT_SIZE_LABELS[selectedSize]}) to cart for ${formatPrice(price)}`}
              className="!py-2.5 !px-5 text-sm"
            >
              Add to Cart
            </MagneticButton>
          ) : (
            <span
              className="inline-flex items-center px-4 py-2.5 text-sm font-body font-semibold text-stone border border-sand rounded-sm"
              aria-live="polite"
            >
              Available on Request
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
