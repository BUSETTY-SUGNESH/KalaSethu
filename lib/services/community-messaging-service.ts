import { communityMessagingRepository } from '@/lib/repositories';
import type {
  Community,
  CommunityChannel,
  CommunityMember,
  Message,
  PinnedMessage,
} from '@/app/types';
import type { DocumentSnapshot, Unsubscribe } from '@/lib/firebase/firestore';

export function subscribeToUserCommunities(
  userId: string,
  cb: (communities: Community[]) => void,
  onError?: (error: { code?: string; message?: string }) => void
): Unsubscribe {
  return communityMessagingRepository.subscribeToUserCommunities(userId, cb, onError);
}

export function subscribeToChannels(
  communityId: string,
  cb: (channels: CommunityChannel[]) => void
): Unsubscribe {
  return communityMessagingRepository.subscribeToChannels(communityId, cb);
}

export function subscribeToChannelMessages(
  communityId: string,
  channelId: string,
  cb: (messages: Message[]) => void
): Unsubscribe {
  return communityMessagingRepository.subscribeToChannelMessages(
    communityId,
    channelId,
    cb
  );
}

export function subscribeToMembers(
  communityId: string,
  cb: (members: CommunityMember[]) => void
): Unsubscribe {
  return communityMessagingRepository.subscribeToMembers(communityId, cb);
}

export function subscribeToPinnedMessages(
  communityId: string,
  channelId: string,
  cb: (pins: PinnedMessage[]) => void
): Unsubscribe {
  return communityMessagingRepository.subscribeToPinnedMessages(
    communityId,
    channelId,
    cb
  );
}

export async function getCommunity(communityId: string) {
  return communityMessagingRepository.getCommunity(communityId);
}

export async function getCommunityByOwner(ownerId: string) {
  return communityMessagingRepository.getCommunityByOwner(ownerId);
}

export async function isCommunityMember(communityId: string, userId: string) {
  return communityMessagingRepository.isCommunityMember(communityId, userId);
}

export async function getAnnouncementsChannelId(communityId: string) {
  return communityMessagingRepository.getAnnouncementsChannelId(communityId);
}

export async function sendChannelMessage(
  communityId: string,
  channelId: string,
  senderName: string,
  content: string,
  replyToMessageId?: string
) {
  return communityMessagingRepository.sendChannelMessage(
    communityId,
    channelId,
    senderName,
    content,
    replyToMessageId
  );
}

export async function markChannelAsRead(communityId: string, channelId: string) {
  return communityMessagingRepository.markChannelRead(communityId, channelId);
}

export async function joinCommunity(
  communityId: string,
  displayName: string,
  avatarUrl?: string
) {
  return communityMessagingRepository.joinCommunity(communityId, displayName, avatarUrl);
}

export async function updateCommunity(
  communityId: string,
  updates: { name?: string; description?: string; avatarUrl?: string }
) {
  return communityMessagingRepository.updateCommunity(communityId, updates);
}

export async function createChannel(communityId: string, name: string, topic?: string) {
  return communityMessagingRepository.createChannel(communityId, name, topic);
}

export async function getOlderChannelMessages(
  communityId: string,
  channelId: string,
  beforeDoc: DocumentSnapshot,
  pageSize?: number
) {
  return communityMessagingRepository.getOlderChannelMessages(
    communityId,
    channelId,
    beforeDoc,
    pageSize
  );
}

export async function getChannelMessageSnapshot(
  communityId: string,
  channelId: string,
  messageId: string
) {
  return communityMessagingRepository.getMessageSnapshot(
    communityId,
    channelId,
    messageId
  );
}

export async function toggleChannelReaction(
  communityId: string,
  channelId: string,
  messageId: string,
  emoji: string
) {
  return communityMessagingRepository.toggleReaction(
    communityId,
    channelId,
    messageId,
    emoji
  );
}

export async function pinChannelMessage(
  communityId: string,
  channelId: string,
  messageId: string
) {
  return communityMessagingRepository.pinMessage(communityId, channelId, messageId);
}

export async function searchChannelMessages(
  communityId: string,
  channelId: string,
  query: string
) {
  return communityMessagingRepository.searchMessages(communityId, channelId, query);
}

export async function editChannelMessage(
  communityId: string,
  channelId: string,
  messageId: string,
  content: string
) {
  return communityMessagingRepository.editMessage({
    communityId,
    channelId,
    messageId,
    content,
  });
}

export async function deleteChannelMessage(
  communityId: string,
  channelId: string,
  messageId: string
) {
  return communityMessagingRepository.deleteMessage({
    communityId,
    channelId,
    messageId,
  });
}

export function sumCommunityUnread(
  channels: CommunityChannel[],
  userId: string
): number {
  return channels.reduce((sum, ch) => sum + (ch.unreadCount[userId] || 0), 0);
}
