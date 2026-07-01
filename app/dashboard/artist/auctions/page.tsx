'use client';

import SellerBidsClient from '@/app/(public)/bids/SellerBidsClient';

export default function ArtistAuctionsPage() {
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <p className="text-label-md text-primary uppercase tracking-wider" style={{ marginBottom: 8 }}>Auctions</p>
        <h1 className="text-headline-lg text-primary">Manage Your Auctions</h1>
        <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
          Create, monitor, and manage auctions for your listed artworks.
        </p>
      </div>
      <SellerBidsClient />
    </>
  );
}
