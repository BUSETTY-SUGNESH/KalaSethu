// ============================================================
// KalaSetu — Auth Provider
// Listens to Firebase Auth state and hydrates user profile
// ============================================================
'use client';

import { useEffect, type ReactNode } from 'react';
import { onAuthStateChanged } from '@/lib/firebase/auth';
import { getUserProfile, createUserProfile, updateLastLogin } from '@/lib/services/user-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCartStore } from '@/lib/stores/cart-store';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setFirebaseUser, setLoading, clearAuth } = useAuthStore();
  const hydrateCart = useCartStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    // Hydrate cart from localStorage on mount
    hydrateCart();

    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Store Firebase user basic info
        setFirebaseUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
        });

        try {
          // Fetch full user profile from Firestore
          let profile = await getUserProfile(firebaseUser.uid);

          if (!profile) {
            // User exists in Auth but not in Firestore (e.g., Google sign-in first time)
            await createUserProfile(firebaseUser.uid, {
              displayName: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              avatarUrl: firebaseUser.photoURL || undefined,
              role: 'user',
            });
            profile = await getUserProfile(firebaseUser.uid);
          }

          if (profile) {
            // Update email verification status
            if (firebaseUser.emailVerified !== profile.isEmailVerified) {
              profile.isEmailVerified = firebaseUser.emailVerified;
            }
            setUser(profile);
            // Update last login timestamp
            updateLastLogin(firebaseUser.uid).catch(() => {
              // Non-critical — silently ignore
            });
          }
        } catch (error: any) {
          // Graceful degradation if Firestore is unreachable (e.g., database not created in console)
          if (error.message?.toLowerCase().includes('offline') || error.code === 'unavailable') {
            console.warn("Firestore is unreachable (offline). Proceeding with limited auth state based on Firebase Auth.");
            setUser({
              id: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: 'user',
              avatarUrl: firebaseUser.photoURL || undefined,
              isVerified: false,
              isEmailVerified: firebaseUser.emailVerified,
              isPhoneVerified: false,
              isBanned: false,
              artworkCount: 0,
              followerCount: 0,
              followingCount: 0,
              salesCount: 0,
              totalRevenue: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            });
          } else {
            console.error('Error loading user profile:', error);
            clearAuth();
          }
        }
      } else {
        clearAuth();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setFirebaseUser, setLoading, clearAuth, hydrateCart]);

  return <>{children}</>;
}
