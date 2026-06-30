import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArtworkDetailsClient from './ArtworkDetailsClient';
import {
  getArtworkServer,
  isValidArtworkId,
} from '@/lib/services/server/artwork-admin.service';
import {
  getAuctionBidsServer,
  getAuctionForArtworkServer,
} from '@/lib/services/server/auction-admin.service';
import { isPubliclyVisible } from '@/lib/utils/artwork-visibility';
import { resolveArtworkListingMode, showsAuctionUi } from '@/lib/utils/artwork-listing-state';

export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidArtworkId(id)) {
    return { title: 'Artwork Not Found | KalaSetu' };
  }

  const artwork = await getArtworkServer(id);
  if (!artwork || !isPubliclyVisible(artwork)) {
    return { title: 'Artwork Not Found | KalaSetu' };
  }

  const auction = await getAuctionForArtworkServer(id);
  const mode = resolveArtworkListingMode(artwork, auction);

  if (showsAuctionUi(mode) && auction) {
    return {
      title: `${artwork.title} by ${artwork.artistName} | KalaSetu`,
      description: `Bid on ${artwork.title}. Current bid: ₹${auction.currentBid.toLocaleString('en-IN')}.`,
    };
  }

  return {
    title: `${artwork.title} by ${artwork.artistName} | KalaSetu`,
    description: artwork.description?.slice(0, 160) || `View ${artwork.title} on KalaSetu.`,
  };
}

export default async function ArtworkPage({ params }: PageProps) {
  const { id } = await params;

  if (!isValidArtworkId(id)) {
    notFound();
  }

  const artwork = await getArtworkServer(id);
  const auction = artwork ? await getAuctionForArtworkServer(id) : null;
  const bids = auction ? await getAuctionBidsServer(auction.id) : [];

  return (
    <ArtworkDetailsClient
      artworkId={id}
      initialArtwork={artwork}
      initialAuction={auction}
      initialBids={bids}
    />
  );
}
