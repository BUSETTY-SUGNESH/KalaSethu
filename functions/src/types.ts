// Backend Types for Cloud Functions
// These are simplified versions of the frontend types, containing only what the cloud functions need.

export interface Auction {
  id: string;
  status: string;
  endsAt: string;
  currentBid: number;
  bidCount: number;
  winnerId?: string;
  winnerName?: string;
  updatedAt?: string;
  // Artwork context — stored on auction document, used for notification copy
  artworkId?: string;
  artworkTitle?: string;
  artworkImageUrl?: string;
  artistId?: string;
  artistName?: string;
  startPrice?: number;
  reservePrice?: number;
  // Outbid detection — updated on every bid placement
  lastBidderId?: string;
  lastBidderName?: string;
  // Ending-soon deduplication — array of interval keys already dispatched
  // e.g. ['24h', '1h', '15m']
  notifiedIntervals?: string[];
}

export interface Bid {
  id: string;
  amount: number;
  bidderId: string;
  bidderName: string;
  timestamp: string;
}

export interface Order {
  id: string;
  buyerId: string;
  items: Array<{ artistId: string }>;
}

export interface Artwork {
  id: string;
  status: string;
  moderationReason?: string | null;
  artistId: string;
}

export interface User {
  id: string;
  role: string;
  isVerified?: boolean;
}
