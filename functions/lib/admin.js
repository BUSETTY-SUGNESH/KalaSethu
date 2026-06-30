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
exports.aggregateAnalytics = exports.verifyArtist = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const app_check_1 = require("./utils/app-check");
const rate_limit_1 = require("./utils/rate-limit");
exports.verifyArtist = functions.region('asia-south1').https.onCall(async (data, context) => {
    // Only admins can call this
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'verifyArtist');
    // Verify admin status
    const userDoc = await config_1.db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'moderator') {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin or moderator');
    }
    const { targetUserId, isVerified, verificationId } = data;
    if (!targetUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'Target User ID is required');
    }
    try {
        const role = isVerified ? 'verified_artist' : 'artist';
        const status = isVerified ? 'approved' : 'rejected';
        await config_1.db.collection("users").doc(targetUserId).update({
            role,
            isVerified,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Update the verification application document status
        if (verificationId) {
            await config_1.db.collection("artistVerifications").doc(verificationId).update({
                status,
                reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                reviewNotes: isVerified ? "Approved via admin console." : "Rejected via admin console."
            });
        }
        else {
            const verifSnap = await config_1.db.collection("artistVerifications")
                .where("artistId", "==", targetUserId)
                .where("status", "==", "pending")
                .limit(1)
                .get();
            if (!verifSnap.empty) {
                await verifSnap.docs[0].ref.update({
                    status,
                    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    reviewNotes: isVerified ? "Approved via admin console." : "Rejected via admin console."
                });
            }
        }
        // Notify the user
        await config_1.db.collection("users").doc(targetUserId).collection("notifications").add({
            userId: targetUserId,
            title: "Verification Status Updated",
            message: isVerified ? "Congratulations! You are now a Verified Artisan." : "Your verification status has been updated.",
            type: "system",
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        if (isVerified) {
            try {
                const targetSnap = await config_1.db.collection("users").doc(targetUserId).get();
                const targetData = targetSnap.data();
                const { provisionArtistCommunity } = await Promise.resolve().then(() => __importStar(require('./community-provisioning')));
                await provisionArtistCommunity(targetUserId, targetData?.displayName || 'Artist', targetData?.avatarUrl);
            }
            catch (provisionError) {
                console.error('Failed to provision artist community', provisionError);
            }
        }
        return { success: true, role, isVerified };
    }
    catch (error) {
        console.error("Verification error", error);
        throw new functions.https.HttpsError('internal', 'Failed to update verification status');
    }
});
const BATCH_SIZE = 500;
async function countQuery(query) {
    const snap = await query.count().get();
    return snap.data().count;
}
function growthPercent(current, previous) {
    if (!previous)
        return 0;
    return Math.round(((current - previous) / previous) * 10000) / 100;
}
async function sumCompletedOrderRevenue(sinceIso) {
    let total = 0;
    let lastDoc;
    while (true) {
        let query = config_1.db
            .collection("orders")
            .where("paymentStatus", "==", "completed");
        if (sinceIso) {
            query = query.where("createdAt", ">=", sinceIso);
        }
        query = query.limit(BATCH_SIZE);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        const snap = await query.get();
        if (snap.empty)
            break;
        for (const doc of snap.docs) {
            total += doc.data().totalAmount || 0;
        }
        if (snap.size < BATCH_SIZE)
            break;
        lastDoc = snap.docs[snap.docs.length - 1];
    }
    return total;
}
// A scheduled function to aggregate analytics for the admin dashboard
exports.aggregateAnalytics = functions.region('asia-south1').pubsub.schedule('every 24 hours').onRun(async (context) => {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const prevSnap = await config_1.db.collection("analytics").doc("platform_stats").get();
        const prev = prevSnap.data() || {};
        const [totalUsers, totalArtworks, totalOrders, totalArtists, verifiedArtists, pendingVerifications, activeAuctions, activeEvents, openDisputes, dailyActiveUsers, completedOrders,] = await Promise.all([
            countQuery(config_1.db.collection("users")),
            countQuery(config_1.db.collection("artworks")),
            countQuery(config_1.db.collection("orders")),
            countQuery(config_1.db.collection("users").where("role", "in", ["artist", "verified_artist"])),
            countQuery(config_1.db.collection("users").where("isVerified", "==", true)),
            countQuery(config_1.db.collection("artistVerifications").where("status", "==", "pending")),
            countQuery(config_1.db.collection("auctions").where("status", "in", ["live", "ending_soon"])),
            countQuery(config_1.db.collection("events").where("status", "in", ["upcoming", "live"])),
            countQuery(config_1.db.collection("orders").where("status", "==", "refund_requested")),
            countQuery(config_1.db.collection("users").where("lastLoginAt", ">=", oneDayAgo)),
            countQuery(config_1.db.collection("orders").where("paymentStatus", "==", "completed")),
        ]);
        const [totalRevenue, monthlyGMV] = await Promise.all([
            sumCompletedOrderRevenue(),
            sumCompletedOrderRevenue(thirtyDaysAgo),
        ]);
        const conversionRate = totalUsers > 0
            ? Math.round((completedOrders / totalUsers) * 10000) / 100
            : 0;
        const userGrowth = growthPercent(totalUsers, prev.totalUsers || 0);
        const revenueGrowth = growthPercent(totalRevenue, prev.totalRevenue || 0);
        await config_1.db.collection("analytics").doc("platform_stats").set({
            totalUsers,
            totalArtists,
            verifiedArtists,
            totalArtworks,
            totalOrders,
            totalRevenue,
            monthlyGMV,
            activeAuctions,
            activeEvents,
            pendingVerifications,
            dailyActiveUsers,
            openDisputes,
            conversionRate,
            userGrowth,
            revenueGrowth,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log("Successfully aggregated analytics");
    }
    catch (error) {
        console.error("Error aggregating analytics", error);
    }
    return null;
});
//# sourceMappingURL=admin.js.map