// ============================================================
// KalaSetu — Community Messaging Repository
// ============================================================
import {
  collections,
  subcollections,
  docRef,
  db,
  doc,
  getDoc,
  getDocs,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  paginatedQuery,
  type Unsubscribe,
  type PaginatedResult,
  type DocumentSnapshot,
} from '@/lib/firebase/firestore';
import { isValidQueryString } from '@/lib/firebase/query-guards';
import { functions } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';
import type {
  Community,
  CommunityChannel,
  CommunityMember,
  Message,
  PinnedMessage,
} from '@/app/types';

type SnapshotErrorHandler = (error: { code?: string; message?: string }) => void;

function handleSnapshotError(scope: string, error: unknown, onError?: SnapshotErrorHandler) {
  const err = error as { code?: string; message?: string };
  const code = err?.code ?? 'unknown';
  const message = err?.message ?? String(error);
  if (code === 'permission-denied') {
    console.warn(`[community] ${scope} permission-denied:`, message);
  } else {
    console.error(`[community] ${scope} error:`, message);
  }
  onError?.({ code, message });
}

export const communityMessagingRepository = {
  async getCommunity(communityId: string): Promise<Community | null> {
    const snap = await getDoc(docRef.community(communityId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Community;
  },

  async getCommunityByOwner(ownerId: string): Promise<Community | null> {
    if (!isValidQueryString(ownerId)) return null;
    const q = query(
      collections.communities(),
      where('ownerId', '==', ownerId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Community;
  },

  async isCommunityMember(communityId: string, userId: string): Promise<boolean> {
    if (!isValidQueryString(communityId) || !isValidQueryString(userId)) return false;
    const snap = await getDoc(doc(db, 'communities', communityId, 'members', userId));
    if (!snap.exists()) return false;
    return !snap.data()?.isBanned;
  },

  async getAnnouncementsChannelId(communityId: string): Promise<string | null> {
    if (!isValidQueryString(communityId)) return null;
    const q = query(
      subcollections.communityChannels(communityId),
      where('isAnnouncements', '==', true),
      limit(1)
    );
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].id;
  },

  subscribeToUserCommunities(
    userId: string,
    cb: (communities: Community[]) => void,
    onError?: SnapshotErrorHandler
  ): Unsubscribe {
    if (!isValidQueryString(userId)) {
      onError?.({ code: 'invalid-argument', message: 'userId is required' });
      cb([]);
      return () => {};
    }

    const membersQ = query(
      collectionGroup(db, 'members'),
      where('userId', '==', userId),
      limit(50)
    );
    return onSnapshot(
      membersQ,
      async (snap) => {
        const communityIds = [
          ...new Set(
            snap.docs
              .map((d) => d.ref.parent.parent?.id)
              .filter((id): id is string => !!id)
          ),
        ];
        if (communityIds.length === 0) {
          cb([]);
          return;
        }
        const communities: Community[] = [];
        await Promise.all(
          communityIds.map(async (id) => {
            const c = await communityMessagingRepository.getCommunity(id);
            if (c) communities.push(c);
          })
        );
        communities.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        cb(communities);
      },
      (error) => {
        handleSnapshotError('subscribeToUserCommunities members', error, onError);
        cb([]);
      }
    );
  },

  subscribeToChannels(
    communityId: string,
    cb: (channels: CommunityChannel[]) => void,
    onError?: SnapshotErrorHandler
  ): Unsubscribe {
    const q = query(
      subcollections.communityChannels(communityId),
      orderBy('position', 'asc')
    );
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommunityChannel));
      },
      (error) => {
        handleSnapshotError(`subscribeToChannels communities/${communityId}/channels`, error, onError);
        cb([]);
      }
    );
  },

  subscribeToChannelMessages(
    communityId: string,
    channelId: string,
    cb: (messages: Message[]) => void,
    onError?: SnapshotErrorHandler
  ): Unsubscribe {
    const q = query(
      subcollections.channelMessages(communityId, channelId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return onSnapshot(
      q,
      (snap) => {
        const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message);
        cb([...messages].reverse());
      },
      (error) => {
        handleSnapshotError(
          `subscribeToChannelMessages communities/${communityId}/channels/${channelId}/messages`,
          error,
          onError
        );
        cb([]);
      }
    );
  },

  subscribeToMembers(
    communityId: string,
    cb: (members: CommunityMember[]) => void,
    onError?: SnapshotErrorHandler
  ): Unsubscribe {
    const q = query(subcollections.communityMembers(communityId), limit(200));
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, userId: d.id, ...d.data() }) as CommunityMember));
      },
      (error) => {
        handleSnapshotError(`subscribeToMembers communities/${communityId}/members`, error, onError);
        cb([]);
      }
    );
  },

  subscribeToPinnedMessages(
    communityId: string,
    channelId: string,
    cb: (pins: PinnedMessage[]) => void,
    onError?: SnapshotErrorHandler
  ): Unsubscribe {
    const q = query(
      subcollections.communityPinnedMessages(communityId),
      where('channelId', '==', channelId),
      orderBy('pinnedAt', 'desc'),
      limit(50)
    );
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PinnedMessage));
      },
      (error) => {
        handleSnapshotError(
          `subscribeToPinnedMessages communities/${communityId}/pinnedMessages`,
          error,
          onError
        );
        cb([]);
      }
    );
  },

  async getOlderChannelMessages(
    communityId: string,
    channelId: string,
    beforeDoc: DocumentSnapshot,
    pageSize = 30
  ): Promise<PaginatedResult<Message>> {
    const result = await paginatedQuery<Message>(
      subcollections.channelMessages(communityId, channelId),
      [orderBy('createdAt', 'desc')],
      pageSize,
      beforeDoc
    );
    return { ...result, data: [...result.data].reverse() };
  },

  async getMessageSnapshot(
    communityId: string,
    channelId: string,
    messageId: string
  ): Promise<DocumentSnapshot | null> {
    const snap = await getDoc(
      doc(db, 'communities', communityId, 'channels', channelId, 'messages', messageId)
    );
    return snap.exists() ? snap : null;
  },

  async sendChannelMessage(
    communityId: string,
    channelId: string,
    senderName: string,
    content: string,
    replyToMessageId?: string
  ): Promise<string> {
    const fn = httpsCallable(functions, 'sendChannelMessage');
    const result = await fn({
      communityId,
      channelId,
      senderName,
      content,
      type: 'text',
      replyToMessageId,
    });
    const data = result.data as { success: boolean; messageId: string };
    return data.messageId;
  },

  async markChannelRead(communityId: string, channelId: string): Promise<void> {
    const fn = httpsCallable(functions, 'markMessagesRead');
    await fn({ communityId, channelId });
  },

  async joinCommunity(
    communityId: string,
    displayName: string,
    avatarUrl?: string
  ): Promise<void> {
    const fn = httpsCallable(functions, 'joinCommunity');
    await fn({ communityId, displayName, avatarUrl });
  },

  async updateCommunity(
    communityId: string,
    updates: { name?: string; description?: string; avatarUrl?: string }
  ): Promise<void> {
    const fn = httpsCallable(functions, 'updateCommunity');
    await fn({ communityId, ...updates });
  },

  async createChannel(
    communityId: string,
    name: string,
    topic?: string
  ): Promise<string> {
    const fn = httpsCallable(functions, 'createChannel');
    const result = await fn({ communityId, name, topic });
    return (result.data as { channelId: string }).channelId;
  },

  async toggleReaction(
    communityId: string,
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    const fn = httpsCallable(functions, 'toggleReaction');
    await fn({ communityId, channelId, messageId, emoji });
  },

  async pinMessage(
    communityId: string,
    channelId: string,
    messageId: string
  ): Promise<void> {
    const fn = httpsCallable(functions, 'pinMessage');
    await fn({ communityId, channelId, messageId });
  },

  async searchMessages(
    communityId: string,
    channelId: string,
    searchQuery: string
  ): Promise<Message[]> {
    const fn = httpsCallable(functions, 'searchMessages');
    const result = await fn({ communityId, channelId, query: searchQuery });
    return (result.data as { results: Message[] }).results || [];
  },

  async editMessage(params: {
    communityId?: string;
    channelId?: string;
    chatRoomId?: string;
    messageId: string;
    content: string;
  }): Promise<void> {
    const fn = httpsCallable(functions, 'editMessage');
    await fn(params);
  },

  async deleteMessage(params: {
    communityId?: string;
    channelId?: string;
    chatRoomId?: string;
    messageId: string;
  }): Promise<void> {
    const fn = httpsCallable(functions, 'deleteMessage');
    await fn(params);
  },

  async toggleDmReaction(
    chatRoomId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    const fn = httpsCallable(functions, 'toggleReaction');
    await fn({ chatRoomId, messageId, emoji });
  },

  async searchDmMessages(chatRoomId: string, searchQuery: string): Promise<Message[]> {
    const fn = httpsCallable(functions, 'searchMessages');
    const result = await fn({ chatRoomId, query: searchQuery });
    return (result.data as { results: Message[] }).results || [];
  },
};
