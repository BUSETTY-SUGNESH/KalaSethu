// ============================================================
// KalaSetu — Cart Store (Zustand with localStorage persistence)
// ============================================================
import { create } from 'zustand';
import type { CartItem } from '@/app/types';

const CART_KEY_PREFIX = 'kalasetu_cart';
const LEGACY_CART_KEY = 'kalasetu_cart';

function getCartKey(userId: string): string {
  return `${CART_KEY_PREFIX}_${userId}`;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  currentUserId: string | null;
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
  hydrateFromStorage: (userId: string) => void;
  setCartUser: (userId: string | null) => void;
}

function calculateTotals(items: CartItem[]) {
  return {
    totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function persistCart(items: CartItem[], userId: string | null) {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.setItem(getCartKey(userId), JSON.stringify(items));
}

function loadCartFromStorage(userId: string): CartItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const userKey = getCartKey(userId);
    let stored = localStorage.getItem(userKey);
    if (!stored) {
      const legacy = localStorage.getItem(LEGACY_CART_KEY);
      if (legacy) {
        localStorage.setItem(userKey, legacy);
        localStorage.removeItem(LEGACY_CART_KEY);
        stored = legacy;
      }
    }
    if (stored) {
      return JSON.parse(stored) as CartItem[];
    }
  } catch {
    // Silently fail — corrupt localStorage
  }
  return null;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  currentUserId: null,
  totalAmount: 0,
  itemCount: 0,

  addItem: (item) => {
    const { items, currentUserId } = get();
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

    persistCart(newItems, currentUserId);
    set({ items: newItems, ...calculateTotals(newItems) });
  },

  removeItem: (artworkId) => {
    const { items, currentUserId } = get();
    const newItems = items.filter((i) => i.artworkId !== artworkId);
    persistCart(newItems, currentUserId);
    set({ items: newItems, ...calculateTotals(newItems) });
  },

  updateQuantity: (artworkId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(artworkId);
      return;
    }
    const { items, currentUserId } = get();
    const newItems = items.map((i) =>
      i.artworkId === artworkId ? { ...i, quantity } : i
    );
    persistCart(newItems, currentUserId);
    set({ items: newItems, ...calculateTotals(newItems) });
  },

  clearCart: () => {
    const { currentUserId } = get();
    persistCart([], currentUserId);
    set({ items: [], totalAmount: 0, itemCount: 0 });
  },

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  setCartOpen: (open) => set({ isOpen: open }),

  hydrateFromStorage: (userId) => {
    const items = loadCartFromStorage(userId);
    if (items) {
      set({ items, ...calculateTotals(items) });
    } else {
      set({ items: [], totalAmount: 0, itemCount: 0 });
    }
  },

  setCartUser: (userId) => {
    if (userId) {
      set({ currentUserId: userId });
      get().hydrateFromStorage(userId);
    } else {
      set({ currentUserId: null, items: [], totalAmount: 0, itemCount: 0 });
    }
  },
}));
