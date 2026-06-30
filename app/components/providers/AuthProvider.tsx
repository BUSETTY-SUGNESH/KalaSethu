// ============================================================
// KalaSetu — Auth Provider
// Listens to Firebase Auth state and hydrates user profile
// ============================================================
'use client';

import { useEffect, type ReactNode } from 'react';
import { onAuthStateChanged } from '@/lib/firebase/auth';
import { syncServerSession, clearServerSession } from '@/lib/auth/session-client';
import { getUserProfile, createUserProfile, updateLastLogin } from '@/lib/services/user-service';
import { cacheUserProfile, getCachedUserProfile } from '@/lib/auth/profile-cache';
import { rejectIfBanned } from '@/lib/auth/banned-user';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCartStore } from '@/lib/stores/cart-store';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setFirebaseUser, setLoading, clearAuth } = useAuthStore();
  const setCartUser = useCartStore((s) => s.setCartUser);

  useEffect(() => {
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
            if (await rejectIfBanned(profile)) {
              setCartUser(null);
              clearAuth();
              setLoading(false);
              return;
            }

            // Update email verification status
            if (firebaseUser.emailVerified !== profile.isEmailVerified) {
              profile.isEmailVerified = firebaseUser.emailVerified;
            }
            setUser(profile);
            setCartUser(profile.id);
            cacheUserProfile(firebaseUser.uid, profile);
            await syncServerSession(firebaseUser);
            // Update last login timestamp
            updateLastLogin(firebaseUser.uid).catch(() => {
              // Non-critical — silently ignore
            });
          }
        } catch (error: any) {
          if (error.message?.toLowerCase().includes('offline') || error.code === 'unavailable') {
            const cached = getCachedUserProfile(firebaseUser.uid);
            if (cached) {
              if (await rejectIfBanned(cached)) {
                setCartUser(null);
                clearAuth();
                setLoading(false);
                return;
              }
              console.warn('Firestore unreachable — using cached profile for auth state.');
              setUser(cached);
              setCartUser(cached.id);
              await syncServerSession(firebaseUser);
            } else {
              console.warn('Firestore unreachable and no cached profile — denying auth until online.');
              setCartUser(null);
              clearAuth();
            }
          } else {
            console.error('Error loading user profile:', error);
            setCartUser(null);
            clearAuth();
          }
        }
      } else {
        await clearServerSession();
        setCartUser(null);
        clearAuth();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setFirebaseUser, setLoading, clearAuth, setCartUser]);

  return <>{children}</>;
}
