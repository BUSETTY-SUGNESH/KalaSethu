// ============================================================
// KalaSetu — User Repository (Firestore Implementation)
// Encapsulates all Firestore reads/writes for the users collection.
// Future: swap this file for a SQL implementation without changing services.
// ============================================================
import {
  collections,
  subcollections,
  docRef,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  db,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  paginatedQuery,
  type DocumentSnapshot,
} from '@/lib/firebase/firestore';
import type { User, UserProfile, UserRole, UserAddress, PaginatedResult } from '@/app/types';

/** Map legacy Firestore role values to the frontend UserRole union */
function normalizeUser<T extends { role: string }>(doc: T): T & { role: UserRole } {
  const role = doc.role === 'collector' ? 'user' : doc.role;
  return { ...doc, role } as T & { role: UserRole };
}

export const userRepository = {
  /** Fetch a single user by UID */
  async findById(uid: string): Promise<User | null> {
    const snap = await getDoc(docRef.user(uid));
    if (!snap.exists()) return null;
    return normalizeUser({ id: snap.id, ...snap.data() } as User);
  },

  /** Create a new user document (called after Firebase Auth signup) */
  async create(uid: string, data: Omit<User, 'id'>): Promise<void> {
    await setDoc(docRef.user(uid), data, { merge: true });
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
  async searchByName(term: string, max: number = 20): Promise<User[]> {
    const q = query(
      collections.users(),
      where('displayName', '>=', term),
      where('displayName', '<=', term + '\uf8ff'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeUser({ id: d.id, ...d.data() } as User));
  },

  /** Get users by role with pagination */
  async findByRole(
    role: UserRole,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<UserProfile>> {
    const result = await paginatedQuery<UserProfile>(
      collections.users(),
      [where('role', '==', role), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
    return {
      ...result,
      data: result.data.map((item) => normalizeUser(item)),
    };
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
    return snap.docs.map(d => normalizeUser({ id: d.id, ...d.data() } as UserProfile));
  },

  /** Check if a user document exists */
  async exists(uid: string): Promise<boolean> {
    const snap = await getDoc(docRef.user(uid));
    return snap.exists();
  },

  /** Find all users with pagination (admin only action) */
  async findAll(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<User>> {
    const result = await paginatedQuery<User>(
      collections.users(),
      [orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
    return {
      ...result,
      data: result.data.map((item) => normalizeUser(item)),
    };
  },

  /** Ban/Unban user (admin only action) */
  async setBannedStatus(uid: string, isBanned: boolean): Promise<void> {
    await updateDoc(docRef.user(uid), {
      isBanned,
      updatedAt: new Date().toISOString(),
    });
  },

  /** Get all saved addresses for a user */
  async getAddresses(userId: string): Promise<UserAddress[]> {
    const q = query(subcollections.userAddresses(userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as UserAddress);
  },

  /** Create a new saved address for a user */
  async createAddress(userId: string, address: Omit<UserAddress, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString();
    
    // If this is the first address, make it the default
    const existing = await this.getAddresses(userId);
    const isDefault = existing.length === 0 ? true : !!(address as any).isDefault;

    const data = {
      ...address,
      isDefault,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await addDoc(subcollections.userAddresses(userId), data);

    // If this is marked default, unset default on other addresses
    if (isDefault && existing.length > 0) {
      await this.setDefaultAddress(userId, ref.id);
    }

    return ref.id;
  },

  /** Update an existing saved address for a user */
  async updateAddress(userId: string, addressId: string, address: Partial<UserAddress>): Promise<void> {
    await updateDoc(docRef.userAddress(userId, addressId), {
      ...address,
      updatedAt: new Date().toISOString(),
    });

    if (address.isDefault) {
      await this.setDefaultAddress(userId, addressId);
    }
  },

  /** Delete a saved address for a user */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const docRefToDel = docRef.userAddress(userId, addressId);
    const snap = await getDoc(docRefToDel);
    const isDefault = snap.exists() ? snap.data().isDefault : false;

    await deleteDoc(docRefToDel);

    // If we deleted the default address, set another one as default
    if (isDefault) {
      const remaining = await this.getAddresses(userId);
      if (remaining.length > 0) {
        await this.setDefaultAddress(userId, remaining[0].id);
      }
    }
  },

  /** Mark a specific address as default and unset other default addresses */
  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    const q = query(subcollections.userAddresses(userId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(doc => {
      batch.update(doc.ref, {
        isDefault: doc.id === addressId,
        updatedAt: new Date().toISOString()
      });
    });
    await batch.commit();
  },
};
