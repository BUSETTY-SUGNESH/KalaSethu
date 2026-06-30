import { adminDb } from '@/lib/firebase/admin';
import type { Auction, Bid } from '@/app/types';
import { AUCTION_BID_HISTORY_LIMIT } from '@/lib/constants/auction';
import { pickPrimaryAuction } from '@/lib/utils/artwork-listing-state';

/** Firestore document IDs must be non-empty strings without slashes. */
export function isValidAuctionId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0 && !id.includes('/');
}

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
  if (!isValidAuctionId(auctionId)) {
    return null;
  }

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

export async function getAuctionBidsServer(auctionId: string): Promise<Bid[]> {
  if (!isValidAuctionId(auctionId)) {
    return [];
  }

  try {
    const snapshot = await adminDb
      .collection('auctions')
      .doc(auctionId)
      .collection('bids')
      .orderBy('amount', 'desc')
      .limit(AUCTION_BID_HISTORY_LIMIT)
      .get();
      
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        auctionId,
        ...data,
      } as Bid;
    });
  } catch (error) {
    console.error(`Error fetching bids for auction ${auctionId} server-side:`, error);
    return [];
  }
}

export async function getAuctionForArtworkServer(artworkId: string): Promise<Auction | null> {
  if (typeof artworkId !== 'string' || !artworkId.trim()) return null;

  try {
    const snapshot = await adminDb
      .collection('auctions')
      .where('artworkId', '==', artworkId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const auctions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Auction;
    });

    return pickPrimaryAuction(auctions);
  } catch (error) {
    console.error(`Error fetching auction for artwork ${artworkId} server-side:`, error);
    return null;
  }
}
