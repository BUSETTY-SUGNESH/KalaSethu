'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { onAuthStateChanged } from '@/lib/firebase/auth';
import { subscribeToUserChatRooms } from '@/lib/services/chat-service';
import { subscribeToUserCommunities, subscribeToChannels, sumCommunityUnread } from '@/lib/services/community-messaging-service';
import { setUserOnline } from '@/lib/services/presence-service';
import { useUIStore } from '@/lib/stores/ui-store';
import type { ChatRoom, Community, CommunityChannel } from '@/app/types';

interface MessagingContextValue {
  chatRooms: ChatRoom[];
  communities: Community[];
  communityChannels: Record<string, CommunityChannel[]>;
  isLoadingRooms: boolean;
  refreshCommunityChannels: (communityId: string) => void;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communityChannels, setCommunityChannels] = useState<Record<string, CommunityChannel[]>>({});
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const { setUnreadMessageCount, setUnreadCommunityCount } = useUIStore();

  useEffect(() => {
    let unsubRooms: (() => void) | undefined;
    let unsubCommunities: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged((firebaseUser) => {
      unsubRooms?.();
      unsubCommunities?.();

      if (!firebaseUser) {
        setAuthUserId(null);
        setChatRooms([]);
        setCommunities([]);
        setIsLoadingRooms(false);
        setUnreadMessageCount(0);
        setUnreadCommunityCount(0);
        return;
      }

      const uid = firebaseUser.uid;
      setAuthUserId(uid);
      setIsLoadingRooms(true);
      void setUserOnline(uid);

      unsubRooms = subscribeToUserChatRooms(
        uid,
        (rooms) => {
          setChatRooms(rooms);
          setIsLoadingRooms(false);
          const dmUnread = rooms.reduce((sum, room) => {
            if (room.lastMessageBy === uid) return sum;
            return sum + (room.unreadCount[uid] || 0);
          }, 0);
          setUnreadMessageCount(dmUnread);
        },
        (err) => {
          setIsLoadingRooms(false);
          if (err.code === 'permission-denied') {
            console.warn('[messaging] chatRooms subscription denied');
          }
          setChatRooms([]);
          setUnreadMessageCount(0);
        }
      );

      unsubCommunities = subscribeToUserCommunities(
        uid,
        (comms) => {
          setCommunities(comms);
        },
        (err) => {
          if (err.code === 'permission-denied') {
            console.warn('[messaging] communities subscription denied');
          }
          setCommunities([]);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubRooms?.();
      unsubCommunities?.();
    };
  }, [setUnreadMessageCount, setUnreadCommunityCount]);

  useEffect(() => {
    if (!authUserId || communities.length === 0) {
      setCommunityChannels({});
      setUnreadCommunityCount(0);
      return;
    }

    const unsubs = communities.map((c) =>
      subscribeToChannels(c.id, (channels) => {
        setCommunityChannels((prev) => ({ ...prev, [c.id]: channels }));
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [communities, authUserId, setUnreadCommunityCount]);

  useEffect(() => {
    if (!authUserId) return;
    let total = 0;
    Object.values(communityChannels).forEach((channels) => {
      total += sumCommunityUnread(channels, authUserId);
    });
    setUnreadCommunityCount(total);
  }, [communityChannels, authUserId, setUnreadCommunityCount]);

  const refreshCommunityChannels = useCallback((_communityId: string) => {
    // Channels update via realtime subscription
  }, []);

  return (
    <MessagingContext.Provider
      value={{
        chatRooms,
        communities,
        communityChannels,
        isLoadingRooms,
        refreshCommunityChannels,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) {
    throw new Error('useMessaging must be used within MessagingProvider');
  }
  return ctx;
}

export function useMessagingOptional() {
  return useContext(MessagingContext);
}
