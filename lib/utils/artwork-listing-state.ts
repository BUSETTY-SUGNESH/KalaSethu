import type { Artwork, Auction } from '@/app/types';
import { isAuctionAcceptingBids } from '@/lib/utils/auction-display';

export type ArtworkListingMode =
  | 'auction_active'
  | 'auction_scheduled'
  | 'auction_ended'
  | 'marketplace'
  | 'sold'
  | 'unavailable';

const ACTIVE_AUCTION_STATUSES = new Set(['live', 'ending_soon', 'scheduled']);

export function pickPrimaryAuction(auctions: Auction[]): Auction | null {
  if (auctions.length === 0) return null;

  const active = auctions.find(
    (a) => ACTIVE_AUCTION_STATUSES.has(a.status) && a.status !== 'cancelled'
  );
  if (active) return active;

  return auctions[0];
}

export function resolveArtworkListingMode(
  artwork: Artwork,
  auction: Auction | null
): ArtworkListingMode {
  if (auction && auction.status !== 'cancelled') {
    if (isAuctionAcceptingBids(auction)) {
      return 'auction_active';
    }
    if (
      auction.status === 'scheduled' &&
      new Date(auction.startsAt).getTime() > Date.now()
    ) {
      return 'auction_scheduled';
    }
    if (
      ['ended', 'completed'].includes(auction.status) ||
      new Date(auction.endsAt).getTime() < Date.now()
    ) {
      return 'auction_ended';
    }
    if (ACTIVE_AUCTION_STATUSES.has(auction.status)) {
      return 'auction_active';
    }
  }

  if (artwork.status === 'sold') return 'sold';
  if (artwork.listingType === 'fixed_price' && artwork.status === 'published') {
    return 'marketplace';
  }
  if (artwork.listingType === 'auction') {
    return auction ? 'auction_ended' : 'unavailable';
  }

  return 'unavailable';
}

export function showsAuctionUi(mode: ArtworkListingMode): boolean {
  return (
    mode === 'auction_active' ||
    mode === 'auction_scheduled' ||
    mode === 'auction_ended'
  );
}

export function showsPurchaseUi(mode: ArtworkListingMode): boolean {
  return mode === 'marketplace';
}

/** Canonical artwork detail URL — all entry points should use this. */
export function artworkDetailPath(artworkId: string): string {
  return `/artwork/${artworkId}`;
}
