import { db } from '../config';
import * as admin from 'firebase-admin';
import type { Auction, Bid } from '../types';


export const auctionRepository = {
  async getAuction(auctionId: string): Promise<Auction | null> {
    const snap = await db.collection('auctions').doc(auctionId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Auction;
  },

  async updateAuction(auctionId: string, data: Partial<Auction>): Promise<void> {
    await db.collection('auctions').doc(auctionId).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  async getLatestBid(auctionId: string): Promise<Bid | null> {
    const snap = await db.collection(`auctions/${auctionId}/bids`)
      .orderBy('amount', 'desc')
      .limit(1)
      .get();
    
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Bid;
  },

  async getActiveEndedAuctions(now: string) {
    const snap = await db.collection('auctions')
      .where('status', 'in', ['live', 'ending_soon'])
      .where('endsAt', '<=', now)
      .get();
    return snap.docs;
  },

  async getScheduledAuctionsReadyToStart(now: string) {
    const snap = await db.collection('auctions')
      .where('status', '==', 'scheduled')
      .where('startsAt', '<=', now)
      .get();
    return snap.docs;
  }
};
