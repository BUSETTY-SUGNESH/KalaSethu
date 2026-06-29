"use client";

import Image from "next/image";
import type { MarketplaceCategorySummary } from "@/app/types";

interface CategoryCollectionCardProps {
  category: MarketplaceCategorySummary;
  onSelect: (slug: string) => void;
}

export default function CategoryCollectionCard({
  category,
  onSelect,
}: CategoryCollectionCardProps) {
  const { slug, label, artworkCount, imageUrl } = category;
  const isEmpty = artworkCount === 0;

  return (
    <button
      type="button"
      className={`category-item text-left${isEmpty ? " category-item-empty" : ""}`}
      style={{ position: "relative" }}
      onClick={() => onSelect(slug)}
      aria-label={`Filter by ${label}${isEmpty ? " (no artworks yet)" : `, ${artworkCount} artworks`}`}
    >
      <Image
        src={imageUrl}
        alt={label}
        fill
        sizes="(max-width: 768px) 50vw, 33vw"
        className={isEmpty ? "category-item-img-dim" : undefined}
      />
      <div className="category-overlay">
        <div>
          <h3 className="text-title-md text-on-primary">{label}</h3>
          <p className="category-count text-body-sm text-on-primary">
            {isEmpty ? "No artworks yet" : `${artworkCount} artwork${artworkCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>
    </button>
  );
}
