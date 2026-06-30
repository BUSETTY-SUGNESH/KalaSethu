'use client';

import Button from '@/app/components/ui/Button';
import type { Artwork } from '@/app/types';
import type { ArtworkListingMode } from '@/lib/utils/artwork-listing-state';

interface FixedPriceActionsProps {
  artwork: Artwork;
  mode: ArtworkListingMode;
  onAddToCart: () => void;
}

export default function FixedPriceActions({
  artwork,
  mode,
  onAddToCart,
}: FixedPriceActionsProps) {
  const canPurchase = mode === 'marketplace';

  return (
    <>
      <div
        className="flex items-center gap-16"
        style={{ paddingBottom: 32, borderBottom: '1px solid rgba(196, 199, 199, 0.2)' }}
      >
        <span className="text-price-lg text-primary">
          ₹{artwork.price.toLocaleString('en-IN')}
        </span>
        <span className="text-body-md text-on-surface-variant">Taxes included</span>
      </div>

      <div className="flex flex-col gap-16">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onAddToCart}
          disabled={!canPurchase}
        >
          {canPurchase
            ? 'Add to Cart'
            : mode === 'sold'
              ? 'Sold'
              : `Currently ${artwork.status.replace('_', ' ')}`}
        </Button>
        <Button variant="outline" size="lg" fullWidth disabled={!canPurchase}>
          Make an Offer
        </Button>
      </div>
    </>
  );
}
