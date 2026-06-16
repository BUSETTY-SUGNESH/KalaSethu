// ============================================================
// KalaSetu — Chat / Messaging Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { chatRepository } from '@/lib/repositories';
import type { ChatRoom, Message } from '@/app/types';
import type { Unsubscribe } from '@/lib/firebase/firestore';

// --- Create or Get Direct Chat Room ---
export async function getOrCreateDirectChatRoom(
  userId1: string,
  userName1: string,
  userAvatar1: string,
  userId2: string,
  userName2: string,
  userAvatar2: string
): Promise<string> {
  // Check for existing room between these two users
  const existing = await chatRepository.findDirectRoom(userId1, userId2);
  if (existing) {
    return existing.id;
  }

  // Create new room
  const now = new Date().toISOString();
  const room: Omit<ChatRoom, 'id'> = {
    type: 'direct',
    participants: [userId1, userId2],
    participantNames: { [userId1]: userName1, [userId2]: userName2 },
    participantAvatars: { [userId1]: userAvatar1, [userId2]: userAvatar2 },
    lastMessage: undefined,
    lastMessageAt: undefined,
    lastMessageBy: undefined,
    unreadCount: { [userId1]: 0, [userId2]: 0 },
    createdAt: now,
    updatedAt: now,
  };

  return chatRepository.createRoom(room);
}

// --- Get User Chat Rooms ---
export function subscribeToUserChatRooms(
  userId: string,
  callback: (rooms: ChatRoom[]) => void
): Unsubscribe {
  return chatRepository.subscribeToRooms(userId, callback);
}

// --- Send Message ---
export async function sendMessage(
  chatRoomId: string,
  senderId: string,
  senderName: string,
  content: string,
  type: Message['type'] = 'text',
  mediaUrl?: string,
  artworkId?: string
): Promise<string> {
  const now = new Date().toISOString();

  const message: Omit<Message, 'id'> = {
    chatRoomId,
    senderId,
    senderName,
    type,
    content,
    mediaUrl,
    artworkId,
    readBy: [senderId],
    createdAt: now,
    isDeleted: false,
  };

  const room = await chatRepository.findRoom(chatRoomId);
  if (room) {
    // Unread counts are handled in the repository logic if we move it there, 
    // but right now chatRepository.sendMessage handles the room update.
    return chatRepository.sendMessage(chatRoomId, message);
  }
  throw new Error("Room not found");
}

// --- Subscribe to Messages (real-time) ---
export function subscribeToMessages(
  chatRoomId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  return chatRepository.subscribeToMessages(chatRoomId, callback);
}

// --- Mark Messages as Read ---
export async function markMessagesAsRead(
  chatRoomId: string,
  userId: string
): Promise<void> {
  return chatRepository.markAsRead(chatRoomId, userId);
}

// --- Get Chat Room ---
export async function getChatRoom(roomId: string): Promise<ChatRoom | null> {
  return chatRepository.findRoom(roomId);
}
