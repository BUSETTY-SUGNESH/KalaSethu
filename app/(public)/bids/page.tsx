import { Metadata } from 'next';
import { getActiveAuctionsServer } from '@/lib/services/server/auction-admin.service';
import BidsClient from './BidsClient';

export const metadata: Metadata = {
  title: 'Live Auctions | KalaSetu',
  description: 'Participate in real-time auctions for exclusive, authenticated masterworks.',
};

// Revalidate this page every 60 seconds (or 0 for entirely dynamic)
export const revalidate = 0; 

export default async function BidsPage() {
  const auctions = await getActiveAuctionsServer(10);

  return <BidsClient initialAuctions={auctions} />;
}
