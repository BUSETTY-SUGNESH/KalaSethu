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
exports.getUserBidAnalytics = exports.auctionEndingSoon = exports.closeEndedAuctions = exports.startScheduledAuctions = exports.placeBid = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const auction_repository_1 = require("./repositories/auction.repository");
const app_check_1 = require("./utils/app-check");
const rate_limit_1 = require("./utils/rate-limit");
const schema_validation_1 = require("./utils/schema-validation");
const notification_helpers_1 = require("./notification-helpers");
const batch_commit_1 = require("./utils/batch-commit");
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
    const { auctionId, amount, bidderName } = data;
    if (!auctionId || typeof amount !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an auctionId and a valid amount.');
    }
    const bidderId = context.auth.uid;
    (0, schema_validation_1.validateBidPayload)({ auctionId, amount, bidderId });
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
            // Prevent bids if auction is ended
            if (auctionData?.status === 'ended') {
                throw new functions.https.HttpsError('failed-precondition', "Auction has already ended.");
            }
            if (auctionData?.status !== 'live' && auctionData?.status !== 'ending_soon') {
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
            // Anti-snipe: if bid is placed within last 5 minutes, extend auction by 5 mins
            const bidTime = new Date();
            const timeRemainingMs = endsAt.getTime() - bidTime.getTime();
            let newEndsAt = endsAt.toISOString();
            if (timeRemainingMs < 5 * 60 * 1000 && timeRemainingMs > 0) {
                const extendedTime = new Date(endsAt.getTime() + 5 * 60 * 1000);
                newEndsAt = extendedTime.toISOString();
                console.log(`Auction ${auctionId} extended due to snipe bid. New ends at: ${newEndsAt}`);
            }
            // Update the auction document with new highest bid +
            // track the new last bidder for future outbid detection
            transaction.update(auctionRef, {
                currentBid: amount,
                totalBids: admin.firestore.FieldValue.increment(1),
                endsAt: newEndsAt,
                lastBidderId: bidderId,
                lastBidderName: bidderName || 'Anonymous',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Write the new bid document
            const newBidRef = bidsRef.doc();
            transaction.set(newBidRef, {
                bidderId,
                bidderName: bidderName || 'Anonymous',
                amount,
                timestamp: bidTime.toISOString(),
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
            // ── Mark auction as ended ──────────────────────────────
            writer.write((batch) => {
                batch.update(doc.ref, {
                    status: "ended",
                    winnerId,
                    winnerName,
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
// getUserBidAnalytics — Callable (unchanged)
// ─────────────────────────────────────────────────────────────
exports.getUserBidAnalytics = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    try {
        const bidsSnapshot = await config_1.db.collectionGroup('bids').where('bidderId', '==', userId).get();
        const auctionIds = new Set();
        bidsSnapshot.docs.forEach(doc => {
            const auctionId = doc.ref.parent.parent?.id;
            if (auctionId)
                auctionIds.add(auctionId);
        });
        const uniqueAuctionIds = Array.from(auctionIds);
        if (uniqueAuctionIds.length === 0) {
            return {
                totalParticipated: 0,
                activeBids: 0,
                wonItems: 0,
                winRate: 0
            };
        }
        const chunkSize = 30;
        const auctionDocs = [];
        for (let i = 0; i < uniqueAuctionIds.length; i += chunkSize) {
            const chunk = uniqueAuctionIds.slice(i, i + chunkSize);
            const snapshot = await config_1.db.collection('auctions').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
            snapshot.docs.forEach(d => auctionDocs.push({ id: d.id, ...d.data() }));
        }
        let activeBids = 0;
        let wonItems = 0;
        let endedAuctionsParticipated = 0;
        for (const auction of auctionDocs) {
            const isEnded = auction.status === 'ended' || new Date(auction.endsAt).getTime() < Date.now();
            if (isEnded) {
                endedAuctionsParticipated++;
                if (auction.winnerId === userId) {
                    wonItems++;
                }
            }
            else {
                activeBids++;
            }
        }
        const winRate = endedAuctionsParticipated > 0
            ? Math.round((wonItems / endedAuctionsParticipated) * 100)
            : 0;
        return {
            totalParticipated: uniqueAuctionIds.length,
            activeBids,
            wonItems,
            winRate
        };
    }
    catch (error) {
        console.error("Error calculating bid analytics:", error);
        throw new functions.https.HttpsError('internal', 'Unable to calculate analytics.');
    }
});
//# sourceMappingURL=auction.js.map