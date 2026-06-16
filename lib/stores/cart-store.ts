// ============================================================
// KalaSetu — Cart Store (Zustand with localStorage persistence)
// ============================================================
import { create } from 'zustand';
import type { CartItem } from '@/app/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  // Computed
  totalAmount: number;
  itemCount: number;
  // Actions
  addItem: (item: Omit<CartItem, 'quantity' | 'addedAt'>) => void;
  removeItem: (artworkId: string) => void;
  updateQuantity: (artworkId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  hydrateFromStorage: () => void;
}

function calculateTotals(items: CartItem[]) {
  return {
    totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function persistCart(items: CartItem[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('kalasetu_cart', JSON.stringify(items));
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  totalAmount: 0,
  itemCount: 0,

  addItem: (item) => {
    const { items } = get();
    const existing = items.find((i) => i.artworkId === item.artworkId);

    let newItems: CartItem[];
    if (existing) {
      newItems = items.map((i) =>
        i.artworkId === item.artworkId
          ? { ...i, quantity: i.quantity + 1 }
          : i
      );
    } else {
      newItems = [
        ...items,
        { ...item, quantity: 1, addedAt: new Date().toISOString() },
      ];
    }

    persistCart(newItems);
    set({ items: newItems, ...calculateTotals(newItems) });
  },

  removeItem: (artworkId) => {
    const { items } = get();
    const newItems = items.filter((i) => i.artworkId !== artworkId);
    persistCart(newItems);
    set({ items: newItems, ...calculateTotals(newItems) });
  },

  updateQuantity: (artworkId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(artworkId);
      return;
    }
    const { items } = get();
    const newItems = items.map((i) =>
      i.artworkId === artworkId ? { ...i, quantity } : i
    );
    persistCart(newItems);
    set({ items: newItems, ...calculateTotals(newItems) });
  },

  clearCart: () => {
    persistCart([]);
    set({ items: [], totalAmount: 0, itemCount: 0 });
  },

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  setCartOpen: (open) => set({ isOpen: open }),

  hydrateFromStorage: () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('kalasetu_cart');
        if (stored) {
          const items = JSON.parse(stored) as CartItem[];
          set({ items, ...calculateTotals(items) });
        }
      } catch {
        // Silently fail — corrupt localStorage
      }
    }
  },
}));
