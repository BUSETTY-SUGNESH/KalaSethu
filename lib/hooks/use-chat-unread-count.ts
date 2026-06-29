'use client';

// Unread counts are managed by MessagingProvider in dashboard layout.
// This hook is kept for Header usage outside dashboard (optional fallback).
import { useEffect } from 'react';
import { onAuthStateChanged } from '@/lib/firebase/auth';
import { subscribeToUserChatRooms } from '@/lib/services/chat-service';
import { useUIStore } from '@/lib/stores/ui-store';
import { useMessagingOptional } from '@/lib/contexts/messaging-context';

export function useChatUnreadCount(_userId: string | undefined) {
  const messaging = useMessagingOptional();
  const { setUnreadMessageCount, unreadMessageCount } = useUIStore();

  useEffect(() => {
    if (messaging) return;

    let unsubRooms: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged((firebaseUser) => {
      unsubRooms?.();
      if (!firebaseUser) {
        setUnreadMessageCount(0);
        return;
      }

      unsubRooms = subscribeToUserChatRooms(firebaseUser.uid, (rooms) => {
        const total = rooms.reduce((sum, room) => {
          if (room.lastMessageBy === firebaseUser.uid) return sum;
          return sum + (room.unreadCount[firebaseUser.uid] || 0);
        }, 0);
        setUnreadMessageCount(total);
      });
    });

    return () => {
      unsubAuth();
      unsubRooms?.();
    };
  }, [setUnreadMessageCount, messaging]);

  return unreadMessageCount;
}
