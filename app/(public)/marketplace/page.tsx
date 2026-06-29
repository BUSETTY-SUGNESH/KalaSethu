import { getPublishedArtworksServer, getMarketplaceCategorySummariesServer } from "@/lib/services/server/artwork-admin.service";
import MarketplaceClient from "./MarketplaceClient";
import type { Artwork, MarketplaceCategorySummary } from "@/app/types";
import type { ArtworkPaginationCursor } from "@/lib/firebase/firestore";
import { ARTWORK_CATEGORIES, CATEGORY_PLACEHOLDER_IMAGE } from "@/lib/constants/artwork-categories";
import { Suspense } from "react";

export const metadata = {
  title: "KalaMarket | Authentic Indian Art",
  description: "Invest in authentic Indian heritage. Discover curated collections and new arrivals with verified provenance.",
};

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  let data: Artwork[] = [];
  let hasMore = false;
  let lastCursor: ArtworkPaginationCursor = null;
  let initialError: string | null = null;
  let categories: MarketplaceCategorySummary[] = ARTWORK_CATEGORIES.map(({ slug, label }) => ({
    slug,
    label,
    artworkCount: 0,
    imageUrl: CATEGORY_PLACEHOLDER_IMAGE,
  }));

  try {
    const [artworkResult, categorySummaries] = await Promise.all([
      getPublishedArtworksServer(12),
      getMarketplaceCategorySummariesServer(),
    ]);
    data = artworkResult.data;
    hasMore = artworkResult.hasMore;
    lastCursor = artworkResult.lastCursor;
    categories = categorySummaries;
  } catch (error) {
    console.error("Server fetch failed:", error);
    initialError = "Unable to load artworks at this time. Please check your connection or try again later.";
  }

  return (
    <Suspense fallback={null}>
      <MarketplaceClient 
        initialArtworks={data} 
        initialHasMore={hasMore} 
        initialCursor={lastCursor} 
        initialError={initialError}
        initialCategories={categories}
      />
    </Suspense>
  );
}
