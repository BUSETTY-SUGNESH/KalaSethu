// ============================================================
// KalaSetu — Auth Profile Cache
// Persists last-known user profile for offline-safe auth hydration
// ============================================================
import type { User } from '@/app/types';

const CACHE_KEY = 'kalasetu_auth_profile';

interface CachedProfile {
  uid: string;
  profile: User;
}

export function cacheUserProfile(uid: string, profile: User): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CachedProfile = { uid, profile };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Silently fail — corrupt or full storage
  }
}

export function getCachedUserProfile(uid: string): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedProfile;
    if (entry.uid !== uid) return null;
    return entry.profile;
  } catch {
    return null;
  }
}

export function clearCachedUserProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // Silently fail
  }
}
