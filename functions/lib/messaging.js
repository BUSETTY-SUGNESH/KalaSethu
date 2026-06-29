"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberRole = exports.banMember = exports.searchMessages = exports.unpinMessage = exports.pinMessage = exports.toggleReaction = exports.sendChannelMessage = exports.deleteMessage = exports.editMessage = exports.markMessagesRead = exports.sendChatMessage = exports.getOrCreateDirectChatRoom = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const app_check_1 = require("./utils/app-check");
const rate_limit_1 = require("./utils/rate-limit");
const schema_validation_1 = require("./utils/schema-validation");
const notification_repository_1 = require("./repositories/notification.repository");
const messaging_utils_1 = require("./utils/messaging-utils");
const REGION = 'asia-south1';
async function getMemberRole(communityId, userId) {
    const snap = await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('members')
        .doc(userId)
        .get();
    if (!snap.exists || snap.data()?.isBanned)
        return null;
    return snap.data()?.role || null;
}
function canSendInAnnouncements(role) {
    return role === 'owner' || role === 'admin' || role === 'moderator';
}
function canModerate(role) {
    return role === 'owner' || role === 'admin' || role === 'moderator';
}
// ── DM: Get or create direct room ─────────────────────────────
exports.getOrCreateDirectChatRoom = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    const callerId = context.auth.uid;
    const otherUserId = data.otherUserId;
    const callerAvatar = typeof data.callerAvatar === 'string' ? data.callerAvatar : '';
    const otherUserAvatar = typeof data.otherUserAvatar === 'string' ? data.otherUserAvatar : '';
    if (!otherUserId || typeof otherUserId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid otherUserId');
    }
    if (callerId === otherUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'Cannot create a chat room with yourself');
    }
    const callerName = await (0, messaging_utils_1.resolveUserDisplayName)(config_1.db, callerId, data.callerName);
    const otherUserName = await (0, messaging_utils_1.resolveUserDisplayName)(config_1.db, otherUserId, data.otherUserName);
    const existingSnap = await config_1.db
        .collection('chatRooms')
        .where('type', '==', 'direct')
        .where('participants', 'array-contains', callerId)
        .get();
    const existing = existingSnap.docs.find((doc) => {
        const participants = doc.data().participants || [];
        return participants.includes(otherUserId);
    });
    if (existing) {
        return { roomId: existing.id };
    }
    const now = new Date().toISOString();
    const roomRef = await config_1.db.collection('chatRooms').add({
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
exports.sendChatMessage = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'sendChatMessage');
    const senderId = context.auth.uid;
    if (data.senderId && data.senderId !== senderId) {
        throw new functions.https.HttpsError('permission-denied', 'Sender mismatch');
    }
    const senderName = await (0, messaging_utils_1.resolveUserDisplayName)(config_1.db, senderId, data.senderName);
    const content = typeof data.content === 'string' ? data.content.trim() : '';
    (0, schema_validation_1.validateChatMessagePayload)({
        chatRoomId: data.chatRoomId,
        senderId,
        senderName,
        type: data.type || 'text',
        content,
        mediaUrl: data.mediaUrl,
        artworkId: data.artworkId,
        replyToMessageId: data.replyToMessageId,
    });
    const roomSnap = await config_1.db.collection('chatRooms').doc(data.chatRoomId).get();
    if (!roomSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Chat room not found');
    }
    const participants = roomSnap.data()?.participants || [];
    if (!participants.includes(senderId)) {
        throw new functions.https.HttpsError('permission-denied', 'Not a room participant');
    }
    let replyToPreview = null;
    if (data.replyToMessageId) {
        const replySnap = await config_1.db
            .collection('chatRooms')
            .doc(data.chatRoomId)
            .collection('messages')
            .doc(data.replyToMessageId)
            .get();
        if (!replySnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Reply message not found');
        }
        const replyData = replySnap.data();
        replyToPreview = (0, messaging_utils_1.truncatePreview)(replyData.content || '', 120);
    }
    const messageType = data.type || 'text';
    const now = new Date().toISOString();
    const mentionUserIds = (0, messaging_utils_1.parseMentionUserIds)(content);
    const messageRef = config_1.db
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
        contentLower: (0, messaging_utils_1.buildContentLower)(content),
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
    const roomUpdate = {
        lastMessage: (0, messaging_utils_1.lastMessagePreview)(messageType, content),
        lastMessageAt: now,
        lastMessageBy: senderId,
        updatedAt: now,
    };
    const recipients = participants.filter((p) => p !== senderId);
    for (const recipientId of recipients) {
        roomUpdate[`unreadCount.${recipientId}`] = admin.firestore.FieldValue.increment(1);
    }
    await config_1.db.collection('chatRooms').doc(data.chatRoomId).update(roomUpdate);
    const notifMessage = (0, messaging_utils_1.truncatePreview)(content, 100);
    for (const recipientId of recipients) {
        if (!(await (0, messaging_utils_1.shouldNotifyUser)(config_1.db, recipientId, 'new_message')))
            continue;
        try {
            await notification_repository_1.notificationRepository.createNotification(recipientId, {
                type: 'new_message',
                title: `New message from ${senderName}`,
                message: notifMessage,
                actionUrl: `/dashboard/messages?userId=${senderId}`,
                relatedId: data.chatRoomId,
                relatedType: 'user',
                isRead: false,
            });
        }
        catch (e) {
            console.error('Failed to create DM notification', e);
        }
    }
    return { success: true, messageId: messageRef.id };
});
// ── DM: Mark read ───────────────────────────────────────────
exports.markMessagesRead = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    const userId = context.auth.uid;
    const { chatRoomId, communityId, channelId } = data;
    if (chatRoomId) {
        const roomSnap = await config_1.db.collection('chatRooms').doc(chatRoomId).get();
        if (!roomSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Chat room not found');
        }
        const participants = roomSnap.data()?.participants || [];
        if (!participants.includes(userId)) {
            throw new functions.https.HttpsError('permission-denied', 'Not a participant');
        }
        const unreadSnap = await config_1.db
            .collection('chatRooms')
            .doc(chatRoomId)
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        const batch = config_1.db.batch();
        let updated = 0;
        for (const docSnap of unreadSnap.docs) {
            const readBy = docSnap.data().readBy || [];
            if (!readBy.includes(userId) && docSnap.data().senderId !== userId) {
                batch.update(docSnap.ref, { readBy: admin.firestore.FieldValue.arrayUnion(userId) });
                updated++;
                if (updated >= 50)
                    break;
            }
        }
        batch.update(config_1.db.collection('chatRooms').doc(chatRoomId), {
            [`unreadCount.${userId}`]: 0,
        });
        await batch.commit();
        return { success: true, updated };
    }
    if (communityId && channelId) {
        const memberSnap = await config_1.db
            .collection('communities')
            .doc(communityId)
            .collection('members')
            .doc(userId)
            .get();
        if (!memberSnap.exists) {
            throw new functions.https.HttpsError('permission-denied', 'Not a member');
        }
        const batch = config_1.db.batch();
        batch.update(config_1.db.collection('communities').doc(communityId).collection('channels').doc(channelId), { [`unreadCount.${userId}`]: 0 });
        await batch.commit();
        return { success: true };
    }
    throw new functions.https.HttpsError('invalid-argument', 'Invalid read target');
});
// ── DM: Edit / Delete ─────────────────────────────────────
exports.editMessage = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'editMessage');
    const userId = context.auth.uid;
    const { chatRoomId, communityId, channelId, messageId, content } = data;
    if (!messageId || typeof content !== 'string' || content.length < 1 || content.length > 5000) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid content');
    }
    let msgRef;
    if (chatRoomId) {
        msgRef = config_1.db.collection('chatRooms').doc(chatRoomId).collection('messages').doc(messageId);
    }
    else if (communityId && channelId) {
        msgRef = config_1.db
            .collection('communities')
            .doc(communityId)
            .collection('channels')
            .doc(channelId)
            .collection('messages')
            .doc(messageId);
    }
    else {
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
        contentLower: (0, messaging_utils_1.buildContentLower)(content),
        mentionUserIds: (0, messaging_utils_1.parseMentionUserIds)(content),
        editedAt: now,
    });
    return { success: true };
});
exports.deleteMessage = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'deleteMessage');
    const userId = context.auth.uid;
    const { chatRoomId, communityId, channelId, messageId } = data;
    if (!messageId) {
        throw new functions.https.HttpsError('invalid-argument', 'messageId required');
    }
    let msgRef;
    let canModerateMsg = false;
    if (chatRoomId) {
        msgRef = config_1.db.collection('chatRooms').doc(chatRoomId).collection('messages').doc(messageId);
        const roomSnap = await config_1.db.collection('chatRooms').doc(chatRoomId).get();
        if (!roomSnap.exists || !(roomSnap.data()?.participants || []).includes(userId)) {
            throw new functions.https.HttpsError('permission-denied', 'Not a participant');
        }
    }
    else if (communityId && channelId) {
        msgRef = config_1.db
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
    }
    else {
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
        await config_1.db.collection('communities').doc(communityId).collection('moderationLogs').add({
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
exports.sendChannelMessage = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'sendChannelMessage');
    const senderId = context.auth.uid;
    (0, schema_validation_1.validateChannelMessagePayload)(data);
    const { communityId, channelId } = data;
    const role = await getMemberRole(communityId, senderId);
    if (!role) {
        throw new functions.https.HttpsError('permission-denied', 'Not a community member');
    }
    const channelSnap = await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('channels')
        .doc(channelId)
        .get();
    if (!channelSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Channel not found');
    }
    const channelData = channelSnap.data();
    if (channelData.isAnnouncements && !canSendInAnnouncements(role)) {
        throw new functions.https.HttpsError('permission-denied', 'Announcements channel is read-only');
    }
    let replyToPreview = null;
    if (data.replyToMessageId) {
        const replySnap = await config_1.db
            .collection('communities')
            .doc(communityId)
            .collection('channels')
            .doc(channelId)
            .collection('messages')
            .doc(data.replyToMessageId)
            .get();
        if (replySnap.exists) {
            replyToPreview = (0, messaging_utils_1.truncatePreview)(replySnap.data()?.content || '', 120);
        }
    }
    const now = new Date().toISOString();
    const mentionUserIds = (0, messaging_utils_1.parseMentionUserIds)(data.content);
    const messageRef = config_1.db
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
        contentLower: (0, messaging_utils_1.buildContentLower)(data.content),
        replyToMessageId: data.replyToMessageId || null,
        replyToPreview,
        mentionUserIds,
        reactions: {},
        readBy: [senderId],
        createdAt: now,
        isDeleted: false,
    });
    const channelUpdate = {
        lastMessage: (0, messaging_utils_1.lastMessagePreview)(data.type || 'text', data.content),
        lastMessageAt: now,
        lastMessageBy: senderId,
        updatedAt: now,
    };
    const membersSnap = await config_1.db
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
    await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('channels')
        .doc(channelId)
        .update(channelUpdate);
    const notifMessage = (0, messaging_utils_1.truncatePreview)(data.content, 100);
    const communitySnap = await config_1.db.collection('communities').doc(communityId).get();
    const communityName = communitySnap.data()?.name || 'Community';
    for (const memberDoc of membersSnap.docs) {
        const memberId = memberDoc.id;
        if (memberId === senderId || memberDoc.data()?.isBanned)
            continue;
        if (mentionUserIds.includes(memberDoc.data()?.displayName?.toLowerCase?.() || '')) {
            if (await (0, messaging_utils_1.shouldNotifyUser)(config_1.db, memberId, 'new_mention')) {
                await notification_repository_1.notificationRepository.createNotification(memberId, {
                    type: 'new_mention',
                    title: `${data.senderName} mentioned you in ${communityName}`,
                    message: notifMessage,
                    actionUrl: `/dashboard/communities/${communityId}?channel=${channelId}`,
                    relatedId: communityId,
                    relatedType: 'community',
                    isRead: false,
                });
            }
        }
        else if (await (0, messaging_utils_1.shouldNotifyUser)(config_1.db, memberId, 'new_community_message')) {
            await notification_repository_1.notificationRepository.createNotification(memberId, {
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
exports.toggleReaction = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'toggleReaction');
    const userId = context.auth.uid;
    const { chatRoomId, communityId, channelId, messageId, emoji } = data;
    if (!messageId || !emoji || typeof emoji !== 'string' || emoji.length > 8) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid reaction');
    }
    let msgRef;
    if (chatRoomId) {
        msgRef = config_1.db.collection('chatRooms').doc(chatRoomId).collection('messages').doc(messageId);
        const roomSnap = await config_1.db.collection('chatRooms').doc(chatRoomId).get();
        if (!roomSnap.exists || !(roomSnap.data()?.participants || []).includes(userId)) {
            throw new functions.https.HttpsError('permission-denied', 'Not a participant');
        }
    }
    else if (communityId && channelId) {
        msgRef = config_1.db
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
    }
    else {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid message location');
    }
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Message not found');
    }
    const reactions = msgSnap.data()?.reactions || {};
    const current = reactions[emoji] || [];
    const hasReacted = current.includes(userId);
    const updated = hasReacted
        ? current.filter((id) => id !== userId)
        : [...current, userId];
    if (updated.length === 0) {
        await msgRef.update({
            [`reactions.${emoji}`]: admin.firestore.FieldValue.delete(),
        });
    }
    else {
        await msgRef.update({ [`reactions.${emoji}`]: updated });
    }
    return { success: true, added: !hasReacted };
});
// ── Pins ────────────────────────────────────────────────────
exports.pinMessage = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    const userId = context.auth.uid;
    const { communityId, channelId, messageId } = data;
    const role = await getMemberRole(communityId, userId);
    if (!role || !canModerate(role)) {
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }
    const pinsSnap = await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('pinnedMessages')
        .where('channelId', '==', channelId)
        .get();
    if (pinsSnap.size >= 50) {
        throw new functions.https.HttpsError('resource-exhausted', 'Pin limit reached');
    }
    const now = new Date().toISOString();
    await config_1.db.collection('communities').doc(communityId).collection('pinnedMessages').add({
        communityId,
        channelId,
        messageId,
        pinnedBy: userId,
        pinnedAt: now,
    });
    await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .doc(messageId)
        .update({ pinnedAt: now, pinnedBy: userId });
    return { success: true };
});
exports.unpinMessage = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    const userId = context.auth.uid;
    const { communityId, channelId, messageId } = data;
    const role = await getMemberRole(communityId, userId);
    if (!role || !canModerate(role)) {
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }
    const pinsSnap = await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('pinnedMessages')
        .where('channelId', '==', channelId)
        .where('messageId', '==', messageId)
        .limit(1)
        .get();
    const batch = config_1.db.batch();
    pinsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.update(config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .doc(messageId), { pinnedAt: admin.firestore.FieldValue.delete(), pinnedBy: admin.firestore.FieldValue.delete() });
    await batch.commit();
    return { success: true };
});
// ── Search ──────────────────────────────────────────────────
exports.searchMessages = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'searchMessages');
    const userId = context.auth.uid;
    const { query: searchQuery, chatRoomId, communityId, channelId, limit: resultLimit = 20 } = data;
    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'Query too short');
    }
    const qLower = searchQuery.toLowerCase();
    const end = qLower + '\uf8ff';
    if (chatRoomId) {
        const roomSnap = await config_1.db.collection('chatRooms').doc(chatRoomId).get();
        if (!roomSnap.exists || !(roomSnap.data()?.participants || []).includes(userId)) {
            throw new functions.https.HttpsError('permission-denied', 'Not a participant');
        }
        const snap = await config_1.db
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
        const snap = await config_1.db
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
exports.banMember = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
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
    await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('members')
        .doc(targetUserId)
        .update({ isBanned: true });
    await config_1.db.collection('communities').doc(communityId).collection('moderationLogs').add({
        communityId,
        targetUserId,
        moderatorId,
        action: 'ban',
        reason: reason || '',
        createdAt: new Date().toISOString(),
    });
    return { success: true };
});
exports.updateMemberRole = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    const userId = context.auth.uid;
    const { communityId, targetUserId, role: newRole } = data;
    const actorRole = await getMemberRole(communityId, userId);
    if (actorRole !== 'owner' && actorRole !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }
    if (!['admin', 'moderator', 'member'].includes(newRole)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
    }
    await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('members')
        .doc(targetUserId)
        .update({ role: newRole });
    return { success: true };
});
//# sourceMappingURL=messaging.js.map