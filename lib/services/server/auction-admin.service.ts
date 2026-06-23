import { adminDb } from '@/lib/firebase/admin';
import type { Auction, AuctionBid } from '@/app/types';

/**
 * Server-only service for fetching auctions using firebase-admin.
 * Do not import this in Client Components.
 */
export async function getActiveAuctionsServer(limit: number = 10): Promise<Auction[]> {
  try {
    const snapshot = await adminDb
      .collection('auctions')
      .where('status', 'in', ['live', 'scheduled', 'ending_soon'])
      .orderBy('endsAt', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Auction;
    });
  } catch (error) {
    console.error('Error fetching active auctions server-side:', error);
    return [];
  }
}

export async function getAuctionServer(auctionId: string): Promise<Auction | null> {
  try {
    const doc = await adminDb.collection('auctions').doc(auctionId).get();
    if (!doc.exists) return null;
    
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data?.createdAt,
      updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data?.updatedAt,
    } as Auction;
  } catch (error) {
    console.error(`Error fetching auction ${auctionId} server-side:`, error);
    return null;
  }
}

export async function getAuctionBidsServer(auctionId: string): Promise<AuctionBid[]> {
  try {
    const snapshot = await adminDb
      .collection('auctions')
      .doc(auctionId)
      .collection('bids')
      .orderBy('amount', 'desc')
      .get();
      
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as AuctionBid;
    });
  } catch (error) {
    console.error(`Error fetching bids for auction ${auctionId} server-side:`, error);
    return [];
  }
}
