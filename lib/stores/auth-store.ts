// ============================================================
// KalaSetu — Auth Store (Zustand)
// ============================================================
import { create } from 'zustand';
import type { User, UserRole } from '@/app/types';

interface AuthState {
  // State
  user: User | null;
  firebaseUser: { uid: string; email: string | null; emailVerified: boolean } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Actions
  setUser: (user: User | null) => void;
  setFirebaseUser: (user: { uid: string; email: string | null; emailVerified: boolean } | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  // Computed helpers
  hasRole: (role: UserRole) => boolean;
  isArtist: () => boolean;
  isVerifiedArtist: () => boolean;
  isAdmin: () => boolean;
  isModerator: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setFirebaseUser: (firebaseUser) =>
    set({ firebaseUser }),

  setLoading: (isLoading) => set({ isLoading }),

  clearAuth: () =>
    set({
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  hasRole: (role) => {
    const { user } = get();
    if (!user) return false;
    const roleHierarchy: Record<UserRole, number> = {
      guest: 0,
      user: 1,
      artist: 2,
      verified_artist: 3,
      moderator: 4,
      admin: 5,
    };
    return roleHierarchy[user.role] >= roleHierarchy[role];
  },

  isArtist: () => {
    const { user } = get();
    return user?.role === 'artist' || user?.role === 'verified_artist' || false;
  },

  isVerifiedArtist: () => {
    const { user } = get();
    return user?.role === 'verified_artist' || false;
  },

  isAdmin: () => {
    const { user } = get();
    return user?.role === 'admin' || false;
  },

  isModerator: () => {
    const { user } = get();
    return user?.role === 'moderator' || user?.role === 'admin' || false;
  },
}));
