"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ArtworkCard from "@/app/components/cards/ArtworkCard";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import { getArtwork } from "@/lib/services/artwork-service";
import { getUserBookmarks, toggleBookmark } from "@/lib/services/community-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import type { Artwork } from "@/app/types";

export default function SavedArtworksPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSavedArtworks() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const bookmarks = await getUserBookmarks(user.id, "artwork");
        const resolved = await Promise.all(
          bookmarks.map((bookmark) => getArtwork(bookmark.targetId))
        );
        setArtworks(resolved.filter((artwork): artwork is Artwork => artwork !== null));
      } catch (error) {
        console.error("Failed to load saved artworks", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSavedArtworks();
  }, [user]);

  async function handleRemove(artworkId: string) {
    if (!user) return;
    try {
      await toggleBookmark(user.id, artworkId, "artwork");
      setArtworks((current) => current.filter((artwork) => artwork.id !== artworkId));
      addToast({ type: "success", title: "Removed", message: "Artwork removed from saved items." });
    } catch (error) {
      console.error("Failed to remove bookmark", error);
      addToast({ type: "error", title: "Could Not Remove", message: "Please try again." });
    }
  }

  if (isLoading) {
    return (
      <>
        <h1 className="text-headline-lg text-primary" style={{ marginBottom: 32 }}>Saved Artworks</h1>
        <div className="grid-auto">
          {[1, 2, 3].map((item) => (
            <div key={item} className="skeleton" style={{ height: 360 }} />
          ))}
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <div className="empty-state">
        <Icon name="lock" size={40} className="empty-state-icon" />
        <h1 className="text-headline-md text-primary">Sign in required</h1>
        <Link href="/login?redirect=/dashboard/saved">
          <Button variant="primary">Log In</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-end" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="text-headline-lg text-primary">Saved Artworks</h1>
          <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
            Pieces you bookmarked from KalaMarket.
          </p>
        </div>
        <Link href="/marketplace">
          <Button variant="outline" icon="storefront" iconPosition="left">Browse Marketplace</Button>
        </Link>
      </div>

      {artworks.length === 0 ? (
        <div className="empty-state">
          <Icon name="favorite_border" size={40} className="empty-state-icon" />
          <p className="text-body-lg text-on-surface-variant">No saved artworks yet.</p>
          <Link href="/marketplace">
            <Button variant="primary">Explore Artworks</Button>
          </Link>
        </div>
      ) : (
        <div className="grid-auto">
          {artworks.map((artwork) => (
            <div key={artwork.id} className="flex flex-col gap-12">
              <ArtworkCard
                id={artwork.id}
                title={artwork.title}
                artist={artwork.artistName}
                price={`Rs. ${artwork.price.toLocaleString("en-IN")}`}
                imageUrl={artwork.thumbnailUrl || artwork.images[0]?.url || "https://placehold.co/600x800"}
              />
              <Button variant="ghost" size="sm" onClick={() => handleRemove(artwork.id)}>
                Remove from saved
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
