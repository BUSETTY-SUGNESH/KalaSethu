import { redirect, notFound } from 'next/navigation';
import {
  getAuctionServer,
  isValidAuctionId,
} from '@/lib/services/server/auction-admin.service';
import { artworkDetailPath } from '@/lib/utils/artwork-listing-state';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy auction URLs redirect to the canonical artwork detail page. */
export default async function AuctionRedirectPage({ params }: PageProps) {
  const { id } = await params;

  if (!isValidAuctionId(id)) {
    notFound();
  }

  const auction = await getAuctionServer(id);
  if (!auction?.artworkId) {
    notFound();
  }

  redirect(artworkDetailPath(auction.artworkId));
}
