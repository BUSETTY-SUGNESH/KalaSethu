"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { toggleBookmark } from "@/lib/services/community-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";

interface ArtworkCardProps {
  id: string;
  title: string;
  artist: string;
  price: string;
  imageUrl: string;
}

export default function ArtworkCard({
  id,
  title,
  artist,
  price,
  imageUrl,
}: ArtworkCardProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleToggleFavorite() {
    if (!isAuthenticated || !user) {
      router.push(`/login?redirect=/artwork/${id}`);
      return;
    }

    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await toggleBookmark(user.id, id, "artwork");
      setIsSaved(saved);
      addToast({
        type: saved ? "success" : "info",
        title: saved ? "Artwork Saved" : "Artwork Removed",
        message: saved ? "Added to your saved artworks." : "Removed from your saved artworks.",
      });
    } catch (error) {
      console.error("Failed to toggle favorite", error);
      addToast({ type: "error", title: "Could Not Save", message: "Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="card artwork-card">
      <div className="artwork-card-img-wrap">
        <button
          type="button"
          className="artwork-card-fav"
          aria-label={isSaved ? "Remove from saved artworks" : "Save artwork"}
          onClick={handleToggleFavorite}
          disabled={isSaving}
        >
          <Icon name={isSaved ? "favorite" : "favorite_border"} size={20} />
        </button>
        <Link href={`/artwork/${id}`}>
          <Image 
            src={imageUrl} 
            alt={title} 
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="card-img" 
          />
        </Link>
      </div>
      <div className="artwork-card-meta">
        <Link href={`/artwork/${id}`}>
          <h3 className="text-title-md text-primary truncate">{title}</h3>
        </Link>
        <div className="artwork-card-artist text-label-sm text-on-surface-variant uppercase">
          {artist}
          <Icon name="verified" size={14} className="text-accent-emerald" />
        </div>
        <div className="artwork-card-price-row">
          <span className="text-price text-primary">{price}</span>
          <Link
            href={`/artwork/${id}`}
            className="text-label-sm text-accent-gold uppercase"
            style={{ fontWeight: 700, letterSpacing: "0.05em" }}
          >
            Buy Now
          </Link>
        </div>
      </div>
    </article>
  );
}
