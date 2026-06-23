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
import { type DocumentSnapshot, type Unsubscribe, subcollections, addDoc } from '@/lib/firebase/firestore';
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

// --- Place Bid (client-side validation only; actual bid via Cloud Function) ---
export function validateBid(
  auction: Auction,
  bidAmount: number,
  userId: string
): string | null {
  if (auction.status !== 'live' && auction.status !== 'ending_soon') {
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
  
  if (!(result.data as any).success) {
    throw new Error('Bid placement failed on server.');
  }
}

// --- Get User Bid Analytics ---
export async function getUserBidAnalytics(): Promise<{
  totalParticipated: number;
  activeBids: number;
  wonItems: number;
  winRate: number;
}> {
  const getAnalyticsCallable = httpsCallable(functions, 'getUserBidAnalytics');
  const result = await getAnalyticsCallable();
  return result.data as {
    totalParticipated: number;
    activeBids: number;
    wonItems: number;
    winRate: number;
  };
}
