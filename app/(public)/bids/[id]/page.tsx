import { Metadata } from 'next';
import { getAuctionServer, getAuctionBidsServer } from '@/lib/services/server/auction-admin.service';
import AuctionDetailsClient from './AuctionDetailsClient';
import type { Bid } from '@/app/types';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const auction = await getAuctionServer(params.id);
  
  if (!auction) {
    return {
      title: 'Auction Not Found | KalaSetu',
    };
  }

  return {
    title: `${auction.artworkTitle} by ${auction.artistName} | KalaSetu Auctions`,
    description: `Bid on ${auction.artworkTitle}. Current bid: ₹${auction.currentBid.toLocaleString('en-IN')}. Ends at ${new Date(auction.endsAt).toLocaleDateString()}.`,
  };
}

export default async function AuctionDetailsPage({ params }: { params: { id: string } }) {
  const auction = await getAuctionServer(params.id);
  let bids: Bid[] = [];
  
  if (auction) {
    // Type casting to ensure it matches the Client component expectations
    const serverBids = await getAuctionBidsServer(params.id);
    bids = serverBids as unknown as Bid[];
  }

  return <AuctionDetailsClient initialAuction={auction} initialBids={bids} />;
}
