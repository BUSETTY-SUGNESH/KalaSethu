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
exports.closeEndedAuctions = exports.onBidPlaced = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const auction_repository_1 = require("./repositories/auction.repository");
// This runs automatically when a new bid is created in the subcollection
exports.onBidPlaced = functions.firestore
    .document('auctions/{auctionId}/bids/{bidId}')
    .onCreate(async (snap, context) => {
    const bidData = snap.data();
    const auctionId = context.params.auctionId;
    const auctionRef = config_1.db.collection("auctions").doc(auctionId);
    try {
        await config_1.db.runTransaction(async (transaction) => {
            const auctionDoc = await transaction.get(auctionRef);
            if (!auctionDoc.exists) {
                throw new Error("Auction does not exist!");
            }
            const auctionData = auctionDoc.data();
            // Prevent bids if auction is ended
            if (auctionData?.status === 'ended') {
                throw new Error("Auction has already ended");
            }
            // Anti-snipe: if bid is placed within last 5 minutes, extend auction by 5 mins
            const endsAt = new Date(auctionData?.endsAt);
            const bidTime = new Date(bidData.timestamp);
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
                currentBid: bidData.amount,
                bidCount: admin.firestore.FieldValue.increment(1),
                endsAt: newEndsAt,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        console.log(`Successfully processed bid for auction ${auctionId}`);
    }
    catch (error) {
        console.error(`Failed to process bid for auction ${auctionId}`, error);
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
//# sourceMappingURL=auction.js.map