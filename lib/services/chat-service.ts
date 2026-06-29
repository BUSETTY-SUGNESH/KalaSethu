// ============================================================
// KalaSetu — Chat / Messaging Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { chatRepository } from '@/lib/repositories';
import { getCurrentUser } from '@/lib/firebase/auth';
import { resolveDisplayName } from '@/lib/utils/display-name';
import type { ChatRoom, Message } from '@/app/types';
import type { DocumentSnapshot, Unsubscribe } from '@/lib/firebase/firestore';

// --- Create or Get Direct Chat Room ---
export async function getOrCreateDirectChatRoom(
  userId1: string,
  userName1: string,
  userAvatar1: string,
  userId2: string,
  userName2: string,
  userAvatar2: string
): Promise<string> {
  const authUid = getCurrentUser()?.uid;
  if (!authUid) {
    throw new Error('Must be signed in to start a chat');
  }
  if (userId1 !== authUid) {
    throw new Error('Can only create chats as the authenticated user');
  }
  if (userId1 === userId2) {
    throw new Error('Cannot create a chat room with yourself');
  }

  return chatRepository.createDirectRoomViaFunction({
    otherUserId: userId2,
    callerName: resolveDisplayName(userName1, getCurrentUser()?.email),
    callerAvatar: userAvatar1 ?? '',
    otherUserName: resolveDisplayName(userName2),
    otherUserAvatar: userAvatar2 ?? '',
  });
}

// --- Get User Chat Rooms ---
export function subscribeToUserChatRooms(
  userId: string,
  callback: (rooms: ChatRoom[]) => void,
  onError?: (error: { code?: string; message?: string }) => void
): Unsubscribe {
  return chatRepository.subscribeToRooms(userId, callback, onError);
}

// --- Send Message ---
export async function sendMessage(
  chatRoomId: string,
  senderId: string,
  senderName: string,
  content: string,
  type: Message['type'] = 'text',
  mediaUrl?: string,
  artworkId?: string,
  replyToMessageId?: string
): Promise<string> {
  const authUid = getCurrentUser()?.uid;
  if (!authUid) {
    throw new Error('Must be signed in to send messages');
  }
  if (senderId !== authUid) {
    throw new Error('Sender must match the authenticated user');
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Message cannot be empty');
  }

  const resolvedName = resolveDisplayName(senderName, getCurrentUser()?.email);
  const now = new Date().toISOString();

  const message: Omit<Message, 'id'> = {
    contextType: 'dm',
    chatRoomId,
    senderId: authUid,
    senderName: resolvedName,
    type,
    content: trimmedContent,
    contentFormat: 'markdown',
    readBy: [authUid],
    createdAt: now,
    isDeleted: false,
  };

  return chatRepository.sendMessage(chatRoomId, message, replyToMessageId);
}

// --- Subscribe to Messages (real-time) ---
export function subscribeToMessages(
  chatRoomId: string,
  userId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: { code?: string; message?: string }) => void
): Unsubscribe {
  return chatRepository.subscribeToMessages(chatRoomId, userId, callback, onError);
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

// --- Start Direct Chat (create room + send first message) ---
export async function startDirectChat(
  userId1: string,
  userName1: string,
  userAvatar1: string,
  userId2: string,
  userName2: string,
  userAvatar2: string,
  content: string
): Promise<string> {
  const roomId = await getOrCreateDirectChatRoom(
    userId1,
    userName1,
    userAvatar1,
    userId2,
    userName2,
    userAvatar2
  );
  await sendMessage(roomId, userId1, userName1, content);
  return roomId;
}

// --- Load Older Messages ---
export async function getOlderMessages(
  chatRoomId: string,
  beforeDoc: DocumentSnapshot,
  pageSize: number = 30
) {
  return chatRepository.getOlderMessages(chatRoomId, beforeDoc, pageSize);
}

export async function getMessageSnapshot(
  chatRoomId: string,
  messageId: string
) {
  return chatRepository.getMessageSnapshot(chatRoomId, messageId);
}

// --- Load More Chat Rooms ---
export async function loadMoreRooms(
  userId: string,
  lastDoc: DocumentSnapshot,
  pageSize: number = 30
) {
  return chatRepository.loadMoreRooms(userId, lastDoc, pageSize);
}

export async function getRoomSnapshot(roomId: string) {
  return chatRepository.getRoomSnapshot(roomId);
}
