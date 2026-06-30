// ============================================================
// KalaSetu — Auth Store (Zustand)
// ============================================================
import { create } from 'zustand';
import type { User, UserRole } from '@/app/types';
import { clearCachedUserProfile } from '@/lib/auth/profile-cache';

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

const useAuthStore = create<AuthState>((set, get) => ({
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

  clearAuth: () => {
    clearCachedUserProfile();
    set({
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

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
    const effectiveRole =
      (user.role as string) === 'collector' ? 'user' : user.role;
    return roleHierarchy[effectiveRole] >= roleHierarchy[role];
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

// Preserve auth state across Fast Refresh so isLoading does not reset to true
// and unmount the router tree while HMR is applying updates.
const AUTH_STORE_HMR_KEY = '__kalasethu_auth_store__';

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const persisted = (window as unknown as Record<string, Partial<AuthState>>)[AUTH_STORE_HMR_KEY];
  if (persisted) {
    useAuthStore.setState(persisted);
  }

  useAuthStore.subscribe((state) => {
    (window as unknown as Record<string, Partial<AuthState>>)[AUTH_STORE_HMR_KEY] = {
      user: state.user,
      firebaseUser: state.firebaseUser,
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
    };
  });
}

export { useAuthStore };
