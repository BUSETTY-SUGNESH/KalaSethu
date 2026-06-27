// ============================================================
// KalaSetu — Banned User Enforcement
// Signs out and redirects suspended accounts after profile load
// ============================================================
import { signOut } from '@/lib/firebase/auth';
import { clearCachedUserProfile } from '@/lib/auth/profile-cache';
import type { User } from '@/app/types';

export const BANNED_PATH = '/banned';

/** Returns true when the profile is banned and the user was rejected. */
export async function rejectIfBanned(profile: User): Promise<boolean> {
  if (!profile.isBanned) return false;

  try {
    await signOut();
  } catch {
    // Continue clearing local state even if Firebase sign-out fails
  }

  clearCachedUserProfile();

  if (typeof window !== 'undefined' && !window.location.pathname.startsWith(BANNED_PATH)) {
    window.location.replace(BANNED_PATH);
  }

  return true;
}
