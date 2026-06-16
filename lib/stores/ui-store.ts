// ============================================================
// KalaSetu — UI Store (Zustand)
// ============================================================
import { create } from 'zustand';

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
  toggleSearch: () => void;
  setSearchQuery: (query: string) => void;
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
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  // Mobile Navigation
  isMobileNavOpen: false,
  toggleMobileNav: () => set((s) => ({ isMobileNavOpen: !s.isMobileNavOpen })),
  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),

  // Search
  isSearchOpen: false,
  searchQuery: '',
  toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),
  setSearchQuery: (query) => set({ searchQuery: query }),

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
    const id = `toast_${++toastCounter}`;
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
}));
