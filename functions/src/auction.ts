import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

import { db } from './config';
import { auctionRepository } from './repositories/auction.repository';
import {
  notifyOutbid,
  batchNotifyAuctionWon,
  batchNotifyAuctionLost,
  batchNotifyArtistAuctionClosed,
  batchNotifyAuctionEndingSoon,
  getUniqueBidderIds,
} from './notification-helpers';

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
export const placeBid = functions.region('asia-south1').https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to place a bid.'
    );
  }

  const { auctionId, amount, bidderName } = data;

  if (!auctionId || typeof amount !== 'number') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with an auctionId and a valid amount.'
    );
  }

  const bidderId = context.auth.uid;
  const auctionRef = db.collection("auctions").doc(auctionId);
  const bidsRef = auctionRef.collection("bids");

  // Capture the previous highest bidder before the transaction mutates the doc
  let previousBidderId: string | null = null;
  let capturedAuctionData: admin.firestore.DocumentData | null = null;

  try {
    const result = await db.runTransaction(async (transaction) => {
      const auctionDoc = await transaction.get(auctionRef);
      
      if (!auctionDoc.exists) {
        throw new functions.https.HttpsError('not-found', "Auction does not exist!");
      }
      
      const auctionData = auctionDoc.data() as admin.firestore.DocumentData;

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
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Bid amount must be at least ₹${(auctionData.currentBid + auctionData.minIncrement).toLocaleString('en-IN')}`
        );
      }

      // ── Capture previous bidder for outbid notification ────
      // lastBidderId is the previous highest bidder stored from
      // the last bid placement. Only trigger outbid if the new
      // bidder is different from the previous one.
      const prevBidderId = auctionData.lastBidderId as string | undefined;
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
      const d = capturedAuctionData as Record<string, any>;
      const auctionForNotif = {
        id: auctionId,
        artworkTitle: d['artworkTitle'] as string | undefined,
        artworkImageUrl: d['artworkImageUrl'] as string | undefined,
        artworkId: d['artworkId'] as string | undefined,
        artistId: d['artistId'] as string | undefined,
        artistName: d['artistName'] as string | undefined,
        currentBid: (d['currentBid'] as number) ?? 0,
        status: d['status'] as string,
        endsAt: d['endsAt'] as string,
        bidCount: (d['totalBids'] as number) ?? 0,
      };

      // Fire-and-forget — intentionally not awaited
      notifyOutbid(previousBidderId, auctionForNotif, amount).catch((err) =>
        console.error('[placeBid] notifyOutbid failed (non-critical):', err)
      );
    }

    return result;

  } catch (error: any) {
    console.error(`Failed to process bid for auction ${auctionId}`, error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Unable to place bid at this time. Please try again.');
  }
});

// ─────────────────────────────────────────────────────────────
// closeEndedAuctions — Scheduled (every 1 minute)
// ─────────────────────────────────────────────────────────────
// Changes for Issue 2.3:
//   - For each closed auction, resolves all unique bidders
//   - Batch-writes win / loss / artist notifications in the
//     SAME batch as the auction status update
//   - Duplicate prevention: once status becomes 'ended' the
//     query filter (status == 'active') never re-selects it
// ─────────────────────────────────────────────────────────────
export const closeEndedAuctions = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const now = new Date().toISOString();
  
  try {
    const snapshotDocs = await auctionRepository.getActiveEndedAuctions(now);
      
    if (snapshotDocs.length === 0) {
      return null;
    }
    
    console.log(`Found ${snapshotDocs.length} auctions to close`);
    
    const batch = db.batch();
    
    for (const doc of snapshotDocs) {
      const auctionData = doc.data() as admin.firestore.DocumentData;

      // ── Determine winner ───────────────────────────────────
      const winningBid = await auctionRepository.getLatestBid(doc.id);
        
      let winnerId: string | null = null;
      let winnerName: string | null = null;
      let winningAmount = auctionData.currentBid ?? 0;
      
      if (winningBid) {
        winnerId = winningBid.bidderId;
        winnerName = winningBid.bidderName;
        winningAmount = winningBid.amount;
      }

      // ── Mark auction as ended ──────────────────────────────
      batch.update(doc.ref, {
        status: "ended",
        winnerId,
        winnerName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // ── Build notification payloads ────────────────────────
      // Reconstruct an Auction-shaped object from the raw doc
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

      // Notify winner
      if (winnerId) {
        batchNotifyAuctionWon(batch, winnerId, auction, winningAmount);
      }

      // Notify all other bidders (losers)
      // One getDocs per auction — acceptable: fires once per auction lifetime
      try {
        const allBidderIds = await getUniqueBidderIds(doc.id);
        for (const bidderId of allBidderIds) {
          if (bidderId !== winnerId) {
            batchNotifyAuctionLost(batch, bidderId, auction);
          }
        }
      } catch (bidderErr) {
        console.error(`[closeEndedAuctions] Failed to fetch bidders for auction ${doc.id}:`, bidderErr);
        // Continue with other notifications — non-critical
      }

      // Notify artist
      const artistId = auctionData.artistId as string | undefined;
      if (artistId) {
        batchNotifyArtistAuctionClosed(
          batch,
          artistId,
          auction,
          winnerId,
          winnerName,
          winningAmount
        );
      }
    }
    
    await batch.commit();
    console.log(`Successfully closed ${snapshotDocs.length} auctions with notifications`);
    
  } catch (error) {
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
const ENDING_SOON_WINDOWS: [string, string, number, number][] = [
  // key    label         min window   max window (look-ahead)
  ['15m',  '15 minutes',  0,           15  * 60 * 1000],
  ['1h',   '1 hour',      15 * 60 * 1000, 60  * 60 * 1000],
  ['24h',  '24 hours',    60 * 60 * 1000, 24  * 60 * 60 * 1000],
];

export const auctionEndingSoon = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = Date.now();

    try {
      // Fetch all currently live/ending_soon auctions
      // (same index used by getActiveAuctionsServer — no new index)
      const snap = await db
        .collection('auctions')
        .where('status', 'in', ['live', 'ending_soon'])
        .get();

      if (snap.empty) return null;

      const batch = db.batch();
      let notifCount = 0;

      for (const doc of snap.docs) {
        const auctionData = doc.data();
        const endsAt = new Date(auctionData.endsAt).getTime();
        const timeRemainingMs = endsAt - now;

        // Skip auctions that have already ended or start in the future
        if (timeRemainingMs <= 0) continue;

        const notifiedIntervals: string[] = auctionData.notifiedIntervals ?? [];

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

        const intervalsToFire: [string, string][] = []; // [key, label]

        for (const [key, label, minWindow, maxWindow] of ENDING_SOON_WINDOWS) {
          if (
            timeRemainingMs > minWindow &&
            timeRemainingMs <= maxWindow &&
            !notifiedIntervals.includes(key)
          ) {
            intervalsToFire.push([key, label]);
          }
        }

        if (intervalsToFire.length === 0) continue;

        // Fetch participants once per auction (only if there are intervals to fire)
        let bidderIds: string[] = [];
        try {
          bidderIds = await getUniqueBidderIds(doc.id);
        } catch (err) {
          console.error(`[auctionEndingSoon] Failed to fetch bidders for ${doc.id}:`, err);
          continue;
        }

        if (bidderIds.length === 0) continue;

        for (const [key, label] of intervalsToFire) {
          batchNotifyAuctionEndingSoon(batch, bidderIds, auction, label);
          notifCount += bidderIds.length;

          // Mark this interval as dispatched — prevents re-sending on next run
          batch.update(doc.ref, {
            notifiedIntervals: admin.firestore.FieldValue.arrayUnion(key),
          });
        }
      }

      if (notifCount > 0) {
        await batch.commit();
        console.log(`[auctionEndingSoon] Dispatched ${notifCount} ending-soon notifications`);
      }

    } catch (error) {
      console.error('[auctionEndingSoon] Error:', error);
    }

    return null;
  });

// ─────────────────────────────────────────────────────────────
// getUserBidAnalytics — Callable (unchanged)
// ─────────────────────────────────────────────────────────────
export const getUserBidAnalytics = functions.region('asia-south1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;

  try {
    const bidsSnapshot = await db.collectionGroup('bids').where('bidderId', '==', userId).get();
    
    const auctionIds = new Set<string>();
    bidsSnapshot.docs.forEach(doc => {
      const auctionId = doc.ref.parent.parent?.id;
      if (auctionId) auctionIds.add(auctionId);
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
    const auctionDocs: admin.firestore.DocumentData[] = [];
    
    for (let i = 0; i < uniqueAuctionIds.length; i += chunkSize) {
      const chunk = uniqueAuctionIds.slice(i, i + chunkSize);
      const snapshot = await db.collection('auctions').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
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
      } else {
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
  } catch (error) {
    console.error("Error calculating bid analytics:", error);
    throw new functions.https.HttpsError('internal', 'Unable to calculate analytics.');
  }
});
