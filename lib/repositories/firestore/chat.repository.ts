// ============================================================
// KalaSetu — Chat Repository (Firestore Implementation)
// ============================================================
import {
  collections,
  subcollections,
  docRef,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from '@/lib/firebase/firestore';
import type { ChatRoom, Message } from '@/app/types';

export const chatRepository = {
  async findRoom(roomId: string): Promise<ChatRoom | null> {
    const snap = await getDoc(docRef.chatRoom(roomId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ChatRoom;
  },

  async findDirectRoom(
    uid1: string,
    uid2: string
  ): Promise<ChatRoom | null> {
    // Sort UIDs for deterministic query
    const sorted = [uid1, uid2].sort();
    const q = query(
      collections.chatRooms(),
      where('type', '==', 'direct'),
      where('participants', 'array-contains', sorted[0])
    );
    const snap = await getDocs(q);
    const match = snap.docs.find(d => {
      const parts: string[] = d.data().participants;
      return parts.includes(sorted[1]);
    });
    return match ? ({ id: match.id, ...match.data() } as ChatRoom) : null;
  },

  async createRoom(data: Omit<ChatRoom, 'id'>): Promise<string> {
    const ref = await addDoc(collections.chatRooms(), data);
    return ref.id;
  },



  subscribeToRooms(userId: string, cb: (rooms: ChatRoom[]) => void): Unsubscribe {
    const q = query(
      collections.chatRooms(),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
      limit(30)
    );
    return onSnapshot(q, snap => {
      cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ChatRoom));
    });
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
    cb: (messages: Message[]) => void
  ): Unsubscribe {
    const q = query(
      subcollections.chatMessages(roomId),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    return onSnapshot(q, snap => {
      cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message));
    });
  },

  async sendMessage(roomId: string, message: Omit<Message, 'id'>): Promise<string> {
    const ref = await addDoc(subcollections.chatMessages(roomId), message);
    // Update room last message metadata
    await updateDoc(docRef.chatRoom(roomId), {
      lastMessage: message.content,
      lastMessageAt: message.createdAt,
      lastMessageBy: message.senderId,
      updatedAt: new Date().toISOString(),
    });
    return ref.id;
  },

  async markAsRead(roomId: string, userId: string): Promise<void> {
    await updateDoc(docRef.chatRoom(roomId), {
      [`unreadCount.${userId}`]: 0,
    });
  },
};
