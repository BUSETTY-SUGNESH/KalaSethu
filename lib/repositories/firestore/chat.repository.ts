// ============================================================
// KalaSetu — Chat Repository (Firestore Implementation)
// ============================================================
import {
  collections,
  subcollections,
  docRef,
  db,
  doc,
  getDoc,
  getDocs,
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
import { functions } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';
import { getCurrentUser } from '@/lib/firebase/auth';
import type { ChatRoom, Message } from '@/app/types';

type SnapshotErrorHandler = (error: { code?: string; message?: string }) => void;

function handleSnapshotError(scope: string, error: unknown, onError?: SnapshotErrorHandler) {
  const err = error as { code?: string; message?: string };
  const code = err?.code ?? 'unknown';
  const message = err?.message ?? String(error);
  if (code === 'permission-denied') {
    console.warn(`[chat] ${scope} permission-denied:`, message);
  } else {
    console.error(`[chat] ${scope} error:`, message);
  }
  onError?.({ code, message });
}

function resolveAuthUid(requestedUserId?: string): string | null {
  const authUid = getCurrentUser()?.uid ?? null;
  if (!authUid) return null;
  if (requestedUserId && requestedUserId !== authUid) {
    console.warn('[chat] Ignoring requested userId; using auth.uid for Firestore query');
  }
  return authUid;
}

export const chatRepository = {
  async findRoom(roomId: string): Promise<ChatRoom | null> {
    const snap = await getDoc(docRef.chatRoom(roomId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ChatRoom;
  },

  async getRoomSnapshot(roomId: string): Promise<DocumentSnapshot | null> {
    const snap = await getDoc(docRef.chatRoom(roomId));
    return snap.exists() ? snap : null;
  },

  async getMessageSnapshot(
    roomId: string,
    messageId: string
  ): Promise<DocumentSnapshot | null> {
    const snap = await getDoc(
      doc(db, 'chatRooms', roomId, 'messages', messageId)
    );
    return snap.exists() ? snap : null;
  },

  async findDirectRoom(
    uid1: string,
    uid2: string,
    forUserId: string
  ): Promise<ChatRoom | null> {
    const authUid = resolveAuthUid(forUserId);
    if (!authUid) return null;

    const q = query(
      collections.chatRooms(),
      where('type', '==', 'direct'),
      where('participants', 'array-contains', authUid)
    );
    const snap = await getDocs(q);
    const match = snap.docs.find((d) => {
      const parts: string[] = d.data().participants ?? [];
      return parts.includes(uid1) && parts.includes(uid2);
    });
    return match ? ({ id: match.id, ...match.data() } as ChatRoom) : null;
  },

  async createDirectRoomViaFunction(params: {
    otherUserId: string;
    callerName: string;
    callerAvatar: string;
    otherUserName: string;
    otherUserAvatar: string;
  }): Promise<string> {
    const fn = httpsCallable(functions, 'getOrCreateDirectChatRoom');
    const result = await fn(params);
    return (result.data as { roomId: string }).roomId;
  },



  subscribeToRooms(
    userId: string,
    cb: (rooms: ChatRoom[]) => void,
    onError?: SnapshotErrorHandler
  ): Unsubscribe {
    const authUid = resolveAuthUid(userId);
    if (!authUid) {
      onError?.({ code: 'unauthenticated', message: 'No authenticated Firebase user' });
      cb([]);
      return () => {};
    }

    const q = query(
      collections.chatRooms(),
      where('participants', 'array-contains', authUid),
      orderBy('updatedAt', 'desc'),
      limit(30)
    );
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatRoom));
      },
      (error) => {
        handleSnapshotError('subscribeToRooms chatRooms', error, onError);
        cb([]);
      }
    );
  },

  // ── Messages ──────────────────────────────────────────────

  async getMessages(roomId: string, max: number = 50): Promise<Message[]> {
    const q = query(
      subcollections.chatMessages(roomId),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message).reverse();
  },

  subscribeToMessages(
    roomId: string,
    _userId: string,
    cb: (messages: Message[]) => void,
    onError?: SnapshotErrorHandler
  ): Unsubscribe {
    const q = query(
      subcollections.chatMessages(roomId),
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
        handleSnapshotError(`subscribeToMessages chatRooms/${roomId}/messages`, error, onError);
        cb([]);
      }
    );
  },

  async getOlderMessages(
    roomId: string,
    beforeDoc: DocumentSnapshot,
    pageSize: number = 30
  ): Promise<PaginatedResult<Message>> {
    const result = await paginatedQuery<Message>(
      subcollections.chatMessages(roomId),
      [orderBy('createdAt', 'desc')],
      pageSize,
      beforeDoc
    );
    return {
      ...result,
      data: [...result.data].reverse(),
    };
  },

  async loadMoreRooms(
    userId: string,
    lastDoc: DocumentSnapshot,
    pageSize: number = 30
  ): Promise<PaginatedResult<ChatRoom>> {
    const authUid = resolveAuthUid(userId);
    if (!authUid) {
      return { data: [], hasMore: false, lastDoc: null };
    }

    return paginatedQuery<ChatRoom>(
      collections.chatRooms(),
      [
        where('participants', 'array-contains', authUid),
        orderBy('updatedAt', 'desc'),
      ],
      pageSize,
      lastDoc
    );
  },

  async sendMessage(
    roomId: string,
    message: Omit<Message, 'id'>,
    replyToMessageId?: string
  ): Promise<string> {
    const sendFn = httpsCallable(functions, 'sendChatMessage');
    const payload: Record<string, string> = {
      chatRoomId: roomId,
      senderId: message.senderId,
      senderName: message.senderName,
      type: message.type,
      content: message.content,
    };
    if (message.mediaUrl) payload.mediaUrl = message.mediaUrl;
    if (message.artworkId) payload.artworkId = message.artworkId;
    if (replyToMessageId) payload.replyToMessageId = replyToMessageId;

    const result = await sendFn(payload);
    const data = result.data as { success: boolean; messageId: string };
    return data.messageId;
  },

  async markAsRead(roomId: string, userId: string): Promise<void> {
    const fn = httpsCallable(functions, 'markMessagesRead');
    await fn({ chatRoomId: roomId });
  },

  async editMessage(roomId: string, messageId: string, content: string): Promise<void> {
    const fn = httpsCallable(functions, 'editMessage');
    await fn({ chatRoomId: roomId, messageId, content });
  },

  async deleteMessage(roomId: string, messageId: string): Promise<void> {
    const fn = httpsCallable(functions, 'deleteMessage');
    await fn({ chatRoomId: roomId, messageId });
  },

  async toggleReaction(roomId: string, messageId: string, emoji: string): Promise<void> {
    const fn = httpsCallable(functions, 'toggleReaction');
    await fn({ chatRoomId: roomId, messageId, emoji });
  },

  async searchMessages(roomId: string, searchQuery: string): Promise<Message[]> {
    const fn = httpsCallable(functions, 'searchMessages');
    const result = await fn({ chatRoomId: roomId, query: searchQuery });
    return (result.data as { results: Message[] }).results || [];
  },
};
