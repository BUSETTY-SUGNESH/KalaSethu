import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

import { db } from './config';
import { auctionRepository } from './repositories/auction.repository';

// This runs automatically when a new bid is created in the subcollection
export const onBidPlaced = functions.firestore
  .document('auctions/{auctionId}/bids/{bidId}')
  .onCreate(async (snap, context) => {
    const bidData = snap.data();
    const auctionId = context.params.auctionId;
    
    const auctionRef = db.collection("auctions").doc(auctionId);
    
    try {
      await db.runTransaction(async (transaction) => {
        const auctionDoc = await transaction.get(auctionRef);
        
        if (!auctionDoc.exists) {
          throw new Error("Auction does not exist!");
        }
        
        const auctionData = auctionDoc.data() as any;
        
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
    } catch (error) {
      console.error(`Failed to process bid for auction ${auctionId}`, error);
    }
  });

// A scheduled function that checks for ended auctions (Runs every minute)
export const closeEndedAuctions = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const now = new Date().toISOString();
  
  try {
    // Find all active auctions where endsAt has passed
    const snapshotDocs = await auctionRepository.getActiveEndedAuctions(now);
      
    if (snapshotDocs.length === 0) {
      return null;
    }
    
    console.log(`Found ${snapshotDocs.length} auctions to close`);
    
    const batch = db.batch();
    
    for (const doc of snapshotDocs) {

      
      // Determine winner
      // We need the highest bid. The auction doc has currentBid, but to get the winner we should query the latest bid.
      const winningBid = await auctionRepository.getLatestBid(doc.id);
        
      let winnerId: string | null = null;
      let winnerName: string | null = null;
      
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
    
  } catch (error) {
    console.error("Error closing auctions", error);
  }
  
  return null;
});
