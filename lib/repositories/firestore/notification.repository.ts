// ============================================================
// KalaSetu — Notification Repository (Firestore Implementation)
// ============================================================
import {
  subcollections,
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
  async findById(userId: string, id: string): Promise<Notification | null> {
    const snap = await getDoc(docRef.userNotification(userId, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Notification;
  },

  async create(data: Omit<Notification, 'id'>): Promise<string> {
    const ref = await addDoc(subcollections.userNotifications(data.userId), data);
    return ref.id;
  },

  async markRead(userId: string, id: string): Promise<void> {
    await updateDoc(docRef.userNotification(userId, id), { isRead: true });
  },

  async markAllRead(userId: string): Promise<void> {
    const q = query(
      subcollections.userNotifications(userId),
      where('isRead', '==', false),
      limit(100)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit();
  },

  async delete(userId: string, id: string): Promise<void> {
    await deleteDoc(docRef.userNotification(userId, id));
  },

  async getForUser(
    userId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Notification>> {
    return paginatedQuery<Notification>(
      subcollections.userNotifications(userId),
      [orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  async getUnreadCount(userId: string): Promise<number> {
    const q = query(
      subcollections.userNotifications(userId),
      where('isRead', '==', false),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.size;
  },
};
