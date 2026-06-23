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
exports.getUserBidAnalytics = exports.closeEndedAuctions = exports.placeBid = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const auction_repository_1 = require("./repositories/auction.repository");
// This is a secure callable function to place bids and update the auction transactionally
exports.placeBid = functions.region('asia-south1').https.onCall(async (data, context) => {
    // Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to place a bid.');
    }
    const { auctionId, amount, bidderName } = data;
    if (!auctionId || typeof amount !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an auctionId and a valid amount.');
    }
    const bidderId = context.auth.uid;
    const auctionRef = config_1.db.collection("auctions").doc(auctionId);
    const bidsRef = auctionRef.collection("bids");
    try {
        return await config_1.db.runTransaction(async (transaction) => {
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
            // Anti-snipe: if bid is placed within last 5 minutes, extend auction by 5 mins
            const bidTime = new Date();
            const timeRemainingMs = endsAt.getTime() - bidTime.getTime();
            let newEndsAt = endsAt.toISOString();
            if (timeRemainingMs < 5 * 60 * 1000 && timeRemainingMs > 0) {
                // Add 5 minutes to endsAt
                const extendedTime = new Date(endsAt.getTime() + 5 * 60 * 1000);
                newEndsAt = extendedTime.toISOString();
                console.log(`Auction ${auctionId} extended due to snipe bid. New ends at: ${newEndsAt}`);
            }
            // Update the auction document with new highest bid
            transaction.update(auctionRef, {
                currentBid: amount,
                totalBids: admin.firestore.FieldValue.increment(1),
                endsAt: newEndsAt,
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
    }
    catch (error) {
        console.error(`Failed to process bid for auction ${auctionId}`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Unable to place bid at this time. Please try again.');
    }
});
// A scheduled function that checks for ended auctions (Runs every minute)
exports.closeEndedAuctions = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
    const now = new Date().toISOString();
    try {
        // Find all active auctions where endsAt has passed
        const snapshotDocs = await auction_repository_1.auctionRepository.getActiveEndedAuctions(now);
        if (snapshotDocs.length === 0) {
            return null;
        }
        console.log(`Found ${snapshotDocs.length} auctions to close`);
        const batch = config_1.db.batch();
        for (const doc of snapshotDocs) {
            // Determine winner
            // We need the highest bid. The auction doc has currentBid, but to get the winner we should query the latest bid.
            const winningBid = await auction_repository_1.auctionRepository.getLatestBid(doc.id);
            let winnerId = null;
            let winnerName = null;
            if (winningBid) {
                winnerId = winningBid.bidderId;
                winnerName = winningBid.bidderName;
            }
            batch.update(doc.ref, {
                status: "ended",
                winnerId,
                winnerName,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // We could also trigger notifications here to the winner and seller
        }
        await batch.commit();
        console.log(`Successfully closed ${snapshotDocs.length} auctions`);
    }
    catch (error) {
        console.error("Error closing auctions", error);
    }
    return null;
});
// Calculate bid analytics for a user securely
exports.getUserBidAnalytics = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    try {
        // Get all bids placed by the user
        const bidsSnapshot = await config_1.db.collectionGroup('bids').where('bidderId', '==', userId).get();
        // Extract unique auction IDs
        const auctionIds = new Set();
        bidsSnapshot.docs.forEach(doc => {
            // The path is auctions/{auctionId}/bids/{bidId}
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
        // Firestore 'in' query limit is 30. Chunk the requests.
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
                // Count active auctions they participated in as active bids
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