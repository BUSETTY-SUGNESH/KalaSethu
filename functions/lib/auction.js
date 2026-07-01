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
exports.onAuctionCreated = exports.getUserBidAnalytics = exports.updateAuction = exports.cancelAuction = exports.auctionEndingSoon = exports.closeEndedAuctions = exports.startScheduledAuctions = exports.placeBid = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const auction_repository_1 = require("./repositories/auction.repository");
const app_check_1 = require("./utils/app-check");
const rate_limit_1 = require("./utils/rate-limit");
const feature_flags_1 = require("./utils/feature-flags");
const schema_validation_1 = require("./utils/schema-validation");
const notification_helpers_1 = require("./notification-helpers");
const batch_commit_1 = require("./utils/batch-commit");
const regions_1 = require("./constants/regions");
const community_announcements_1 = require("./utils/community-announcements");
// ─────────────────────────────────────────────────────────────
// placeBid — Secure callable function to place bids
// ─────────────────────────────────────────────────────────────
// Changes for Issue 2.3:
//   - Reads auctionData.lastBidderId inside the transaction
//     (already fetched — zero extra reads)
//   - Writes lastBidderId / lastBidderName to the auction
//     document on every bid so the next bidder can detect outbid
//   - After the transaction commits, dispatches a single
//     bid_outbid notification to the previous highest bidder
// ─────────────────────────────────────────────────────────────
exports.placeBid = functions.region('asia-south1').https.onCall(async (data, context) => {
    // Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to place a bid.');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'placeBid');
    await (0, feature_flags_1.assertNotInMaintenance)(context.auth.uid);
    await (0, feature_flags_1.assertFeatureEnabled)('enable_auctions', 'Auctions are currently disabled.');
    const { auctionId, amount } = data;
    if (!auctionId || typeof amount !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an auctionId and a valid amount.');
    }
    const bidderId = context.auth.uid;
    (0, schema_validation_1.validateBidPayload)({ auctionId, amount, bidderId });
    let resolvedBidderName = 'Anonymous';
    try {
        const userRecord = await admin.auth().getUser(bidderId);
        resolvedBidderName = userRecord.displayName || 'Anonymous';
    }
    catch {
        // Fall back to Anonymous if auth lookup fails
    }
    const auctionRef = config_1.db.collection("auctions").doc(auctionId);
    const bidsRef = auctionRef.collection("bids");
    // Capture the previous highest bidder before the transaction mutates the doc
    let previousBidderId = null;
    let capturedAuctionData = null;
    try {
        const result = await config_1.db.runTransaction(async (transaction) => {
            const auctionDoc = await transaction.get(auctionRef);
            if (!auctionDoc.exists) {
                throw new functions.https.HttpsError('not-found', "Auction does not exist!");
            }
            const auctionData = auctionDoc.data();
            // Prevent bids if auction is ended or cancelled
            if (auctionData?.status === 'ended' || auctionData?.status === 'cancelled' || auctionData?.status === 'completed') {
                throw new functions.https.HttpsError('failed-precondition', "Auction has already ended.");
            }
            const startsAt = new Date(auctionData?.startsAt);
            if (auctionData?.status === 'scheduled') {
                if (startsAt.getTime() > Date.now()) {
                    throw new functions.https.HttpsError('failed-precondition', 'Auction has not started yet.');
                }
            }
            else if (auctionData?.status !== 'live' && auctionData?.status !== 'ending_soon') {
                throw new functions.https.HttpsError('failed-precondition', "Auction is not currently accepting bids.");
            }
            const endsAt = new Date(auctionData?.endsAt);
            if (endsAt.getTime() < Date.now()) {
                throw new functions.https.HttpsError('failed-precondition', "Auction has already ended.");
            }
            if (auctionData?.artistId === bidderId) {
                throw new functions.https.HttpsError('failed-precondition', "You cannot bid on your own auction.");
            }
            if (amount < auctionData.currentBid + auctionData.minIncrement) {
                throw new functions.https.HttpsError('failed-precondition', `Bid amount must be at least ₹${(auctionData.currentBid + auctionData.minIncrement).toLocaleString('en-IN')}`);
            }
            // ── Capture previous bidder for outbid notification ────
            // lastBidderId is the previous highest bidder stored from
            // the last bid placement. Only trigger outbid if the new
            // bidder is different from the previous one.
            const prevBidderId = auctionData.lastBidderId;
            if (prevBidderId && prevBidderId !== bidderId) {
                previousBidderId = prevBidderId;
            }
            // Retain auction metadata snapshot for the notification copy
            capturedAuctionData = auctionData;
            const priorBidSnap = await transaction.get(bidsRef.where('bidderId', '==', bidderId).limit(1));
            const isNewBidder = priorBidSnap.empty;
            // Anti-snipe: extend by extensionMinutes if bid placed within that window
            const bidTime = new Date();
            const timeRemainingMs = endsAt.getTime() - bidTime.getTime();
            const extMins = auctionData.extensionMinutes ?? 5;
            let newEndsAt = endsAt.toISOString();
            if (extMins > 0 && timeRemainingMs < extMins * 60 * 1000 && timeRemainingMs > 0) {
                const extendedTime = new Date(endsAt.getTime() + extMins * 60 * 1000);
                newEndsAt = extendedTime.toISOString();
                console.log(`Auction ${auctionId} extended due to snipe bid. New ends at: ${newEndsAt}`);
            }
            const newStatus = (auctionData.status === 'live' || auctionData.status === 'scheduled') &&
                timeRemainingMs <= 24 * 60 * 60 * 1000
                ? 'ending_soon'
                : auctionData.status === 'scheduled'
                    ? 'live'
                    : auctionData.status;
            // Update the auction document with new highest bid +
            // track the new last bidder for future outbid detection
            const auctionUpdate = {
                currentBid: amount,
                totalBids: admin.firestore.FieldValue.increment(1),
                endsAt: newEndsAt,
                lastBidderId: bidderId,
                lastBidderName: resolvedBidderName,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            if (isNewBidder) {
                auctionUpdate.uniqueBidders = admin.firestore.FieldValue.increment(1);
            }
            if (newStatus !== auctionData.status) {
                auctionUpdate.status = newStatus;
            }
            transaction.update(auctionRef, auctionUpdate);
            // Write the new bid document
            const newBidRef = bidsRef.doc();
            transaction.set(newBidRef, {
                bidderId,
                bidderName: resolvedBidderName,
                amount,
                timestamp: bidTime.toISOString(),
                auctionId,
                currency: 'INR',
                status: 'active',
            });
            return { success: true, bidId: newBidRef.id, amount, newEndsAt };
        });
        // ── Post-transaction: fire outbid notification ──────────
        // This is intentionally outside the transaction — notification
        // failures must never block or roll back a successful bid.
        if (previousBidderId && capturedAuctionData) {
            // Use bracket access + cast: firebase-admin DocumentData returns `any`
            // for each field, so we cast explicitly rather than rely on dot-access
            // which TypeScript sometimes narrows incorrectly.
            const d = capturedAuctionData;
            const auctionForNotif = {
                id: auctionId,
                artworkTitle: d['artworkTitle'],
                artworkImageUrl: d['artworkImageUrl'],
                artworkId: d['artworkId'],
                artistId: d['artistId'],
                artistName: d['artistName'],
                currentBid: d['currentBid'] ?? 0,
                status: d['status'],
                endsAt: d['endsAt'],
                bidCount: d['totalBids'] ?? 0,
            };
            // Fire-and-forget — intentionally not awaited
            (0, notification_helpers_1.notifyOutbid)(previousBidderId, auctionForNotif, amount).catch((err) => console.error('[placeBid] notifyOutbid failed (non-critical):', err));
        }
        return result;
    }
    catch (error) {
        console.error(`Failed to process bid for auction ${auctionId}`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Unable to place bid at this time. Please try again.');
    }
});
// ─────────────────────────────────────────────────────────────
// startScheduledAuctions — Scheduled (every 1 minute)
// ─────────────────────────────────────────────────────────────
// Transitions auctions from scheduled → live when startsAt has passed.
// Idempotent: only queries status == 'scheduled'; once live, never re-selected.
// ─────────────────────────────────────────────────────────────
exports.startScheduledAuctions = functions.region('asia-south1').pubsub
    .schedule('every 1 minutes')
    .onRun(async () => {
    const now = new Date().toISOString();
    try {
        const snapshotDocs = await auction_repository_1.auctionRepository.getScheduledAuctionsReadyToStart(now);
        if (snapshotDocs.length === 0) {
            return null;
        }
        console.log(`Found ${snapshotDocs.length} scheduled auctions to start`);
        const writer = new batch_commit_1.ChunkedBatchWriter();
        for (const doc of snapshotDocs) {
            writer.write((batch) => {
                batch.update(doc.ref, {
                    status: 'live',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            });
            await writer.flushIfNeeded();
        }
        await writer.commit();
        console.log(`Successfully started ${snapshotDocs.length} auctions`);
    }
    catch (error) {
        console.error('Error starting scheduled auctions', error);
    }
    return null;
});
// ─────────────────────────────────────────────────────────────
// closeEndedAuctions — Scheduled (every 1 minute)
// ─────────────────────────────────────────────────────────────
// Changes for Issue 2.3:
//   - For each closed auction, resolves all unique bidders
//   - Batch-writes win / loss / artist notifications in the
//     SAME batch as the auction status update
//   - Duplicate prevention: once status becomes 'ended' the
//     query filter (status in live/ending_soon) never re-selects it
// ─────────────────────────────────────────────────────────────
exports.closeEndedAuctions = functions.region('asia-south1').pubsub.schedule('every 1 minutes').onRun(async (context) => {
    const now = new Date().toISOString();
    try {
        const snapshotDocs = await auction_repository_1.auctionRepository.getActiveEndedAuctions(now);
        if (snapshotDocs.length === 0) {
            return null;
        }
        console.log(`Found ${snapshotDocs.length} auctions to close`);
        const writer = new batch_commit_1.ChunkedBatchWriter();
        for (const doc of snapshotDocs) {
            const auctionData = doc.data();
            // ── Determine winner ───────────────────────────────────
            const winningBid = await auction_repository_1.auctionRepository.getLatestBid(doc.id);
            let winnerId = null;
            let winnerName = null;
            let winningAmount = auctionData.currentBid ?? 0;
            if (winningBid) {
                winnerId = winningBid.bidderId;
                winnerName = winningBid.bidderName;
                winningAmount = winningBid.amount;
            }
            if (winningBid && auctionData.reservePrice && winningAmount < auctionData.reservePrice) {
                winnerId = null;
                winnerName = null;
            }
            // ── Mark auction as ended ──────────────────────────────
            writer.write((batch) => {
                batch.update(doc.ref, {
                    status: "ended",
                    winnerId,
                    winnerName,
                    winningBid: winnerId ? winningAmount : null,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            await writer.flushIfNeeded();
            // ── Build notification payloads ────────────────────────
            const auction = {
                id: doc.id,
                artworkId: auctionData.artworkId,
                artworkTitle: auctionData.artworkTitle,
                artworkImageUrl: auctionData.artworkImageUrl,
                artistId: auctionData.artistId,
                artistName: auctionData.artistName,
                currentBid: auctionData.currentBid ?? 0,
                status: 'ended',
                endsAt: auctionData.endsAt,
                bidCount: auctionData.totalBids ?? 0,
                reservePrice: auctionData.reservePrice,
            };
            if (winnerId) {
                writer.write((batch) => (0, notification_helpers_1.batchNotifyAuctionWon)(batch, winnerId, auction, winningAmount));
                await writer.flushIfNeeded();
            }
            try {
                const allBidderIds = await (0, notification_helpers_1.getUniqueBidderIds)(doc.id);
                for (const bidderId of allBidderIds) {
                    if (bidderId !== winnerId) {
                        writer.write((batch) => (0, notification_helpers_1.batchNotifyAuctionLost)(batch, bidderId, auction));
                        await writer.flushIfNeeded();
                    }
                }
            }
            catch (bidderErr) {
                console.error(`[closeEndedAuctions] Failed to fetch bidders for auction ${doc.id}:`, bidderErr);
            }
            const artistId = auctionData.artistId;
            if (artistId) {
                writer.write((batch) => (0, notification_helpers_1.batchNotifyArtistAuctionClosed)(batch, artistId, auction, winnerId, winnerName, winningAmount));
                await writer.flushIfNeeded();
            }
        }
        await writer.commit();
        console.log(`Successfully closed ${snapshotDocs.length} auctions with notifications`);
    }
    catch (error) {
        console.error("Error closing auctions", error);
    }
    return null;
});
// ─────────────────────────────────────────────────────────────
// auctionEndingSoon — Scheduled (every 5 minutes)
// ─────────────────────────────────────────────────────────────
// Fires ending-soon notifications at three intervals before
// an auction closes: 24 hours, 1 hour, and 15 minutes.
//
// Duplicate prevention:
//   - Each auction doc has a `notifiedIntervals` string array
//   - Before sending, the function checks if the interval key
//     ('24h', '1h', '15m') is already present
//   - If absent, the key is added atomically in the same batch
//     write, guaranteeing each interval fires at most once
// ─────────────────────────────────────────────────────────────
// Ending-soon windows: [ intervalKey, labelForCopy, windowMs, lookaheadMs ]
const ENDING_SOON_WINDOWS = [
    // key    label         min window   max window (look-ahead)
    ['15m', '15 minutes', 0, 15 * 60 * 1000],
    ['1h', '1 hour', 15 * 60 * 1000, 60 * 60 * 1000],
    ['24h', '24 hours', 60 * 60 * 1000, 24 * 60 * 60 * 1000],
];
exports.auctionEndingSoon = functions.region('asia-south1').pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
    const now = Date.now();
    try {
        const snap = await config_1.db
            .collection('auctions')
            .where('status', 'in', ['live', 'ending_soon'])
            .get();
        if (snap.empty)
            return null;
        const writer = new batch_commit_1.ChunkedBatchWriter();
        let notifCount = 0;
        for (const doc of snap.docs) {
            const auctionData = doc.data();
            const endsAt = new Date(auctionData.endsAt).getTime();
            const timeRemainingMs = endsAt - now;
            if (timeRemainingMs <= 0)
                continue;
            const notifiedIntervals = auctionData.notifiedIntervals ?? [];
            const within24h = timeRemainingMs <= 24 * 60 * 60 * 1000;
            if (auctionData.status === 'live' && within24h) {
                writer.write((batch) => {
                    batch.update(doc.ref, {
                        status: 'ending_soon',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                });
                await writer.flushIfNeeded();
            }
            const auction = {
                id: doc.id,
                artworkId: auctionData.artworkId,
                artworkTitle: auctionData.artworkTitle,
                artworkImageUrl: auctionData.artworkImageUrl,
                artistId: auctionData.artistId,
                artistName: auctionData.artistName,
                currentBid: auctionData.currentBid ?? 0,
                status: auctionData.status,
                endsAt: auctionData.endsAt,
                bidCount: auctionData.totalBids ?? 0,
            };
            const intervalsToFire = [];
            for (const [key, label, minWindow, maxWindow] of ENDING_SOON_WINDOWS) {
                if (timeRemainingMs > minWindow &&
                    timeRemainingMs <= maxWindow &&
                    !notifiedIntervals.includes(key)) {
                    intervalsToFire.push([key, label]);
                }
            }
            if (intervalsToFire.length === 0)
                continue;
            let bidderIds = [];
            try {
                bidderIds = await (0, notification_helpers_1.getUniqueBidderIds)(doc.id);
            }
            catch (err) {
                console.error(`[auctionEndingSoon] Failed to fetch bidders for ${doc.id}:`, err);
                continue;
            }
            if (bidderIds.length === 0)
                continue;
            for (const [key, label] of intervalsToFire) {
                for (const bidderId of bidderIds) {
                    writer.write((batch) => (0, notification_helpers_1.batchNotifyAuctionEndingSoon)(batch, [bidderId], auction, label));
                    notifCount++;
                    await writer.flushIfNeeded();
                }
                writer.write((batch) => {
                    batch.update(doc.ref, {
                        notifiedIntervals: admin.firestore.FieldValue.arrayUnion(key),
                    });
                });
                await writer.flushIfNeeded();
            }
        }
        await writer.commit();
        if (notifCount > 0) {
            console.log(`[auctionEndingSoon] Dispatched ${notifCount} ending-soon notifications`);
        }
    }
    catch (error) {
        console.error('[auctionEndingSoon] Error:', error);
    }
    return null;
});
// ─────────────────────────────────────────────────────────────
// cancelAuction — Callable for artists to cancel their auction
// ─────────────────────────────────────────────────────────────
exports.cancelAuction = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }
    await (0, feature_flags_1.assertNotInMaintenance)(context.auth.uid);
    await (0, feature_flags_1.assertFeatureEnabled)('enable_auctions', 'Auctions are currently disabled.');
    const { auctionId } = data;
    if (!auctionId || typeof auctionId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'auctionId is required.');
    }
    const uid = context.auth.uid;
    const auctionRef = config_1.db.collection('auctions').doc(auctionId);
    await config_1.db.runTransaction(async (transaction) => {
        const auctionDoc = await transaction.get(auctionRef);
        if (!auctionDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Auction does not exist.');
        }
        const auctionData = auctionDoc.data();
        if (auctionData.artistId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You can only cancel your own auctions.');
        }
        const status = auctionData.status;
        if (!['scheduled', 'live', 'ending_soon'].includes(status)) {
            throw new functions.https.HttpsError('failed-precondition', 'This auction cannot be cancelled.');
        }
        if ((auctionData.totalBids ?? 0) > 0) {
            throw new functions.https.HttpsError('failed-precondition', 'Cannot cancel an auction that has received bids.');
        }
        transaction.update(auctionRef, {
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { success: true };
});
// ─────────────────────────────────────────────────────────────
// updateAuction — Callable for artists to edit scheduled auctions
// ─────────────────────────────────────────────────────────────
exports.updateAuction = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }
    await (0, feature_flags_1.assertNotInMaintenance)(context.auth.uid);
    await (0, feature_flags_1.assertFeatureEnabled)('enable_auctions', 'Auctions are currently disabled.');
    const { auctionId, startPrice, reservePrice, minIncrement, startsAt, endsAt, extensionMinutes, type, } = data;
    if (!auctionId || typeof auctionId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'auctionId is required.');
    }
    const uid = context.auth.uid;
    const auctionRef = config_1.db.collection('auctions').doc(auctionId);
    await config_1.db.runTransaction(async (transaction) => {
        const auctionDoc = await transaction.get(auctionRef);
        if (!auctionDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Auction does not exist.');
        }
        const auctionData = auctionDoc.data();
        if (auctionData.artistId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You can only edit your own auctions.');
        }
        if (auctionData.status !== 'scheduled') {
            throw new functions.https.HttpsError('failed-precondition', 'Only scheduled auctions with no bids can be edited.');
        }
        if ((auctionData.totalBids ?? 0) > 0) {
            throw new functions.https.HttpsError('failed-precondition', 'Cannot edit an auction that has received bids.');
        }
        const updates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (startPrice !== undefined) {
            if (typeof startPrice !== 'number' || startPrice <= 0) {
                throw new functions.https.HttpsError('invalid-argument', 'startPrice must be a positive number.');
            }
            updates.startPrice = startPrice;
            updates.currentBid = startPrice;
        }
        if (reservePrice !== undefined) {
            const effectiveStart = updates.startPrice ?? auctionData.startPrice;
            if (reservePrice !== null && (typeof reservePrice !== 'number' || reservePrice < effectiveStart)) {
                throw new functions.https.HttpsError('invalid-argument', 'reservePrice must be at least the starting price.');
            }
            updates.reservePrice = reservePrice ?? null;
        }
        if (minIncrement !== undefined) {
            if (typeof minIncrement !== 'number' || minIncrement <= 0) {
                throw new functions.https.HttpsError('invalid-argument', 'minIncrement must be a positive number.');
            }
            updates.minIncrement = minIncrement;
        }
        if (startsAt !== undefined) {
            if (typeof startsAt !== 'string' || isNaN(new Date(startsAt).getTime())) {
                throw new functions.https.HttpsError('invalid-argument', 'startsAt must be a valid ISO timestamp.');
            }
            updates.startsAt = startsAt;
        }
        if (endsAt !== undefined) {
            if (typeof endsAt !== 'string' || isNaN(new Date(endsAt).getTime())) {
                throw new functions.https.HttpsError('invalid-argument', 'endsAt must be a valid ISO timestamp.');
            }
            const effectiveStarts = updates.startsAt ?? auctionData.startsAt;
            if (new Date(endsAt) <= new Date(effectiveStarts)) {
                throw new functions.https.HttpsError('invalid-argument', 'endsAt must be after startsAt.');
            }
            updates.endsAt = endsAt;
            updates.originalEndsAt = endsAt;
        }
        if (extensionMinutes !== undefined) {
            if (typeof extensionMinutes !== 'number' || extensionMinutes < 0) {
                throw new functions.https.HttpsError('invalid-argument', 'extensionMinutes must be a non-negative number.');
            }
            updates.extensionMinutes = extensionMinutes;
        }
        if (type !== undefined) {
            if (!['timed', 'live'].includes(type)) {
                throw new functions.https.HttpsError('invalid-argument', 'type must be timed or live.');
            }
            updates.type = type;
        }
        transaction.update(auctionRef, updates);
    });
    return { success: true };
});
// ─────────────────────────────────────────────────────────────
// getUserBidAnalytics — Callable (unchanged)
// ─────────────────────────────────────────────────────────────
exports.getUserBidAnalytics = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    try {
        const bidsSnapshot = await config_1.db
            .collectionGroup('bids')
            .where('bidderId', '==', userId)
            .orderBy('timestamp', 'desc')
            .get();
        const auctionIds = new Set();
        const maxBidByAuction = new Map();
        bidsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            const amount = typeof data.amount === 'number' ? data.amount : 0;
            const parts = doc.ref.path.split('/');
            const auctionsIndex = parts.indexOf('auctions');
            let auctionId;
            if (auctionsIndex >= 0 && parts[auctionsIndex + 1]) {
                auctionId = parts[auctionsIndex + 1];
            }
            else if (typeof data.auctionId === 'string') {
                auctionId = data.auctionId;
            }
            if (auctionId && !auctionId.includes('/')) {
                auctionIds.add(auctionId);
                const existing = maxBidByAuction.get(auctionId) || 0;
                if (amount > existing) {
                    maxBidByAuction.set(auctionId, amount);
                }
            }
        });
        const uniqueAuctionIds = Array.from(auctionIds);
        if (uniqueAuctionIds.length === 0) {
            return {
                totalParticipated: 0,
                activeBids: 0,
                wonItems: 0,
                winRate: 0,
                activeBidExposure: 0,
            };
        }
        const chunkSize = 30;
        const auctionDocs = [];
        for (let i = 0; i < uniqueAuctionIds.length; i += chunkSize) {
            const chunk = uniqueAuctionIds.slice(i, i + chunkSize).filter(Boolean);
            if (chunk.length === 0)
                continue;
            const snapshot = await config_1.db
                .collection('auctions')
                .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
                .get();
            snapshot.docs.forEach((d) => auctionDocs.push({ id: d.id, ...d.data() }));
        }
        let activeBids = 0;
        let wonItems = 0;
        let endedAuctionsParticipated = 0;
        let activeBidExposure = 0;
        for (const auction of auctionDocs) {
            const endsAtMs = parseAuctionEndsAt(auction.endsAt);
            const isEnded = auction.status === 'ended' ||
                (endsAtMs > 0 && endsAtMs < Date.now());
            if (isEnded) {
                endedAuctionsParticipated++;
                if (auction.winnerId === userId) {
                    wonItems++;
                }
            }
            else {
                activeBids++;
                activeBidExposure += maxBidByAuction.get(auction.id) || 0;
            }
        }
        const winRate = endedAuctionsParticipated > 0
            ? Math.round((wonItems / endedAuctionsParticipated) * 100)
            : 0;
        return {
            totalParticipated: uniqueAuctionIds.length,
            activeBids,
            wonItems,
            winRate,
            activeBidExposure,
        };
    }
    catch (error) {
        console.error('Error calculating bid analytics:', error);
        throw new functions.https.HttpsError('internal', 'Unable to calculate analytics.');
    }
});
exports.onAuctionCreated = functions.region(regions_1.FIRESTORE_TRIGGER_REGION).firestore
    .document('auctions/{auctionId}')
    .onCreate(async (snap, context) => {
    const auctionId = context.params.auctionId;
    const data = snap.data();
    if (!data)
        return;
    const status = data.status;
    if (status !== 'active' && status !== 'upcoming')
        return;
    const artistId = data.artistId;
    if (!artistId)
        return;
    const artworkTitle = data.artworkTitle || 'New auction';
    const artistName = data.artistName || 'An artist';
    try {
        await (0, community_announcements_1.postArtistCommunityAnnouncement)(config_1.db, artistId, {
            event: 'auction_created',
            title: artworkTitle,
            body: `${artistName} started a new auction for "${artworkTitle}"`,
            actionUrl: data.artworkId ? `/artwork/${data.artworkId}` : undefined,
            auctionId,
            artworkId: data.artworkId,
        });
    }
    catch (error) {
        console.error('Error posting community auction announcement', error);
    }
});
function parseAuctionEndsAt(endsAt) {
    if (!endsAt)
        return 0;
    if (typeof endsAt === 'string') {
        const ms = new Date(endsAt).getTime();
        return Number.isNaN(ms) ? 0 : ms;
    }
    if (typeof endsAt === 'object' &&
        endsAt !== null &&
        'toDate' in endsAt &&
        typeof endsAt.toDate === 'function') {
        return endsAt.toDate().getTime();
    }
    return 0;
}
//# sourceMappingURL=auction.js.map