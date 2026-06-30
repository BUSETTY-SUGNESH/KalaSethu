"use client";

import ArtworkCard from "@/app/components/cards/ArtworkCard";
import type { Artwork } from "@/app/types";
import { ARTWORK_PLACEHOLDER } from "@/lib/constants/placeholders";

export function ArtworkCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="home-artwork-grid" aria-busy="true" aria-label="Loading artworks">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="home-artwork-skeleton">
          <div className="skeleton" style={{ width: "100%", aspectRatio: "4/5", borderRadius: "var(--radius-md)" }} />
          <div className="skeleton" style={{ width: "70%", height: 20, marginTop: 16 }} />
          <div className="skeleton" style={{ width: "45%", height: 14, marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

export default function ArtworkCardGrid({
  artworks,
  ctaLabel,
}: {
  artworks: Artwork[];
  ctaLabel?: string;
}) {
  return (
    <div className="home-artwork-grid">
      {artworks.map((item) => (
        <ArtworkCard
          key={item.id}
          id={item.id}
          title={item.title}
          artist={item.artistName}
          price={`₹${item.price.toLocaleString("en-IN")}`}
          imageUrl={item.thumbnailUrl || item.images[0]?.url || ARTWORK_PLACEHOLDER}
          listingType={item.listingType}
          ctaLabel={ctaLabel}
        />
      ))}
    </div>
  );
}

export function SoldArtworkCardGrid({ artworks }: { artworks: Artwork[] }) {
  return (
    <div className="home-artwork-grid">
      {artworks.map((item) => (
        <ArtworkCard
          key={item.id}
          id={item.id}
          title={item.title}
          artist={item.artistName}
          price={`₹${item.price.toLocaleString("en-IN")}`}
          imageUrl={item.thumbnailUrl || item.images[0]?.url || ARTWORK_PLACEHOLDER}
          listingType={item.listingType}
          ctaLabel="View Sale"
        />
      ))}
    </div>
  );
}
