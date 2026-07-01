// ============================================================
// KalaSetu — Auction Repository (Firestore Implementation)
// ============================================================
import {
  collections,
  subcollections,
  db,
  collectionGroup,
  docRef,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  paginatedQuery,
  type DocumentSnapshot,
  type Unsubscribe,
} from '@/lib/firebase/firestore';
import { emptyPaginatedResult, filterValidIds, isValidQueryString } from '@/lib/firebase/query-guards';
import type { Auction, AuctionStatus, Bid, PaginatedResult } from '@/app/types';
import { AUCTION_BID_HISTORY_LIMIT } from '@/lib/constants/auction';

function extractAuctionIdFromPath(path: string): string | undefined {
  const parts = path.split('/');
  const auctionsIndex = parts.indexOf('auctions');
  if (auctionsIndex >= 0 && parts[auctionsIndex + 1]) {
    const auctionId = parts[auctionsIndex + 1];
    if (auctionId && !auctionId.includes('/')) {
      return auctionId;
    }
  }
  return undefined;
}

function mapBidDoc(doc: { id: string; ref: { path: string }; data: () => Record<string, unknown> }): Bid {
  const data = doc.data();
  const auctionId =
    (typeof data.auctionId === 'string' && data.auctionId) ||
    extractAuctionIdFromPath(doc.ref.path) ||
    '';
  return { id: doc.id, ...data, auctionId } as Bid;
}

export const auctionRepository = {
  async findById(id: string): Promise<Auction | null> {
    const snap = await getDoc(docRef.auction(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Auction;
  },

  async create(data: Omit<Auction, 'id'>): Promise<string> {
    const ref = await addDoc(collections.auctions(), data);
    return ref.id;
  },

  async update(id: string, data: Partial<Auction>): Promise<void> {
    await updateDoc(docRef.auction(id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async setStatus(id: string, status: AuctionStatus): Promise<void> {
    await updateDoc(docRef.auction(id), {
      status,
      updatedAt: new Date().toISOString(),
    });
  },

  subscribe(id: string, cb: (auction: Auction | null) => void): Unsubscribe {
    return onSnapshot(docRef.auction(id), snap => {
      cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Auction) : null);
    });
  },

  async findAuctionsByIds(ids: string[]): Promise<Auction[]> {
    const validIds = filterValidIds(ids);
    if (validIds.length === 0) return [];
    
    // Firestore 'in' queries are limited to 30 items. Chunking.
    const chunkSize = 30;
    const allAuctions: Auction[] = [];
    
    for (let i = 0; i < validIds.length; i += chunkSize) {
      const chunk = validIds.slice(i, i + chunkSize);
      const q = query(
        collections.auctions(),
        where('__name__', 'in', chunk)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Auction);
      allAuctions.push(...docs);
    }
    
    return allAuctions;
  },

  async findActive(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Auction>> {
    return paginatedQuery<Auction>(
      collections.auctions(),
      [where('status', 'in', ['live', 'ending_soon']), orderBy('endsAt', 'asc')],
      pageSize,
      lastDoc
    );
  },

  async findEndingSoon(count: number = 5): Promise<Auction[]> {
    const q = query(
      collections.auctions(),
      where('status', 'in', ['live', 'ending_soon']),
      orderBy('endsAt', 'asc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Auction);
  },

  async findByArtworkId(artworkId: string): Promise<Auction[]> {
    if (!isValidQueryString(artworkId)) return [];
    const q = query(
      collections.auctions(),
      where('artworkId', '==', artworkId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Auction);
  },

  async findByArtist(
    artistId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Auction>> {
    if (!isValidQueryString(artistId)) return emptyPaginatedResult<Auction>();
    return paginatedQuery<Auction>(
      collections.auctions(),
      [where('artistId', '==', artistId), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  // ── Bids ─────────────────────────────────────────────────────

  async findBidsByAuction(
    auctionId: string,
    max: number = AUCTION_BID_HISTORY_LIMIT
  ): Promise<Bid[]> {
    if (!isValidQueryString(auctionId)) return [];
    const q = query(
      subcollections.auctionBids(auctionId),
      orderBy('amount', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Bid);
  },

  subscribeToBids(auctionId: string, cb: (bids: Bid[]) => void): Unsubscribe {
    if (!isValidQueryString(auctionId)) {
      cb([]);
      return () => {};
    }
    const q = query(
      subcollections.auctionBids(auctionId),
      orderBy('amount', 'desc'),
      limit(AUCTION_BID_HISTORY_LIMIT)
    );
    return onSnapshot(q, snap => {
      cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Bid));
    });
  },

  async findBidsByUser(
    userId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Bid>> {
    if (!isValidQueryString(userId)) return emptyPaginatedResult<Bid>();
    const baseConstraints = [
      where('bidderId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(pageSize + 1),
    ];

    const q = lastDoc
      ? query(collectionGroup(db, 'bids'), ...baseConstraints, startAfter(lastDoc))
      : query(collectionGroup(db, 'bids'), ...baseConstraints);

    const snapshot = await getDocs(q);

    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    return {
      data: docs.map((d) => mapBidDoc(d)),
      lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
      hasMore,
    };
  },
};
