'use client';

import React, {
  useRef,
  useCallback,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import gsap from 'gsap';

// =============================================================================
// Types
// =============================================================================

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
}

// =============================================================================
// Constants — magnetic force tuning
// =============================================================================

/** How much the element follows the cursor (0 = none, 1 = full tracking). */
const MAGNETIC_STRENGTH = 0.38;
/** quickTo configuration for smooth cursor-follow. */
const QUICK_TO_DURATION = 0.5;
const QUICK_TO_EASE = 'power3.out';
/** Spring-back ease when mouse leaves. */
const RESET_EASE = 'elastic.out(1, 0.3)';
const RESET_DURATION = 0.7;

// =============================================================================
// Component
// =============================================================================

export default function MagneticButton({
  children,
  className = '',
  onClick,
  href,
  'aria-label': ariaLabel,
  type = 'button',
  disabled = false,
  variant = 'primary',
}: MagneticButtonProps) {
  const elRef = useRef<HTMLButtonElement & HTMLAnchorElement>(null);

  // quickTo instances — created lazily on first mousemove
  const quickX = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const quickY = useRef<ReturnType<typeof gsap.quickTo> | null>(null);

  const initQuickTo = useCallback(() => {
    if (quickX.current || !elRef.current) return;
    quickX.current = gsap.quickTo(elRef.current, 'x', {
      duration: QUICK_TO_DURATION,
      ease: QUICK_TO_EASE,
    });
    quickY.current = gsap.quickTo(elRef.current, 'y', {
      duration: QUICK_TO_DURATION,
      ease: QUICK_TO_EASE,
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (disabled) return;
      initQuickTo();

      const el = elRef.current;
      if (!el || !quickX.current || !quickY.current) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) * MAGNETIC_STRENGTH;
      const deltaY = (e.clientY - centerY) * MAGNETIC_STRENGTH;

      quickX.current(deltaX);
      quickY.current(deltaY);
    },
    [disabled, initQuickTo],
  );

  const handleMouseLeave = useCallback(() => {
    if (!elRef.current) return;
    gsap.to(elRef.current, {
      x: 0,
      y: 0,
      duration: RESET_DURATION,
      ease: RESET_EASE,
    });
  }, []);

  const variantClass = {
    primary: 'magnetic-button--primary',
    outline: 'magnetic-button--outline',
    ghost: '',
  }[variant];

  const sharedProps = {
    ref: elRef,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    'aria-label': ariaLabel,
    className: `magnetic-button ${variantClass} ${className}`.trim(),
  };

  if (href) {
    return (
      <a
        {...(sharedProps as React.HTMLAttributes<HTMLAnchorElement>)}
        ref={elRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      {...(sharedProps as React.HTMLAttributes<HTMLButtonElement>)}
      ref={elRef as React.RefObject<HTMLButtonElement>}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
