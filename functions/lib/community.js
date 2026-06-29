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
exports.unfollowUser = exports.followUser = exports.onFollowingRemoved = exports.onFollowingAdded = exports.onFollowerRemoved = exports.onFollowerAdded = exports.onCommentRemoved = exports.onCommentAdded = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const app_check_1 = require("./utils/app-check");
const rate_limit_1 = require("./utils/rate-limit");
const schema_validation_1 = require("./utils/schema-validation");
const community_provisioning_1 = require("./community-provisioning");
const regions_1 = require("./constants/regions");
// Aggregation for comments count on posts
exports.onCommentAdded = functions.region(regions_1.FIRESTORE_TRIGGER_REGION).firestore
    .document('posts/{postId}/comments/{commentId}')
    .onCreate(async (snap, context) => {
    const postId = context.params.postId;
    try {
        await config_1.db.collection("posts").doc(postId).update({
            commentCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        console.error(`Failed to update comment count for post ${postId}`, error);
    }
});
exports.onCommentRemoved = functions.region(regions_1.FIRESTORE_TRIGGER_REGION).firestore
    .document('posts/{postId}/comments/{commentId}')
    .onDelete(async (snap, context) => {
    const postId = context.params.postId;
    try {
        const postRef = config_1.db.collection("posts").doc(postId);
        await config_1.db.runTransaction(async (transaction) => {
            const postSnap = await transaction.get(postRef);
            if (!postSnap.exists)
                return;
            const currentCount = postSnap.data()?.commentCount ?? 0;
            if (currentCount <= 0)
                return;
            transaction.update(postRef, {
                commentCount: admin.firestore.FieldValue.increment(-1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
    }
    catch (error) {
        console.error(`Failed to decrement comment count for post ${postId}`, error);
    }
});
exports.onFollowerAdded = functions.region('asia-south1').firestore
    .document('users/{userId}/followers/{followerId}')
    .onCreate(async (_snap, context) => {
    const userId = context.params.userId;
    try {
        await config_1.db.collection('users').doc(userId).update({
            followerCount: admin.firestore.FieldValue.increment(1),
        });
    }
    catch (error) {
        console.error(`Failed to increment followerCount for user ${userId}`, error);
    }
});
exports.onFollowerRemoved = functions.region('asia-south1').firestore
    .document('users/{userId}/followers/{followerId}')
    .onDelete(async (_snap, context) => {
    const userId = context.params.userId;
    try {
        const userRef = config_1.db.collection('users').doc(userId);
        await config_1.db.runTransaction(async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists)
                return;
            const currentCount = userSnap.data()?.followerCount ?? 0;
            if (currentCount <= 0)
                return;
            transaction.update(userRef, {
                followerCount: admin.firestore.FieldValue.increment(-1),
            });
        });
    }
    catch (error) {
        console.error(`Failed to decrement followerCount for user ${userId}`, error);
    }
});
exports.onFollowingAdded = functions.region('asia-south1').firestore
    .document('users/{userId}/following/{targetId}')
    .onCreate(async (_snap, context) => {
    const userId = context.params.userId;
    try {
        await config_1.db.collection('users').doc(userId).update({
            followingCount: admin.firestore.FieldValue.increment(1),
        });
    }
    catch (error) {
        console.error(`Failed to increment followingCount for user ${userId}`, error);
    }
});
exports.onFollowingRemoved = functions.region('asia-south1').firestore
    .document('users/{userId}/following/{targetId}')
    .onDelete(async (_snap, context) => {
    const userId = context.params.userId;
    try {
        const userRef = config_1.db.collection('users').doc(userId);
        await config_1.db.runTransaction(async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists)
                return;
            const currentCount = userSnap.data()?.followingCount ?? 0;
            if (currentCount <= 0)
                return;
            transaction.update(userRef, {
                followingCount: admin.firestore.FieldValue.increment(-1),
            });
        });
    }
    catch (error) {
        console.error(`Failed to decrement followingCount for user ${userId}`, error);
    }
});
exports.followUser = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'followUser');
    const followerId = context.auth.uid;
    const followerName = typeof data.followerName === 'string' ? data.followerName : 'User';
    (0, schema_validation_1.validateFollowPayload)({
        followingId: data.followingId,
        followingName: data.followingName,
    });
    if (followerId === data.followingId) {
        throw new functions.https.HttpsError('invalid-argument', 'Cannot follow yourself');
    }
    const now = new Date().toISOString();
    const batch = config_1.db.batch();
    batch.set(config_1.db.collection('users').doc(followerId).collection('following').doc(data.followingId), { userId: data.followingId, userName: data.followingName, createdAt: now });
    batch.set(config_1.db.collection('users').doc(data.followingId).collection('followers').doc(followerId), { userId: followerId, userName: followerName, createdAt: now });
    await batch.commit();
    try {
        const communityId = await getCommunityIdForOwner(data.followingId);
        if (communityId) {
            const followerSnap = await config_1.db.collection('users').doc(followerId).get();
            const followerData = followerSnap.data();
            await (0, community_provisioning_1.joinCommunityMember)(communityId, followerId, followerData?.displayName || followerName, followerData?.avatarUrl);
        }
    }
    catch (joinError) {
        console.error('Failed to auto-join community on follow', joinError);
    }
    return { success: true };
});
exports.unfollowUser = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'unfollowUser');
    const followerId = context.auth.uid;
    const { followingId } = data;
    if (!followingId || typeof followingId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid followingId');
    }
    const batch = config_1.db.batch();
    batch.delete(config_1.db.collection('users').doc(followerId).collection('following').doc(followingId));
    batch.delete(config_1.db.collection('users').doc(followingId).collection('followers').doc(followerId));
    await batch.commit();
    return { success: true };
});
async function getCommunityIdForOwner(ownerId) {
    const snap = await config_1.db
        .collection('communities')
        .where('ownerId', '==', ownerId)
        .limit(1)
        .get();
    return snap.empty ? null : snap.docs[0].id;
}
//# sourceMappingURL=community.js.map