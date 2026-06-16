// ============================================================
// KalaSetu — Notification Repository (Firestore Implementation)
// ============================================================
import {
  collections,
  docRef,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  db,
  query,
  where,
  orderBy,
  limit,
  paginatedQuery,
  type DocumentSnapshot,
} from '@/lib/firebase/firestore';
import type { Notification, PaginatedResult } from '@/app/types';

export const notificationRepository = {
  async findById(id: string): Promise<Notification | null> {
    const snap = await getDoc(docRef.notification(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Notification;
  },

  async create(data: Omit<Notification, 'id'>): Promise<string> {
    const ref = await addDoc(collections.notifications(), data);
    return ref.id;
  },

  async markRead(id: string): Promise<void> {
    await updateDoc(docRef.notification(id), { isRead: true });
  },

  async markAllRead(userId: string): Promise<void> {
    const q = query(
      collections.notifications(),
      where('userId', '==', userId),
      where('isRead', '==', false),
      limit(100)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit();
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(docRef.notification(id));
  },

  async getForUser(
    userId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Notification>> {
    return paginatedQuery<Notification>(
      collections.notifications(),
      [where('userId', '==', userId), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  async getUnreadCount(userId: string): Promise<number> {
    const q = query(
      collections.notifications(),
      where('userId', '==', userId),
      where('isRead', '==', false),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.size;
  },
};
