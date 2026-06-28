// ============================================================
// KalaSetu — Auction Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { auctionRepository } from '@/lib/repositories';
import type {
  Auction,
  AuctionFormData,
  AuctionStatus,
  Bid,
  PaginatedResult,
} from '@/app/types';
import { type DocumentSnapshot, type Unsubscribe } from '@/lib/firebase/firestore';
import { functions } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';

// --- Create Auction ---
export async function createAuction(
  data: AuctionFormData,
  artworkTitle: string,
  artworkImageUrl: string,
  artistId: string,
  artistName: string
): Promise<string> {
  const now = new Date().toISOString();
  const auction: Omit<Auction, 'id'> = {
    artworkId: data.artworkId,
    artworkTitle,
    artworkImageUrl,
    artistId,
    artistName,
    type: data.type,
    startPrice: data.startPrice,
    reservePrice: data.reservePrice,
    currentBid: data.startPrice,
    minIncrement: data.minIncrement,
    currency: 'INR',
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    originalEndsAt: data.endsAt,
    extensionMinutes: data.extensionMinutes,
    status: new Date(data.startsAt) <= new Date() ? 'live' : 'scheduled',
    totalBids: 0,
    uniqueBidders: 0,
    winnerId: undefined,
    winnerName: undefined,
    winningBid: undefined,
    createdAt: now,
    updatedAt: now,
  };

  return auctionRepository.create(auction);
}

// --- Get Auction ---
export async function getAuction(auctionId: string): Promise<Auction | null> {
  return auctionRepository.findById(auctionId);
}

// --- Get Multiple Auctions by IDs ---
export async function getAuctionsByIds(auctionIds: string[]): Promise<Auction[]> {
  return auctionRepository.findAuctionsByIds(auctionIds);
}

// --- Subscribe to Auction (real-time) ---
export function subscribeToAuction(
  auctionId: string,
  callback: (auction: Auction | null) => void
): Unsubscribe {
  return auctionRepository.subscribe(auctionId, callback);
}

// --- Get Active Auctions ---
export async function getActiveAuctions(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Auction>> {
  return auctionRepository.findActive(pageSize, lastDoc);
}

// --- Get Ending Soon ---
export async function getEndingSoonAuctions(count: number = 5): Promise<Auction[]> {
  return auctionRepository.findEndingSoon(count);
}

// --- Get Auction Bids ---
export async function getAuctionBids(
  auctionId: string,
  pageSize: number = 50
): Promise<Bid[]> {
  return auctionRepository.findBidsByAuction(auctionId, pageSize);
}

// --- Subscribe to Auction Bids (real-time) ---
export function subscribeToAuctionBids(
  auctionId: string,
  callback: (bids: Bid[]) => void
): Unsubscribe {
  return auctionRepository.subscribeToBids(auctionId, callback);
}

// --- Get User Bids ---
export async function getUserBids(
  userId: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Bid>> {
  return auctionRepository.findBidsByUser(userId, pageSize, lastDoc);
}

// --- Get Auctions by Artist ---
export async function getAuctionsByArtist(
  artistId: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Auction>> {
  return auctionRepository.findByArtist(artistId, pageSize, lastDoc);
}

// --- Get all auctions by artist (paginated fetch for stats) ---
export async function getAllAuctionsByArtist(
  artistId: string,
  pageSize: number = 50
): Promise<Auction[]> {
  const all: Auction[] = [];
  let lastDoc: DocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    const result = await getAuctionsByArtist(artistId, pageSize, lastDoc);
    all.push(...result.data);
    hasMore = result.hasMore;
    lastDoc = result.lastDoc ?? null;
    if (!result.data.length) break;
  }

  return all;
}

// --- Seller auction stats (computed client-side from fetched auctions) ---
export function computeSellerAuctionStats(auctions: Auction[]) {
  const active = auctions.filter((a) =>
    ['live', 'ending_soon', 'scheduled'].includes(a.status)
  );
  const ended = auctions.filter((a) => ['ended', 'completed'].includes(a.status));
  const withWinner = ended.filter((a) => a.winnerId);
  const finalBids = withWinner.map((a) => a.winningBid ?? a.currentBid);

  return {
    activeCount: active.length,
    totalBids: auctions.reduce((s, a) => s + a.totalBids, 0),
    wonCount: withWinner.length,
    revenue: withWinner.reduce((s, a) => s + (a.winningBid ?? a.currentBid), 0),
    completedCount: ended.length,
    avgFinalBid:
      finalBids.length > 0
        ? Math.round(finalBids.reduce((s, v) => s + v, 0) / finalBids.length)
        : 0,
    highestSale: finalBids.length > 0 ? Math.max(...finalBids) : 0,
  };
}

// --- Cancel Auction (via Cloud Function) ---
export async function cancelAuction(auctionId: string): Promise<void> {
  const cancelCallable = httpsCallable(functions, 'cancelAuction');
  const result = await cancelCallable({ auctionId });
  if (!(result.data as { success?: boolean }).success) {
    throw new Error('Failed to cancel auction.');
  }
}

// --- Update Auction (via Cloud Function) ---
export async function updateAuction(
  auctionId: string,
  data: Partial<AuctionFormData>
): Promise<void> {
  const updateCallable = httpsCallable(functions, 'updateAuction');
  const result = await updateCallable({ auctionId, ...data });
  if (!(result.data as { success?: boolean }).success) {
    throw new Error('Failed to update auction.');
  }
}

// --- Place Bid (client-side validation only; actual bid via Cloud Function) ---

/** True when bids are allowed: live/ending_soon, or scheduled with startsAt in the past. */
export function isAuctionAcceptingBids(
  auction: Pick<Auction, 'status' | 'startsAt' | 'endsAt'>
): boolean {
  if (['ended', 'cancelled', 'completed'].includes(auction.status)) {
    return false;
  }
  if (new Date(auction.endsAt).getTime() < Date.now()) {
    return false;
  }
  if (auction.status === 'live' || auction.status === 'ending_soon') {
    return true;
  }
  if (auction.status === 'scheduled') {
    return new Date(auction.startsAt).getTime() <= Date.now();
  }
  return false;
}

export function validateBid(
  auction: Auction,
  bidAmount: number,
  userId: string
): string | null {
  if (!isAuctionAcceptingBids(auction)) {
    if (
      auction.status === 'scheduled' &&
      new Date(auction.startsAt).getTime() > Date.now()
    ) {
      return 'This auction has not started yet.';
    }
    return 'This auction is not currently accepting bids.';
  }
  if (new Date(auction.endsAt) < new Date()) {
    return 'This auction has ended.';
  }
  if (auction.artistId === userId) {
    return 'You cannot bid on your own auction.';
  }
  if (bidAmount < auction.currentBid + auction.minIncrement) {
    return `Minimum bid is ₹${(auction.currentBid + auction.minIncrement).toLocaleString('en-IN')}`;
  }
  return null;
}

// --- Update Auction Status ---
export async function updateAuctionStatus(
  auctionId: string,
  status: AuctionStatus
): Promise<void> {
  return auctionRepository.setStatus(auctionId, status);
}

// --- Place Bid ---
export async function placeBid(data: {
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
}): Promise<void> {
  const placeBidCallable = httpsCallable(functions, 'placeBid');
  const result = await placeBidCallable({
    auctionId: data.auctionId,
    bidderName: data.bidderName,
    amount: data.amount
  });

  const payload = result.data as { success?: boolean; message?: string };
  if (!payload.success) {
    throw new Error(payload.message || 'Bid placement failed on server.');
  }

  notifyBidChanged();
}

export const BID_CHANGED_EVENT = 'kalasethu:bid-changed';

export function notifyBidChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BID_CHANGED_EVENT));
  }
}

export type BidAnalytics = {
  totalParticipated: number;
  activeBids: number;
  wonItems: number;
  winRate: number;
  activeBidExposure: number;
};

export function normalizeBidAnalytics(data: Partial<BidAnalytics> | null | undefined): BidAnalytics {
  return {
    totalParticipated: typeof data?.totalParticipated === 'number' ? data.totalParticipated : 0,
    activeBids: typeof data?.activeBids === 'number' ? data.activeBids : 0,
    wonItems: typeof data?.wonItems === 'number' ? data.wonItems : 0,
    winRate: typeof data?.winRate === 'number' ? data.winRate : 0,
    activeBidExposure:
      typeof data?.activeBidExposure === 'number' && Number.isFinite(data.activeBidExposure)
        ? data.activeBidExposure
        : 0,
  };
}

export const EMPTY_BID_ANALYTICS = {
  totalParticipated: 0,
  activeBids: 0,
  wonItems: 0,
  winRate: 0,
  activeBidExposure: 0,
} as const;

// --- Get User Bid Analytics ---
export async function getUserBidAnalytics(): Promise<BidAnalytics> {
  const getAnalyticsCallable = httpsCallable(functions, 'getUserBidAnalytics');
  const result = await getAnalyticsCallable();
  return normalizeBidAnalytics(result.data as Partial<BidAnalytics>);
}
