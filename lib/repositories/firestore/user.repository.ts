// ============================================================
// KalaSetu — User Repository (Firestore Implementation)
// Encapsulates all Firestore reads/writes for the users collection.
// Future: swap this file for a SQL implementation without changing services.
// ============================================================
import {
  collections,
  docRef,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  paginatedQuery,
  type DocumentSnapshot,
} from '@/lib/firebase/firestore';
import type { User, UserProfile, UserRole, PaginatedResult } from '@/app/types';

export const userRepository = {
  /** Fetch a single user by UID */
  async findById(uid: string): Promise<User | null> {
    const snap = await getDoc(docRef.user(uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as User;
  },

  /** Create a new user document (called after Firebase Auth signup) */
  async create(uid: string, data: Omit<User, 'id'>): Promise<void> {
    await setDoc(docRef.user(uid), data);
  },

  /** Update a user document (partial) */
  async update(uid: string, data: Partial<User>): Promise<void> {
    const { id: _id, createdAt: _ca, ...rest } = data as User & { id?: string };
    await updateDoc(docRef.user(uid), {
      ...rest,
      updatedAt: new Date().toISOString(),
    });
  },

  /** Update last login timestamp */
  async touchLastLogin(uid: string): Promise<void> {
    await updateDoc(docRef.user(uid), {
      lastLoginAt: new Date().toISOString(),
    });
  },

  /** Set a user's role (admin only action) */
  async setRole(uid: string, role: UserRole): Promise<void> {
    await updateDoc(docRef.user(uid), {
      role,
      isVerified: role === 'verified_artist',
      updatedAt: new Date().toISOString(),
    });
  },

  /** Prefix search on displayName */
  async searchByName(term: string, max: number = 20): Promise<UserProfile[]> {
    const q = query(
      collections.users(),
      where('displayName', '>=', term),
      where('displayName', '<=', term + '\uf8ff'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as UserProfile);
  },

  /** Get users by role with pagination */
  async findByRole(
    role: UserRole,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<UserProfile>> {
    return paginatedQuery<UserProfile>(
      collections.users(),
      [where('role', '==', role), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  /** Get featured/verified artists by follower count */
  async findFeaturedArtists(count: number = 10): Promise<UserProfile[]> {
    const q = query(
      collections.users(),
      where('role', 'in', ['artist', 'verified_artist']),
      where('isVerified', '==', true),
      orderBy('followerCount', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as UserProfile);
  },

  /** Check if a user document exists */
  async exists(uid: string): Promise<boolean> {
    const snap = await getDoc(docRef.user(uid));
    return snap.exists();
  },
};
