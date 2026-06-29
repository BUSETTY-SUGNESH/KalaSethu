// Re-exports unified messaging API (DM layer)
export {
  getOrCreateDirectChatRoom,
  subscribeToUserChatRooms,
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
  getChatRoom,
  startDirectChat,
  getOlderMessages,
  getMessageSnapshot,
  loadMoreRooms,
  getRoomSnapshot,
} from '@/lib/services/chat-service';

import { chatRepository } from '@/lib/repositories';

export async function editDmMessage(
  chatRoomId: string,
  messageId: string,
  content: string
): Promise<void> {
  return chatRepository.editMessage(chatRoomId, messageId, content);
}

export async function deleteDmMessage(
  chatRoomId: string,
  messageId: string
): Promise<void> {
  return chatRepository.deleteMessage(chatRoomId, messageId);
}

export async function toggleDmReaction(
  chatRoomId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  return chatRepository.toggleReaction(chatRoomId, messageId, emoji);
}

export async function searchDmMessages(
  chatRoomId: string,
  query: string
): Promise<import('@/app/types').Message[]> {
  return chatRepository.searchMessages(chatRoomId, query);
}

export async function sendDmMessage(
  chatRoomId: string,
  senderId: string,
  senderName: string,
  content: string,
  replyToMessageId?: string
): Promise<string> {
  const now = new Date().toISOString();
  return chatRepository.sendMessage(
    chatRoomId,
    {
      contextType: 'dm',
      chatRoomId,
      senderId,
      senderName,
      type: 'text',
      content,
      contentFormat: 'markdown',
      readBy: [senderId],
      createdAt: now,
      isDeleted: false,
    },
    replyToMessageId
  );
}
