'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { PrintSize } from '@/lib/db';
import type { CartItem } from '@/hooks/useCart';

// =============================================================================
// Context shape
// =============================================================================

interface CartContextValue {
  cartItems: CartItem[];
  itemCount: number;
  total: number;
  lastAdded: CartItem | null;
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (printId: string, size: PrintSize) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

const STORAGE_KEY = 'prince-photo-cart';
const LAST_ADDED_RESET_MS = 2000;

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Hydrate from localStorage after mount — avoids SSR/client mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        if (Array.isArray(parsed)) setCartItems(parsed);
      }
    } catch {
      // localStorage unavailable — start empty
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on every change after hydration
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Storage quota exceeded — silently degrade
    }
  }, [cartItems, hydrated]);

  // Clear lastAdded after pulse animation
  useEffect(() => {
    if (!lastAdded) return;
    const t = setTimeout(() => setLastAdded(null), LAST_ADDED_RESET_MS);
    return () => clearTimeout(t);
  }, [lastAdded]);

  // Lock body scroll when cart is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const addItem = useCallback((item: CartItem) => {
    setCartItems((prev) => {
      const exists = prev.some(
        (c) => c.printId === item.printId && c.size === item.size,
      );
      return exists ? prev : [...prev, item];
    });
    setLastAdded(item);
  }, []);

  const removeItem = useCallback((printId: string, size: PrintSize) => {
    setCartItems((prev) =>
      prev.filter((c) => !(c.printId === printId && c.size === size)),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setLastAdded(null);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const itemCount = cartItems.length;
  const total = cartItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        total,
        lastAdded,
        isOpen,
        addItem,
        removeItem,
        clearCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// =============================================================================
// Consumer hook
// =============================================================================

export function useCartContext(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCartContext must be used within a <CartProvider>');
  }
  return ctx;
}
