import { getPublishedArtworksServer } from "@/lib/services/server/artwork-admin.service";
import MarketplaceClient from "./MarketplaceClient";

export const metadata = {
  title: "KalaMarket | Authentic Indian Art",
  description: "Invest in authentic Indian heritage. Discover curated collections and new arrivals with verified provenance.",
};

export const dynamic = "force-dynamic"; // Optional, but usually needed if you want fresh results. Or you can revalidate.

import type { Artwork } from "@/app/types";

export default async function MarketplacePage() {
  let data: Artwork[] = [];
  let hasMore = false;
  let lastCursor: unknown = null;
  let initialError: string | null = null;

  try {
    // Fetch initial data on the server
    const result = await getPublishedArtworksServer(12);
    data = result.data;
    hasMore = result.hasMore;
    lastCursor = result.lastCursor;
  } catch (error) {
    console.error("Server fetch failed:", error);
    initialError = "Unable to load artworks at this time. Please check your connection or try again later.";
  }

  return (
    <MarketplaceClient 
      initialArtworks={data} 
      initialHasMore={hasMore} 
      initialCursor={lastCursor} 
      initialError={initialError}
    />
  );
}
