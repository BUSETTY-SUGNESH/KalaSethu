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
}
