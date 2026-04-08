'use client';

import React, {
  useRef,
  useLayoutEffect,
  useState,
  useCallback,
  useId,
} from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { Turnstile } from '@marsidev/react-turnstile';
import { useCartContext } from '@/context/CartContext';
import { formatPrice, PRINT_SIZE_LABELS } from '@/lib/db';
import type { PrintSize } from '@/lib/db';
import MagneticButton from '@/components/MagneticButton';

// =============================================================================
// Types
// =============================================================================

interface InquiryFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  turnstileToken: string;
}

type DrawerView = 'cart' | 'inquiry' | 'success';

// =============================================================================
// Animated Checkmark
// =============================================================================

function AnimatedCheckmark() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="mx-auto"
    >
      <circle cx="32" cy="32" r="30" stroke="#E98074" strokeWidth="2" />
      <path
        d="M20 33l9 9 15-18"
        stroke="#E98074"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="checkmark-path"
      />
    </svg>
  );
}

// =============================================================================
// Cart Item Row
// =============================================================================

function CartItemRow({
  item,
  onRemove,
}: {
  item: { printId: string; title: string; size: PrintSize; price: number; imageUrl: string };
  onRemove: (printId: string, size: PrintSize) => void;
}) {
  return (
    <li className="flex gap-4 py-4 border-b border-cream last:border-0">
      {/* Thumbnail */}
      <div className="relative w-16 h-20 flex-shrink-0 rounded-sm overflow-hidden bg-cream">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="64px"
            className="object-cover object-center"
          />
        ) : (
          <div className="w-full h-full bg-sand" aria-hidden="true" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-heading text-dark text-base leading-snug truncate">
          {item.title}
        </p>
        <p className="text-xs font-body text-stone mt-0.5">
          {PRINT_SIZE_LABELS[item.size]}
        </p>
        <p className="font-body font-semibold text-dark mt-1">
          {formatPrice(item.price)}
        </p>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.printId, item.size)}
        aria-label={`Remove ${item.title} (${PRINT_SIZE_LABELS[item.size]}) from cart`}
        className="self-start mt-0.5 p-1 text-stone hover:text-terra transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-terra rounded"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2 2l12 12M14 2L2 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </li>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function CartDrawer() {
  const { cartItems, total, isOpen, removeItem, clearCart, closeCart } =
    useCartContext();

  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<DrawerView>('cart');
  const formId = useId();

  const [form, setForm] = useState<InquiryFormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
    turnstileToken: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // GSAP slide-in / slide-out
  // -------------------------------------------------------------------------

  useLayoutEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const drawer = drawerRef.current;
    const overlay = overlayRef.current;
    if (!drawer || !overlay) return;

    if (isOpen) {
      if (prefersReduced) {
        drawer.style.transform = 'translateX(0%)';
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
      } else {
        gsap.fromTo(
          drawer,
          { x: '100%' },
          { x: '0%', duration: 0.55, ease: 'power3.out' },
        );
        gsap.fromTo(
          overlay,
          { opacity: 0, pointerEvents: 'none' },
          { opacity: 1, pointerEvents: 'auto', duration: 0.4, ease: 'power2.out' },
        );
      }
    } else {
      if (prefersReduced) {
        drawer.style.transform = 'translateX(100%)';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      } else {
        gsap.to(drawer, { x: '100%', duration: 0.4, ease: 'power3.in' });
        gsap.to(overlay, {
          opacity: 0,
          pointerEvents: 'none',
          duration: 0.3,
          ease: 'power2.in',
        });
      }
    }
  }, [isOpen]);

  // Reset view when drawer closes
  useLayoutEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setView('cart'), 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Form handlers
  // -------------------------------------------------------------------------

  const handleFieldChange = useCallback(
    (field: keyof InquiryFormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setSubmitError(null);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.turnstileToken) {
        setSubmitError('Please complete the verification.');
        return;
      }
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const payload = {
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone || null,
          message: form.message || null,
          cart: cartItems,
          turnstileToken: form.turnstileToken,
        };

        const res = await fetch('/api/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? 'Submission failed. Please try again.');
        }

        clearCart();
        setView('success');
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : 'An unexpected error occurred.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, cartItems, clearCart],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA';

  return (
    <>
      {/* Backdrop overlay */}
      <div
        ref={overlayRef}
        className="cart-overlay"
        onClick={closeCart}
        aria-hidden="true"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        style={{ transform: 'translateX(100%)' }}
      >
        {/* ------------------------------------------------------------------
            Header
        ------------------------------------------------------------------ */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-cream flex-shrink-0">
          <div>
            {view === 'cart' && (
              <h2 className="font-heading text-xl text-dark">Your Cart</h2>
            )}
            {view === 'inquiry' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView('cart')}
                  aria-label="Back to cart"
                  className="text-stone hover:text-dark transition-colors focus-visible:ring-2 focus-visible:ring-terra rounded"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M12 4l-6 6 6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <h2 className="font-heading text-xl text-dark">Inquiry Form</h2>
              </div>
            )}
            {view === 'success' && (
              <h2 className="font-heading text-xl text-dark">Request Sent</h2>
            )}
          </div>

          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="p-2 text-stone hover:text-dark transition-colors focus-visible:ring-2 focus-visible:ring-terra rounded"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M2 2l16 16M18 2L2 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* ------------------------------------------------------------------
            Cart View
        ------------------------------------------------------------------ */}
        {view === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="none"
                    className="text-sand mb-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 6h4l2.6 13m0 0L16 36h24l4-20H12.6z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="19" cy="42" r="2" fill="currentColor" />
                    <circle cx="37" cy="42" r="2" fill="currentColor" />
                  </svg>
                  <p className="font-body text-stone text-base">Your cart is empty.</p>
                  <p className="font-body text-stone text-sm mt-1">
                    Browse prints and add them here.
                  </p>
                  <MagneticButton
                    href="/shop"
                    variant="outline"
                    onClick={closeCart}
                    aria-label="Go to shop"
                    className="mt-6 !py-2 !px-5 !text-sm"
                  >
                    Browse Prints
                  </MagneticButton>
                </div>
              ) : (
                <ul aria-label="Cart items">
                  {cartItems.map((item) => (
                    <CartItemRow
                      key={`${item.printId}-${item.size}`}
                      item={item}
                      onRemove={removeItem}
                    />
                  ))}
                </ul>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="flex-shrink-0 px-6 py-5 border-t border-cream space-y-4">
                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="font-body font-semibold text-dark">Total</span>
                  <span
                    className="font-heading text-2xl text-dark"
                    aria-live="polite"
                  >
                    {formatPrice(total)}
                  </span>
                </div>

                <p className="text-xs font-body text-stone leading-relaxed">
                  All prints are made-to-order. Submitting a request does not
                  charge your card — we will confirm availability and send an
                  invoice within 48 hours.
                </p>

                <MagneticButton
                  variant="primary"
                  onClick={() => setView('inquiry')}
                  aria-label="Proceed to inquiry form"
                  className="w-full justify-center"
                >
                  Request Prints
                </MagneticButton>
              </div>
            )}
          </>
        )}

        {/* ------------------------------------------------------------------
            Inquiry Form View
        ------------------------------------------------------------------ */}
        {view === 'inquiry' && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Cart summary */}
            <div className="mb-6 p-4 bg-cream rounded-sm">
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-stone mb-2">
                Your Request ({cartItems.length} print{cartItems.length !== 1 ? 's' : ''})
              </p>
              <ul className="space-y-1">
                {cartItems.map((item) => (
                  <li
                    key={`${item.printId}-${item.size}`}
                    className="flex justify-between text-sm font-body text-dark"
                  >
                    <span>
                      {item.title}
                      <span className="text-stone ml-1">
                        ({PRINT_SIZE_LABELS[item.size]})
                      </span>
                    </span>
                    <span>{formatPrice(item.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-sand flex justify-between font-body font-semibold text-dark text-sm">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Form */}
            <form
              id={formId}
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4"
              aria-label="Print inquiry form"
            >
              <div>
                <label
                  htmlFor={`${formId}-name`}
                  className="block text-xs font-body font-semibold tracking-widest uppercase text-stone mb-1"
                >
                  Full Name <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`${formId}-name`}
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 border border-sand rounded-sm font-body text-sm text-dark bg-off-white placeholder:text-stone/60 focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor={`${formId}-email`}
                  className="block text-xs font-body font-semibold tracking-widest uppercase text-stone mb-1"
                >
                  Email <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`${formId}-email`}
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-sand rounded-sm font-body text-sm text-dark bg-off-white placeholder:text-stone/60 focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor={`${formId}-phone`}
                  className="block text-xs font-body font-semibold tracking-widest uppercase text-stone mb-1"
                >
                  Phone{' '}
                  <span className="normal-case text-stone/60 tracking-normal">
                    (optional)
                  </span>
                </label>
                <input
                  id={`${formId}-phone`}
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 border border-sand rounded-sm font-body text-sm text-dark bg-off-white placeholder:text-stone/60 focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor={`${formId}-message`}
                  className="block text-xs font-body font-semibold tracking-widest uppercase text-stone mb-1"
                >
                  Message{' '}
                  <span className="normal-case text-stone/60 tracking-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  id={`${formId}-message`}
                  rows={3}
                  value={form.message}
                  onChange={(e) => handleFieldChange('message', e.target.value)}
                  placeholder="Any special requirements, framing preferences, or questions..."
                  className="w-full px-4 py-3 border border-sand rounded-sm font-body text-sm text-dark bg-off-white placeholder:text-stone/60 focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark transition-colors resize-none"
                />
              </div>

              {/* Turnstile CAPTCHA */}
              <div>
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => handleFieldChange('turnstileToken', token)}
                  options={{ theme: 'light', size: 'normal' }}
                />
              </div>

              {/* Error message */}
              {submitError && (
                <p
                  role="alert"
                  className="text-sm font-body text-terra bg-terra/10 px-4 py-3 rounded-sm border border-terra/30"
                >
                  {submitError}
                </p>
              )}

              <MagneticButton
                type="submit"
                variant="primary"
                disabled={isSubmitting || !form.name || !form.email}
                aria-label="Submit print inquiry"
                className="w-full justify-center"
              >
                {isSubmitting ? 'Sending…' : 'Send Inquiry'}
              </MagneticButton>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------------
            Success View
        ------------------------------------------------------------------ */}
        {view === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
            <AnimatedCheckmark />
            <h3 className="font-heading text-2xl text-dark mt-6">
              Thank you!
            </h3>
            <p className="font-body text-stone mt-3 max-w-xs leading-relaxed">
              Your inquiry has been received. We will review your request and
              get back to you within 48 hours with pricing, availability, and
              shipping details.
            </p>
            <MagneticButton
              variant="outline"
              onClick={closeCart}
              aria-label="Close cart and continue browsing"
              className="mt-8"
            >
              Continue Browsing
            </MagneticButton>
          </div>
        )}
      </div>
    </>
  );
}
