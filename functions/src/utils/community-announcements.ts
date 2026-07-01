import * as admin from 'firebase-admin';
import {
  buildContentLower,
  lastMessagePreview,
  truncatePreview,
} from './messaging-utils';

export type CommunityAnnouncementEvent =
  | 'artwork_published'
  | 'auction_created'
  | 'event_created'
  | 'announcement';

export interface CommunityAnnouncementPayload {
  event: CommunityAnnouncementEvent;
  title: string;
  body: string;
  actionUrl?: string;
  artworkId?: string;
  auctionId?: string;
  eventId?: string;
}

function buildAnnouncementMarkdown(payload: CommunityAnnouncementPayload): string {
  const link = payload.actionUrl
    ? `[${payload.title}](${payload.actionUrl})`
    : payload.title;
  return `${link}\n\n${payload.body}`;
}

/**
 * Posts a system message to the artist's #announcements channel when a community exists.
 */
export async function postArtistCommunityAnnouncement(
  db: admin.firestore.Firestore,
  ownerId: string,
  payload: CommunityAnnouncementPayload
): Promise<{ posted: boolean; communityId?: string; messageId?: string }> {
  if (!ownerId) return { posted: false };

  const communitiesSnap = await db
    .collection('communities')
    .where('ownerId', '==', ownerId)
    .limit(1)
    .get();

  if (communitiesSnap.empty) return { posted: false };

  const communityDoc = communitiesSnap.docs[0];
  const communityId = communityDoc.id;
  const communityName = communityDoc.data()?.name || 'Community';

  const channelsSnap = await db
    .collection('communities')
    .doc(communityId)
    .collection('channels')
    .where('isAnnouncements', '==', true)
    .limit(1)
    .get();

  if (channelsSnap.empty) return { posted: false, communityId };

  const channelDoc = channelsSnap.docs[0];
  const channelId = channelDoc.id;
  const content = buildAnnouncementMarkdown(payload);
  const now = new Date().toISOString();

  const messageRef = db
    .collection('communities')
    .doc(communityId)
    .collection('channels')
    .doc(channelId)
    .collection('messages')
    .doc();

  await messageRef.set({
    contextType: 'channel',
    communityId,
    channelId,
    senderId: 'system',
    senderName: communityName,
    type: 'system',
    content,
    contentFormat: 'markdown',
    contentLower: buildContentLower(content),
    actionUrl: payload.actionUrl || null,
    artworkId: payload.artworkId || null,
    auctionId: payload.auctionId || null,
    eventId: payload.eventId || null,
    replyToMessageId: null,
    replyToPreview: null,
    mentionUserIds: [],
    reactions: {},
    readBy: [],
    createdAt: now,
    isDeleted: false,
  });

  const preview = lastMessagePreview('system', truncatePreview(payload.body, 100));
  const channelUpdate: Record<string, unknown> = {
    lastMessage: preview,
    lastMessageAt: now,
    lastMessageBy: 'system',
    updatedAt: now,
  };

  const membersSnap = await db
    .collection('communities')
    .doc(communityId)
    .collection('members')
    .get();

  for (const memberDoc of membersSnap.docs) {
    if (!memberDoc.data()?.isBanned) {
      channelUpdate[`unreadCount.${memberDoc.id}`] = admin.firestore.FieldValue.increment(1);
    }
  }

  await db
    .collection('communities')
    .doc(communityId)
    .collection('channels')
    .doc(channelId)
    .update(channelUpdate);

  await communityDoc.ref.update({ updatedAt: now });

  return { posted: true, communityId, messageId: messageRef.id };
}
