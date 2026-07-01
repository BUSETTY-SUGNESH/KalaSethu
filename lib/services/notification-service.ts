// ============================================================
// KalaSetu — Notification Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { notificationRepository } from '@/lib/repositories';
import type { Notification, NotificationType, PaginatedResult } from '@/app/types';
import {
  query,
  orderBy,
  limit,
  onSnapshot,
  subcollections,
  type DocumentSnapshot,
  type Unsubscribe,
  type QuerySnapshot,
} from '@/lib/firebase/firestore';

// --- Create Notification ---
export async function createNotification(
  userId: string,
  data: {
    type: NotificationType;
    title: string;
    message: string;
    imageUrl?: string;
    actionUrl?: string;
    relatedId?: string;
    relatedType?: Notification['relatedType'];
  }
): Promise<string> {
  const notification: Omit<Notification, 'id'> = {
    userId,
    ...data,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  return notificationRepository.create(notification);
}

// --- Get User Notifications ---
export async function getUserNotifications(
  userId: string,
  pageSize: number = 30,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Notification>> {
  return notificationRepository.getForUser(userId, pageSize, lastDoc);
}

// --- Subscribe to Notifications (real-time) ---
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const q = query(
    subcollections.userNotifications(userId),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const notifications = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Notification
      );
      callback(notifications);
    },
    (error: unknown) => {
      const code = (error as { code?: string })?.code ?? 'unknown';
      if (code === 'permission-denied') {
        console.warn('[notifications] subscription permission-denied');
      } else {
        console.error(
          '[notifications] subscription error:',
          error instanceof Error ? error.message : error
        );
      }
      callback([]);
    }
  );
}

// --- Get Unread Count ---
export async function getUnreadCount(userId: string): Promise<number> {
  return notificationRepository.getUnreadCount(userId);
}

// --- Mark as Read ---
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<void> {
  return notificationRepository.markRead(userId, notificationId);
}

// --- Mark All as Read ---
export async function markAllNotificationsAsRead(
  userId: string
): Promise<void> {
  return notificationRepository.markAllRead(userId);
}
