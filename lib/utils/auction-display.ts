import type { Auction, AuctionStatus } from '@/app/types';
import { formatDistanceToNow } from 'date-fns';

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

export function getAuctionStatusBadge(auction: Auction) {
  const isEnded =
    auction.status === 'ended' ||
    auction.status === 'completed' ||
    auction.status === 'cancelled' ||
    new Date(auction.endsAt).getTime() < Date.now();

  if (isEnded) {
    return { label: 'Ended', dotClass: 'active' as const };
  }

  const statusMap: Record<AuctionStatus, { label: string; dotClass: 'pulse' | 'active' }> = {
    ending_soon: { label: 'Ending Soon', dotClass: 'pulse' },
    scheduled: { label: 'Scheduled', dotClass: 'active' },
    live: { label: 'Live', dotClass: 'pulse' },
    ended: { label: 'Ended', dotClass: 'active' },
    cancelled: { label: 'Cancelled', dotClass: 'active' },
    completed: { label: 'Completed', dotClass: 'active' },
  };

  return statusMap[auction.status] ?? { label: 'Live', dotClass: 'pulse' as const };
}

export function formatAuctionTime(auction: Auction): string {
  if (new Date(auction.endsAt).getTime() < Date.now()) {
    return 'Ended';
  }
  return formatDistanceToNow(new Date(auction.endsAt), { addSuffix: true });
}
