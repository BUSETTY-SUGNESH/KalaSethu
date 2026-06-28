import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getAuctionServer,
  getAuctionBidsServer,
  isValidAuctionId,
} from '@/lib/services/server/auction-admin.service';
import AuctionDetailsClient from './AuctionDetailsClient';
import type { Bid } from '@/app/types';

export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  if (!isValidAuctionId(id)) {
    return {
      title: 'Auction Not Found | KalaSetu',
    };
  }

  const auction = await getAuctionServer(id);

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

export default async function AuctionDetailsPage({ params }: PageProps) {
  const { id } = await params;

  if (!isValidAuctionId(id)) {
    notFound();
  }

  const auction = await getAuctionServer(id);
  let bids: Bid[] = [];

  if (auction) {
    const serverBids = await getAuctionBidsServer(id);
    bids = serverBids as unknown as Bid[];
  }

  return <AuctionDetailsClient initialAuction={auction} initialBids={bids} />;
}
