import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { db } from './config';
import { assertAppCheck } from './utils/app-check';
import { assertRateLimit } from './utils/rate-limit';
import {
  validateChatMessagePayload,
  validateChannelMessagePayload,
} from './utils/schema-validation';
import { notificationRepository } from './repositories/notification.repository';
import {
  buildContentLower,
  lastMessagePreview,
  parseMentionUserIds,
  resolveUserDisplayName,
  shouldNotifyUser,
  truncatePreview,
} from './utils/messaging-utils';

const REGION = 'asia-south1';

async function getMemberRole(
  communityId: string,
  userId: string
): Promise<string | null> {
  const snap = await db
    .collection('communities')
    .doc(communityId)
    .collection('members')
    .doc(userId)
    .get();
  if (!snap.exists || snap.data()?.isBanned) return null;
  return (snap.data()?.role as string) || null;
}

function canSendInAnnouncements(role: string): boolean {
  return role === 'owner' || role === 'admin' || role === 'moderator';
}

function canModerate(role: string): boolean {
  return role === 'owner' || role === 'admin' || role === 'moderator';
}

// ── DM: Get or create direct room ─────────────────────────────

export const getOrCreateDirectChatRoom = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);

  const callerId = context.auth.uid;
  const otherUserId = data.otherUserId as string;
  const callerAvatar = typeof data.callerAvatar === 'string' ? data.callerAvatar : '';
  const otherUserAvatar = typeof data.otherUserAvatar === 'string' ? data.otherUserAvatar : '';

  if (!otherUserId || typeof otherUserId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid otherUserId');
  }
  if (callerId === otherUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'Cannot create a chat room with yourself');
  }

  const callerName = await resolveUserDisplayName(db, callerId, data.callerName);
  const otherUserName = await resolveUserDisplayName(db, otherUserId, data.otherUserName);

  const existingSnap = await db
    .collection('chatRooms')
    .where('type', '==', 'direct')
    .where('participants', 'array-contains', callerId)
    .get();

  const existing = existingSnap.docs.find((doc) => {
    const participants: string[] = doc.data().participants || [];
    return participants.includes(otherUserId);
  });
  if (existing) {
    return { roomId: existing.id };
  }

  const now = new Date().toISOString();
  const roomRef = await db.collection('chatRooms').add({
    type: 'direct',
    participants: [callerId, otherUserId],
    participantNames: { [callerId]: callerName, [otherUserId]: otherUserName },
    participantAvatars: { [callerId]: callerAvatar, [otherUserId]: otherUserAvatar },
    unreadCount: { [callerId]: 0, [otherUserId]: 0 },
    createdAt: now,
    updatedAt: now,
  });

  return { roomId: roomRef.id };
});

// ── DM: Send ────────────────────────────────────────────────

export const sendChatMessage = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'sendChatMessage');

  const senderId = context.auth.uid;
  if (data.senderId && data.senderId !== senderId) {
    throw new functions.https.HttpsError('permission-denied', 'Sender mismatch');
  }

  const senderName = await resolveUserDisplayName(db, senderId, data.senderName);
  const content = typeof data.content === 'string' ? data.content.trim() : '';

  validateChatMessagePayload({
    chatRoomId: data.chatRoomId,
    senderId,
    senderName,
    type: data.type || 'text',
    content,
    mediaUrl: data.mediaUrl,
    artworkId: data.artworkId,
    replyToMessageId: data.replyToMessageId,
  });

  const roomSnap = await db.collection('chatRooms').doc(data.chatRoomId).get();
  if (!roomSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Chat room not found');
  }

  const participants: string[] = roomSnap.data()?.participants || [];
  if (!participants.includes(senderId)) {
    throw new functions.https.HttpsError('permission-denied', 'Not a room participant');
  }

  let replyToPreview: string | null = null;
  if (data.replyToMessageId) {
    const replySnap = await db
      .collection('chatRooms')
      .doc(data.chatRoomId)
      .collection('messages')
      .doc(data.replyToMessageId)
      .get();
    if (!replySnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Reply message not found');
    }
    const replyData = replySnap.data()!;
    replyToPreview = truncatePreview(replyData.content || '', 120);
  }

  const messageType = data.type || 'text';
  const now = new Date().toISOString();
  const mentionUserIds = parseMentionUserIds(content);
  const messageRef = db
    .collection('chatRooms')
    .doc(data.chatRoomId)
    .collection('messages')
    .doc();

  await messageRef.set({
    contextType: 'dm',
    chatRoomId: data.chatRoomId,
    senderId,
    senderName,
    type: messageType,
    content,
    contentFormat: 'markdown',
    contentLower: buildContentLower(content),
    mediaUrl: data.mediaUrl || null,
    artworkId: data.artworkId || null,
    replyToMessageId: data.replyToMessageId || null,
    replyToPreview,
    mentionUserIds,
    reactions: {},
    readBy: [senderId],
    createdAt: now,
    isDeleted: false,
  });

  const roomUpdate: Record<string, unknown> = {
    lastMessage: lastMessagePreview(messageType, content),
    lastMessageAt: now,
    lastMessageBy: senderId,
    updatedAt: now,
  };

  const recipients = participants.filter((p) => p !== senderId);
  for (const recipientId of recipients) {
    roomUpdate[`unreadCount.${recipientId}`] = admin.firestore.FieldValue.increment(1);
  }

  await db.collection('chatRooms').doc(data.chatRoomId).update(roomUpdate);

  const notifMessage = truncatePreview(content, 100);
  for (const recipientId of recipients) {
    if (!(await shouldNotifyUser(db, recipientId, 'new_message'))) continue;
    try {
      await notificationRepository.createNotification(recipientId, {
        type: 'new_message',
        title: `New message from ${senderName}`,
        message: notifMessage,
        actionUrl: `/dashboard/messages?userId=${senderId}`,
        relatedId: data.chatRoomId,
        relatedType: 'user',
        isRead: false,
      });
    } catch (e) {
      console.error('Failed to create DM notification', e);
    }
  }

  return { success: true, messageId: messageRef.id };
});

// ── DM: Mark read ───────────────────────────────────────────

export const markMessagesRead = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);

  const userId = context.auth.uid;
  const { chatRoomId, communityId, channelId } = data;

  if (chatRoomId) {
    const roomSnap = await db.collection('chatRooms').doc(chatRoomId).get();
    if (!roomSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Chat room not found');
    }
    const participants: string[] = roomSnap.data()?.participants || [];
    if (!participants.includes(userId)) {
      throw new functions.https.HttpsError('permission-denied', 'Not a participant');
    }

    const unreadSnap = await db
      .collection('chatRooms')
      .doc(chatRoomId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const batch = db.batch();
    let updated = 0;
    for (const docSnap of unreadSnap.docs) {
      const readBy: string[] = docSnap.data().readBy || [];
      if (!readBy.includes(userId) && docSnap.data().senderId !== userId) {
        batch.update(docSnap.ref, { readBy: admin.firestore.FieldValue.arrayUnion(userId) });
        updated++;
        if (updated >= 50) break;
      }
    }
    batch.update(db.collection('chatRooms').doc(chatRoomId), {
      [`unreadCount.${userId}`]: 0,
    });
    await batch.commit();
    return { success: true, updated };
  }

  if (communityId && channelId) {
    const memberSnap = await db
      .collection('communities')
      .doc(communityId)
      .collection('members')
      .doc(userId)
      .get();
    if (!memberSnap.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Not a member');
    }

    const batch = db.batch();
    batch.update(
      db.collection('communities').doc(communityId).collection('channels').doc(channelId),
      { [`unreadCount.${userId}`]: 0 }
    );
    await batch.commit();
    return { success: true };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid read target');
});

// ── DM: Edit / Delete ─────────────────────────────────────

export const editMessage = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'editMessage');

  const userId = context.auth.uid;
  const { chatRoomId, communityId, channelId, messageId, content } = data;
  if (!messageId || typeof content !== 'string' || content.length < 1 || content.length > 5000) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid content');
  }

  let msgRef: FirebaseFirestore.DocumentReference;
  if (chatRoomId) {
    msgRef = db.collection('chatRooms').doc(chatRoomId).collection('messages').doc(messageId);
  } else if (communityId && channelId) {
    msgRef = db
      .collection('communities')
      .doc(communityId)
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .doc(messageId);
  } else {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid message location');
  }

  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Message not found');
  }
  if (msgSnap.data()?.senderId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only edit own messages');
  }

  const now = new Date().toISOString();
  await msgRef.update({
    content,
    contentLower: buildContentLower(content),
    mentionUserIds: parseMentionUserIds(content),
    editedAt: now,
  });
  return { success: true };
});

export const deleteMessage = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'deleteMessage');

  const userId = context.auth.uid;
  const { chatRoomId, communityId, channelId, messageId } = data;
  if (!messageId) {
    throw new functions.https.HttpsError('invalid-argument', 'messageId required');
  }

  let msgRef: FirebaseFirestore.DocumentReference;
  let canModerateMsg = false;

  if (chatRoomId) {
    msgRef = db.collection('chatRooms').doc(chatRoomId).collection('messages').doc(messageId);
    const roomSnap = await db.collection('chatRooms').doc(chatRoomId).get();
    if (!roomSnap.exists || !(roomSnap.data()?.participants || []).includes(userId)) {
      throw new functions.https.HttpsError('permission-denied', 'Not a participant');
    }
  } else if (communityId && channelId) {
    msgRef = db
      .collection('communities')
      .doc(communityId)
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .doc(messageId);
    const role = await getMemberRole(communityId, userId);
    canModerateMsg = role ? canModerate(role) : false;
    if (!role) {
      throw new functions.https.HttpsError('permission-denied', 'Not a member');
    }
  } else {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid message location');
  }

  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Message not found');
  }
  const senderId = msgSnap.data()?.senderId;
  if (senderId !== userId && !canModerateMsg) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot delete this message');
  }

  await msgRef.update({
    isDeleted: true,
    content: '',
    deletedBy: userId,
  });

  if (communityId && canModerateMsg && senderId !== userId) {
    await db.collection('communities').doc(communityId).collection('moderationLogs').add({
      communityId,
      channelId,
      messageId,
      targetUserId: senderId,
      moderatorId: userId,
      action: 'delete_message',
      createdAt: new Date().toISOString(),
    });
  }

  return { success: true };
});

// ── Channel: Send ───────────────────────────────────────────

export const sendChannelMessage = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'sendChannelMessage');

  const senderId = context.auth.uid;
  validateChannelMessagePayload(data);

  const { communityId, channelId } = data;
  const role = await getMemberRole(communityId, senderId);
  if (!role) {
    throw new functions.https.HttpsError('permission-denied', 'Not a community member');
  }

  const channelSnap = await db
    .collection('communities')
    .doc(communityId)
    .collection('channels')
    .doc(channelId)
    .get();
  if (!channelSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Channel not found');
  }

  const channelData = channelSnap.data()!;
  if (channelData.isAnnouncements && !canSendInAnnouncements(role)) {
    throw new functions.https.HttpsError('permission-denied', 'Announcements channel is read-only');
  }

  let replyToPreview: string | null = null;
  if (data.replyToMessageId) {
    const replySnap = await db
      .collection('communities')
      .doc(communityId)
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .doc(data.replyToMessageId)
      .get();
    if (replySnap.exists) {
      replyToPreview = truncatePreview(replySnap.data()?.content || '', 120);
    }
  }

  const now = new Date().toISOString();
  const mentionUserIds = parseMentionUserIds(data.content);
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
    senderId,
    senderName: data.senderName,
    type: data.type || 'text',
    content: data.content,
    contentFormat: 'markdown',
    contentLower: buildContentLower(data.content),
    replyToMessageId: data.replyToMessageId || null,
    replyToPreview,
    mentionUserIds,
    reactions: {},
    readBy: [senderId],
    createdAt: now,
    isDeleted: false,
  });

  const channelUpdate: Record<string, unknown> = {
    lastMessage: lastMessagePreview(data.type || 'text', data.content),
    lastMessageAt: now,
    lastMessageBy: senderId,
    updatedAt: now,
  };

  const membersSnap = await db
    .collection('communities')
    .doc(communityId)
    .collection('members')
    .get();
  for (const memberDoc of membersSnap.docs) {
    const memberId = memberDoc.id;
    if (memberId !== senderId && !memberDoc.data()?.isBanned) {
      channelUpdate[`unreadCount.${memberId}`] = admin.firestore.FieldValue.increment(1);
    }
  }

  await db
    .collection('communities')
    .doc(communityId)
    .collection('channels')
    .doc(channelId)
    .update(channelUpdate);

  const notifMessage = truncatePreview(data.content, 100);
  const communitySnap = await db.collection('communities').doc(communityId).get();
  const communityName = communitySnap.data()?.name || 'Community';

  for (const memberDoc of membersSnap.docs) {
    const memberId = memberDoc.id;
    if (memberId === senderId || memberDoc.data()?.isBanned) continue;

    if (mentionUserIds.includes(memberDoc.data()?.displayName?.toLowerCase?.() || '')) {
      if (await shouldNotifyUser(db, memberId, 'new_mention')) {
        await notificationRepository.createNotification(memberId, {
          type: 'new_mention',
          title: `${data.senderName} mentioned you in ${communityName}`,
          message: notifMessage,
          actionUrl: `/dashboard/communities/${communityId}?channel=${channelId}`,
          relatedId: communityId,
          relatedType: 'community',
          isRead: false,
        });
      }
    } else if (await shouldNotifyUser(db, memberId, 'new_community_message')) {
      await notificationRepository.createNotification(memberId, {
        type: 'new_community_message',
        title: `#${channelData.name} — ${communityName}`,
        message: `${data.senderName}: ${notifMessage}`,
        actionUrl: `/dashboard/communities/${communityId}?channel=${channelId}`,
        relatedId: communityId,
        relatedType: 'community',
        isRead: false,
      });
    }
  }

  return { success: true, messageId: messageRef.id };
});

// ── Reactions ───────────────────────────────────────────────

export const toggleReaction = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'toggleReaction');

  const userId = context.auth.uid;
  const { chatRoomId, communityId, channelId, messageId, emoji } = data;
  if (!messageId || !emoji || typeof emoji !== 'string' || emoji.length > 8) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid reaction');
  }

  let msgRef: FirebaseFirestore.DocumentReference;
  if (chatRoomId) {
    msgRef = db.collection('chatRooms').doc(chatRoomId).collection('messages').doc(messageId);
    const roomSnap = await db.collection('chatRooms').doc(chatRoomId).get();
    if (!roomSnap.exists || !(roomSnap.data()?.participants || []).includes(userId)) {
      throw new functions.https.HttpsError('permission-denied', 'Not a participant');
    }
  } else if (communityId && channelId) {
    msgRef = db
      .collection('communities')
      .doc(communityId)
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .doc(messageId);
    const role = await getMemberRole(communityId, userId);
    if (!role) {
      throw new functions.https.HttpsError('permission-denied', 'Not a member');
    }
  } else {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid message location');
  }

  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Message not found');
  }

  const reactions: Record<string, string[]> = msgSnap.data()?.reactions || {};
  const current = reactions[emoji] || [];
  const hasReacted = current.includes(userId);
  const updated = hasReacted
    ? current.filter((id) => id !== userId)
    : [...current, userId];

  if (updated.length === 0) {
    await msgRef.update({
      [`reactions.${emoji}`]: admin.firestore.FieldValue.delete(),
    });
  } else {
    await msgRef.update({ [`reactions.${emoji}`]: updated });
  }

  return { success: true, added: !hasReacted };
});

// ── Pins ────────────────────────────────────────────────────

export const pinMessage = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);

  const userId = context.auth.uid;
  const { communityId, channelId, messageId } = data;
  const role = await getMemberRole(communityId, userId);
  if (!role || !canModerate(role)) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
  }

  const pinsSnap = await db
    .collection('communities')
    .doc(communityId)
    .collection('pinnedMessages')
    .where('channelId', '==', channelId)
    .get();
  if (pinsSnap.size >= 50) {
    throw new functions.https.HttpsError('resource-exhausted', 'Pin limit reached');
  }

  const now = new Date().toISOString();
  await db.collection('communities').doc(communityId).collection('pinnedMessages').add({
    communityId,
    channelId,
    messageId,
    pinnedBy: userId,
    pinnedAt: now,
  });

  await db
    .collection('communities')
    .doc(communityId)
    .collection('channels')
    .doc(channelId)
    .collection('messages')
    .doc(messageId)
    .update({ pinnedAt: now, pinnedBy: userId });

  return { success: true };
});

export const unpinMessage = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);

  const userId = context.auth.uid;
  const { communityId, channelId, messageId } = data;
  const role = await getMemberRole(communityId, userId);
  if (!role || !canModerate(role)) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
  }

  const pinsSnap = await db
    .collection('communities')
    .doc(communityId)
    .collection('pinnedMessages')
    .where('channelId', '==', channelId)
    .where('messageId', '==', messageId)
    .limit(1)
    .get();

  const batch = db.batch();
  pinsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.update(
    db
      .collection('communities')
      .doc(communityId)
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .doc(messageId),
    { pinnedAt: admin.firestore.FieldValue.delete(), pinnedBy: admin.firestore.FieldValue.delete() }
  );
  await batch.commit();
  return { success: true };
});

// ── Search ──────────────────────────────────────────────────

export const searchMessages = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'searchMessages');

  const userId = context.auth.uid;
  const { query: searchQuery, chatRoomId, communityId, channelId, limit: resultLimit = 20 } = data;
  if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.length < 2) {
    throw new functions.https.HttpsError('invalid-argument', 'Query too short');
  }

  const qLower = searchQuery.toLowerCase();
  const end = qLower + '\uf8ff';

  if (chatRoomId) {
    const roomSnap = await db.collection('chatRooms').doc(chatRoomId).get();
    if (!roomSnap.exists || !(roomSnap.data()?.participants || []).includes(userId)) {
      throw new functions.https.HttpsError('permission-denied', 'Not a participant');
    }
    const snap = await db
      .collection('chatRooms')
      .doc(chatRoomId)
      .collection('messages')
      .where('contentLower', '>=', qLower)
      .where('contentLower', '<=', end)
      .orderBy('contentLower')
      .limit(Math.min(resultLimit, 30))
      .get();
    return {
      results: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  }

  if (communityId && channelId) {
    const role = await getMemberRole(communityId, userId);
    if (!role) {
      throw new functions.https.HttpsError('permission-denied', 'Not a member');
    }
    const snap = await db
      .collection('communities')
      .doc(communityId)
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .where('contentLower', '>=', qLower)
      .where('contentLower', '<=', end)
      .orderBy('contentLower')
      .limit(Math.min(resultLimit, 30))
      .get();
    return {
      results: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid search scope');
});

// ── Moderation ──────────────────────────────────────────────

export const banMember = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);

  const moderatorId = context.auth.uid;
  const { communityId, targetUserId, reason } = data;
  const role = await getMemberRole(communityId, moderatorId);
  if (!role || !canModerate(role)) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
  }

  const targetRole = await getMemberRole(communityId, targetUserId);
  if (targetRole === 'owner') {
    throw new functions.https.HttpsError('permission-denied', 'Cannot ban owner');
  }
  if (role === 'moderator' && (targetRole === 'admin' || targetRole === 'moderator')) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot ban staff');
  }

  await db
    .collection('communities')
    .doc(communityId)
    .collection('members')
    .doc(targetUserId)
    .update({ isBanned: true });

  await db.collection('communities').doc(communityId).collection('moderationLogs').add({
    communityId,
    targetUserId,
    moderatorId,
    action: 'ban',
    reason: reason || '',
    createdAt: new Date().toISOString(),
  });

  return { success: true };
});

export const updateMemberRole = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);

  const userId = context.auth.uid;
  const { communityId, targetUserId, role: newRole } = data;
  const actorRole = await getMemberRole(communityId, userId);
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
  }
  if (!['admin', 'moderator', 'member'].includes(newRole)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
  }

  await db
    .collection('communities')
    .doc(communityId)
    .collection('members')
    .doc(targetUserId)
    .update({ role: newRole });

  return { success: true };
});
