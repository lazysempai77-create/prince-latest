import type { PrintSize } from '@/lib/db';

// =============================================================================
// Types
// =============================================================================

export interface CartItem {
  printId: string;
  title: string;
  size: PrintSize;
  price: number; // in cents
  imageUrl: string;
  r2Key: string;
}
