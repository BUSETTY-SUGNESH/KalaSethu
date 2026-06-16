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
exports.moderateArtwork = exports.onArtworkWritten = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const artwork_repository_1 = require("./repositories/artwork.repository");
const user_repository_1 = require("./repositories/user.repository");
exports.onArtworkWritten = functions.firestore
    .document('artworks/{artworkId}')
    .onWrite(async (change, context) => {
    // If the document was deleted, do nothing
    if (!change.after.exists)
        return;
    const data = change.after.data();
    const prevData = change.before.data();
    const artworkId = context.params.artworkId;
    // Check if status changed to 'published'
    if (data?.status === 'published' && prevData?.status !== 'published') {
        try {
            // Send a notification to followers (simulated)
            // In a real app, you'd fetch followers of data.artistId and create notifications
            console.log(`Artwork ${artworkId} published! Notifying followers...`);
        }
        catch (error) {
            console.error("Error processing artwork publication", error);
        }
    }
});
exports.moderateArtwork = functions.https.onCall(async (data, context) => {
    // Only admins can call this
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    // Verify admin status (simplified)
    const userData = await user_repository_1.userRepository.getUser(context.auth.uid);
    if (userData?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin');
    }
    const { artworkId, action, reason } = data;
    if (!artworkId || !action) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
    }
    try {
        const status = action === 'approve' ? 'published' : 'rejected';
        await artwork_repository_1.artworkRepository.updateArtwork(artworkId, {
            status,
            moderationReason: reason || null,
        });
        return { success: true, status };
    }
    catch (error) {
        console.error("Moderation error", error);
        throw new functions.https.HttpsError('internal', 'Failed to moderate artwork');
    }
});
//# sourceMappingURL=artwork.js.map