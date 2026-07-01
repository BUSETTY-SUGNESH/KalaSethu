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
exports.postArtistCommunityAnnouncement = postArtistCommunityAnnouncement;
const admin = __importStar(require("firebase-admin"));
const messaging_utils_1 = require("./messaging-utils");
function buildAnnouncementMarkdown(payload) {
    const link = payload.actionUrl
        ? `[${payload.title}](${payload.actionUrl})`
        : payload.title;
    return `${link}\n\n${payload.body}`;
}
/**
 * Posts a system message to the artist's #announcements channel when a community exists.
 */
async function postArtistCommunityAnnouncement(db, ownerId, payload) {
    if (!ownerId)
        return { posted: false };
    const communitiesSnap = await db
        .collection('communities')
        .where('ownerId', '==', ownerId)
        .limit(1)
        .get();
    if (communitiesSnap.empty)
        return { posted: false };
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
    if (channelsSnap.empty)
        return { posted: false, communityId };
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
        contentLower: (0, messaging_utils_1.buildContentLower)(content),
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
    const preview = (0, messaging_utils_1.lastMessagePreview)('system', (0, messaging_utils_1.truncatePreview)(payload.body, 100));
    const channelUpdate = {
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
//# sourceMappingURL=community-announcements.js.map