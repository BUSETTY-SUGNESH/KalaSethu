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
exports.getCommunityByOwner = exports.updateChannel = exports.createChannel = exports.updateCommunity = exports.leaveCommunity = exports.joinCommunity = void 0;
exports.provisionArtistCommunity = provisionArtistCommunity;
exports.joinCommunityMember = joinCommunityMember;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const app_check_1 = require("./utils/app-check");
const rate_limit_1 = require("./utils/rate-limit");
const REGION = 'asia-south1';
function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || 'community';
}
/** Idempotent — creates artist community with default channels */
async function provisionArtistCommunity(ownerId, displayName, avatarUrl) {
    const existing = await config_1.db
        .collection('communities')
        .where('ownerId', '==', ownerId)
        .limit(1)
        .get();
    if (!existing.empty) {
        return existing.docs[0].id;
    }
    const now = new Date().toISOString();
    const name = `${displayName}'s Studio`;
    const communityRef = config_1.db.collection('communities').doc();
    const batch = config_1.db.batch();
    batch.set(communityRef, {
        ownerId,
        name,
        slug: slugify(name),
        avatarUrl: avatarUrl || null,
        description: `Welcome to ${displayName}'s artisan community.`,
        followerCount: 0,
        memberCount: 1,
        isAutoProvisioned: true,
        settings: { announcementsReadOnly: true },
        createdAt: now,
        updatedAt: now,
    });
    batch.set(communityRef.collection('members').doc(ownerId), {
        userId: ownerId,
        communityId: communityRef.id,
        role: 'owner',
        displayName,
        avatarUrl: avatarUrl || null,
        isBanned: false,
        joinedAt: now,
    });
    const generalRef = communityRef.collection('channels').doc();
    batch.set(generalRef, {
        communityId: communityRef.id,
        name: 'general',
        type: 'text',
        topic: 'General discussion',
        position: 0,
        isDefault: true,
        isAnnouncements: false,
        unreadCount: {},
        createdAt: now,
        updatedAt: now,
    });
    const announcementsRef = communityRef.collection('channels').doc();
    batch.set(announcementsRef, {
        communityId: communityRef.id,
        name: 'announcements',
        type: 'text',
        topic: 'Updates from the artist',
        position: 1,
        isDefault: false,
        isAnnouncements: true,
        unreadCount: {},
        createdAt: now,
        updatedAt: now,
    });
    await batch.commit();
    return communityRef.id;
}
async function joinCommunityMember(communityId, userId, displayName, avatarUrl) {
    const memberRef = config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('members')
        .doc(userId);
    const existing = await memberRef.get();
    if (existing.exists && !existing.data()?.isBanned)
        return;
    const now = new Date().toISOString();
    await memberRef.set({
        userId,
        communityId,
        role: 'member',
        displayName,
        avatarUrl: avatarUrl || null,
        isBanned: false,
        joinedAt: now,
    }, { merge: true });
    await config_1.db.collection('communities').doc(communityId).update({
        memberCount: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
    });
}
exports.joinCommunity = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    const userId = context.auth.uid;
    const { communityId, displayName, avatarUrl } = data;
    if (!communityId) {
        throw new functions.https.HttpsError('invalid-argument', 'communityId required');
    }
    const communitySnap = await config_1.db.collection('communities').doc(communityId).get();
    if (!communitySnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Community not found');
    }
    await joinCommunityMember(communityId, userId, displayName || 'User', avatarUrl);
    return { success: true };
});
exports.leaveCommunity = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    const userId = context.auth.uid;
    const { communityId } = data;
    const memberRef = config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('members')
        .doc(userId);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
        return { success: true };
    }
    if (memberSnap.data()?.role === 'owner') {
        throw new functions.https.HttpsError('failed-precondition', 'Owner cannot leave');
    }
    await memberRef.delete();
    await config_1.db.collection('communities').doc(communityId).update({
        memberCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: new Date().toISOString(),
    });
    return { success: true };
});
exports.updateCommunity = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    const userId = context.auth.uid;
    const { communityId, name, description, avatarUrl, bannerUrl } = data;
    const memberSnap = await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('members')
        .doc(userId)
        .get();
    const role = memberSnap.data()?.role;
    if (!role || (role !== 'owner' && role !== 'admin')) {
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }
    const updates = { updatedAt: new Date().toISOString() };
    if (name) {
        updates.name = name;
        updates.slug = slugify(name);
    }
    if (description !== undefined)
        updates.description = description;
    if (avatarUrl !== undefined)
        updates.avatarUrl = avatarUrl;
    if (bannerUrl !== undefined)
        updates.bannerUrl = bannerUrl;
    await config_1.db.collection('communities').doc(communityId).update(updates);
    return { success: true };
});
exports.createChannel = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'createChannel');
    const userId = context.auth.uid;
    const { communityId, name, topic, isAnnouncements } = data;
    const memberSnap = await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('members')
        .doc(userId)
        .get();
    const role = memberSnap.data()?.role;
    if (!role || (role !== 'owner' && role !== 'admin')) {
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }
    const channelsSnap = await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('channels')
        .orderBy('position', 'desc')
        .limit(1)
        .get();
    const position = channelsSnap.empty ? 0 : (channelsSnap.docs[0].data().position || 0) + 1;
    const now = new Date().toISOString();
    const ref = await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('channels')
        .add({
        communityId,
        name: name || 'new-channel',
        type: 'text',
        topic: topic || '',
        position,
        isDefault: false,
        isAnnouncements: !!isAnnouncements,
        unreadCount: {},
        createdAt: now,
        updatedAt: now,
    });
    return { success: true, channelId: ref.id };
});
exports.updateChannel = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    const userId = context.auth.uid;
    const { communityId, channelId, name, topic } = data;
    const memberSnap = await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('members')
        .doc(userId)
        .get();
    const role = memberSnap.data()?.role;
    if (!role || (role !== 'owner' && role !== 'admin')) {
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }
    const updates = { updatedAt: new Date().toISOString() };
    if (name)
        updates.name = name;
    if (topic !== undefined)
        updates.topic = topic;
    await config_1.db
        .collection('communities')
        .doc(communityId)
        .collection('channels')
        .doc(channelId)
        .update(updates);
    return { success: true };
});
exports.getCommunityByOwner = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { ownerId } = data;
    const snap = await config_1.db
        .collection('communities')
        .where('ownerId', '==', ownerId)
        .limit(1)
        .get();
    if (snap.empty)
        return { community: null };
    const doc = snap.docs[0];
    return { community: { id: doc.id, ...doc.data() } };
});
//# sourceMappingURL=community-provisioning.js.map