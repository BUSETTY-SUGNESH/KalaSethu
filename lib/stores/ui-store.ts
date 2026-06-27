// ============================================================
// KalaSetu — UI Store (Zustand)
// ============================================================
import { create } from 'zustand';
import type { Artwork } from '@/app/types';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface Modal {
  id: string;
  component: string;
  props?: Record<string, unknown>;
}

interface UIState {
  // Mobile Navigation
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
  // Search
  isSearchOpen: boolean;
  searchQuery: string;
  activeCategory: string | null;
  sortBy: 'newest' | 'price_low' | 'price_high' | 'popular';
  toggleSearch: () => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string | null) => void;
  setSortBy: (sort: 'newest' | 'price_low' | 'price_high' | 'popular') => void;
  // Notifications Panel
  isNotificationPanelOpen: boolean;
  toggleNotificationPanel: () => void;
  setNotificationPanelOpen: (open: boolean) => void;
  unreadNotificationCount: number;
  setUnreadNotificationCount: (count: number) => void;
  // Modals
  activeModal: Modal | null;
  openModal: (id: string, component: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  // Page Loading
  isPageLoading: boolean;
  setPageLoading: (loading: boolean) => void;
  // Marketplace Cache
  marketplaceCache: {
    artworks: Artwork[];
    lastDoc: unknown;
    hasMore: boolean;
    searchResults: Artwork[] | null;
    scrollY: number;
  } | null;
  setMarketplaceCache: (cache: UIState['marketplaceCache']) => void;
  clearMarketplaceCache: () => void;
}

function createToastId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `toast_${crypto.randomUUID()}`;
  }
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const useUIStore = create<UIState>((set) => ({
  // Mobile Navigation
  isMobileNavOpen: false,
  toggleMobileNav: () => set((s) => ({ isMobileNavOpen: !s.isMobileNavOpen })),
  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),

  // Search
  // Search & Filter
  isSearchOpen: false,
  searchQuery: '',
  activeCategory: null,
  sortBy: 'newest',
  toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setSortBy: (sort) => set({ sortBy: sort }),

  // Notifications
  isNotificationPanelOpen: false,
  toggleNotificationPanel: () =>
    set((s) => ({ isNotificationPanelOpen: !s.isNotificationPanelOpen })),
  setNotificationPanelOpen: (open) => set({ isNotificationPanelOpen: open }),
  unreadNotificationCount: 0,
  setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),

  // Modals
  activeModal: null,
  openModal: (id, component, props) =>
    set({ activeModal: { id, component, props } }),
  closeModal: () => set({ activeModal: null }),

  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = createToastId();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-remove after duration
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 4000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // Page Loading
  isPageLoading: false,
  setPageLoading: (loading) => set({ isPageLoading: loading }),

  // Marketplace Cache
  marketplaceCache: null,
  setMarketplaceCache: (cache) => set({ marketplaceCache: cache }),
  clearMarketplaceCache: () => set({ marketplaceCache: null }),
}));
