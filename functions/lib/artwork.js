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
exports.moderateArtwork = exports.submitArtworkForReview = exports.onArtworkWritten = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const artwork_repository_1 = require("./repositories/artwork.repository");
const user_repository_1 = require("./repositories/user.repository");
const app_check_1 = require("./utils/app-check");
const rate_limit_1 = require("./utils/rate-limit");
const feature_flags_1 = require("./utils/feature-flags");
const batch_commit_1 = require("./utils/batch-commit");
const regions_1 = require("./constants/regions");
function isKeywordMaintenanceWrite(prevData, data) {
    if (!prevData || !data)
        return false;
    return ((prevData.title || '') === (data.title || '') &&
        (prevData.category || '') === (data.category || '') &&
        prevData.status === data.status &&
        prevData.artistId === data.artistId);
}
exports.onArtworkWritten = functions.region(regions_1.FIRESTORE_TRIGGER_REGION).firestore
    .document('artworks/{artworkId}')
    .onWrite(async (change, context) => {
    const artworkId = context.params.artworkId;
    const prevData = change.before.data();
    const data = change.after.data();
    // 1. Handle deletion / stats update
    if (!change.after.exists) {
        if (prevData?.status === 'published' && prevData?.artistId) {
            try {
                await config_1.db.collection("users").doc(prevData.artistId).update({
                    artworkCount: admin.firestore.FieldValue.increment(-1)
                });
                console.log(`Decremented artworkCount for artist: ${prevData.artistId}`);
            }
            catch (error) {
                console.error("Error decrementing artworkCount on delete", error);
            }
        }
        return;
    }
    // Skip re-processing when only searchKeywords/updatedAt changed (keyword echo write)
    if (change.before.exists && isKeywordMaintenanceWrite(prevData, data)) {
        return;
    }
    // 2. Handle status change / stats update
    const statusBefore = prevData?.status || 'draft';
    const statusAfter = data?.status || 'draft';
    const artistId = data?.artistId;
    if (artistId) {
        if (statusBefore !== 'published' && statusAfter === 'published') {
            try {
                await config_1.db.collection("users").doc(artistId).update({
                    artworkCount: admin.firestore.FieldValue.increment(1)
                });
                console.log(`Incremented artworkCount for artist: ${artistId}`);
            }
            catch (error) {
                console.error("Error incrementing artworkCount", error);
            }
        }
        else if (statusBefore === 'published' && statusAfter !== 'published') {
            try {
                await config_1.db.collection("users").doc(artistId).update({
                    artworkCount: admin.firestore.FieldValue.increment(-1)
                });
                console.log(`Decremented artworkCount for artist: ${artistId}`);
            }
            catch (error) {
                console.error("Error decrementing artworkCount", error);
            }
        }
    }
    // 3. Generate Search Keywords (avoid infinite loops)
    const titleBefore = prevData?.title || '';
    const titleAfter = data?.title || '';
    const catBefore = prevData?.category || '';
    const catAfter = data?.category || '';
    const keywordsNeedUpdate = !data?.searchKeywords || titleBefore !== titleAfter || catBefore !== catAfter;
    if (keywordsNeedUpdate) {
        const words = `${titleAfter} ${catAfter}`.toLowerCase()
            .replace(/[^\w\s]/g, '') // remove punctuation
            .split(/\s+/) // split by spaces
            .filter(w => w.length > 2); // only words of length > 2
        const uniqueKeywords = Array.from(new Set(words));
        const currentKeywords = data?.searchKeywords || [];
        const hasChanged = uniqueKeywords.length !== currentKeywords.length || !uniqueKeywords.every(val => currentKeywords.includes(val));
        if (hasChanged) {
            try {
                await change.after.ref.update({
                    searchKeywords: uniqueKeywords,
                });
                console.log(`Generated search keywords for artwork: ${artworkId}`);
            }
            catch (error) {
                console.error("Error updating searchKeywords", error);
            }
        }
    }
    // 4. Notify followers on publish
    if (statusAfter === 'published' && statusBefore !== 'published') {
        try {
            console.log(`Artwork ${artworkId} published! Notifying followers...`);
            if (artistId) {
                const followersSnap = await config_1.db.collection("users").doc(artistId).collection("followers").get();
                const writer = new batch_commit_1.ChunkedBatchWriter();
                for (const doc of followersSnap.docs) {
                    const followerId = doc.id;
                    writer.write((batch) => {
                        const notifRef = config_1.db.collection("users").doc(followerId).collection("notifications").doc();
                        batch.set(notifRef, {
                            userId: followerId,
                            title: "New Artwork Uploaded",
                            message: `${data.artistName || "An artist"} has uploaded a new artwork: "${data.title}"`,
                            type: "system",
                            isRead: false,
                            actionUrl: `/artwork/${artworkId}`,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    await writer.flushIfNeeded();
                }
                await writer.commit();
            }
        }
        catch (error) {
            console.error("Error processing artwork publication notifications", error);
        }
    }
});
exports.submitArtworkForReview = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'submitArtworkForReview');
    await (0, feature_flags_1.assertNotInMaintenance)(context.auth.uid);
    await (0, feature_flags_1.assertFeatureEnabled)('enable_artwork_uploads', 'Artwork uploads are currently disabled.');
    const { artworkId } = data;
    if (!artworkId || typeof artworkId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Missing artworkId');
    }
    const artwork = await artwork_repository_1.artworkRepository.getArtwork(artworkId);
    if (!artwork) {
        throw new functions.https.HttpsError('not-found', 'Artwork not found');
    }
    if (artwork.artistId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not the artwork owner');
    }
    if (!['draft', 'pending'].includes(artwork.status)) {
        throw new functions.https.HttpsError('failed-precondition', 'Artwork must be in draft or pending status to submit');
    }
    const userData = await user_repository_1.userRepository.getUser(context.auth.uid);
    const isVerified = userData?.role === 'verified_artist'
        || userData?.role === 'admin'
        || userData?.isVerified === true;
    const status = isVerified ? 'published' : 'pending';
    const updates = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (status === 'published') {
        updates.publishedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    try {
        await artwork_repository_1.artworkRepository.updateArtwork(artworkId, updates);
        return { success: true, status };
    }
    catch (error) {
        console.error('Submit artwork error', error);
        throw new functions.https.HttpsError('internal', 'Failed to submit artwork');
    }
});
exports.moderateArtwork = functions.region('asia-south1').https.onCall(async (data, context) => {
    // Only admins can call this
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'moderateArtwork');
    // Verify admin status (simplified)
    const userData = await user_repository_1.userRepository.getUser(context.auth.uid);
    if (userData?.role !== 'admin' && userData?.role !== 'moderator') {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin or moderator');
    }
    const { artworkId, action, reason } = data;
    if (!artworkId || !action) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
    }
    try {
        const status = action === 'approve' ? 'published' : 'rejected';
        const updates = {
            status,
            moderationReason: reason || null,
        };
        if (status === 'published') {
            updates.publishedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        await artwork_repository_1.artworkRepository.updateArtwork(artworkId, updates);
        return { success: true, status };
    }
    catch (error) {
        console.error("Moderation error", error);
        throw new functions.https.HttpsError('internal', 'Failed to moderate artwork');
    }
});
//# sourceMappingURL=artwork.js.map