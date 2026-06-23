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
  onSnapshot,
  paginatedQuery,
  type DocumentSnapshot,
  type Unsubscribe,
} from '@/lib/firebase/firestore';
import type { Auction, AuctionStatus, Bid, PaginatedResult } from '@/app/types';

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
    if (ids.length === 0) return [];
    
    // Firestore 'in' queries are limited to 30 items. Chunking.
    const chunkSize = 30;
    const allAuctions: Auction[] = [];
    
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
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

  async findByArtist(
    artistId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Auction>> {
    return paginatedQuery<Auction>(
      collections.auctions(),
      [where('artistId', '==', artistId), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  // ── Bids ─────────────────────────────────────────────────────

  async findBidsByAuction(auctionId: string, max: number = 50): Promise<Bid[]> {
    const q = query(
      subcollections.auctionBids(auctionId),
      orderBy('amount', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Bid);
  },

  subscribeToBids(auctionId: string, cb: (bids: Bid[]) => void): Unsubscribe {
    const q = query(
      subcollections.auctionBids(auctionId),
      orderBy('amount', 'desc'),
      limit(20)
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
    return paginatedQuery<Bid>(
      collectionGroup(db, 'bids') as any,
      [where('bidderId', '==', userId), orderBy('timestamp', 'desc')],
      pageSize,
      lastDoc
    );
  },
};
