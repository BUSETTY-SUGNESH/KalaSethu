'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import ArtworkCard from "@/app/components/cards/ArtworkCard";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  getCollectorItems,
  type CollectorItem,
} from "@/lib/services/collector-service";

export default function CollectorPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<CollectorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadCollection() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const collection = await getCollectorItems(user.id);
        setItems(collection);
      } catch (error) {
        console.error("Failed to load collector collection", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCollection();
  }, [user]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.title, item.artistName].join(" ").toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  if (isLoading) {
    return (
      <>
        <div className="flex justify-between items-end mb-8" style={{ marginBottom: 32 }}>
          <div>
            <div className="skeleton" style={{ width: 240, height: 40, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 320, height: 20 }} />
          </div>
          <div className="skeleton" style={{ width: 220, height: 44, borderRadius: "var(--radius-full)" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
          {[1, 2, 3].map((item) => (
            <div key={item} className="skeleton" style={{ height: 360, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="text-headline-lg text-primary">Your Collection</h1>
          <p className="text-body-md text-on-surface-variant mt-2" style={{ marginTop: 8 }}>
            Browse and manage your acquired heritage pieces.
          </p>
        </div>
        <div className="flex gap-12">
          <div className="header-search">
            <Icon name="search" size={20} />
            <input
              type="text"
              placeholder="Search collection..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <Icon name="collections" size={40} className="empty-state-icon" />
          <p className="text-body-lg text-on-surface-variant">No acquired artworks yet.</p>
          <Link href="/marketplace">
            <Button variant="primary" style={{ marginTop: 24 }}>Explore Marketplace</Button>
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <Icon name="search_off" size={40} className="empty-state-icon" />
          <p className="text-body-lg text-on-surface-variant">No artworks match your search.</p>
          <Button variant="ghost" onClick={() => setSearchQuery("")}>Clear Search</Button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
          {filteredItems.map((item) => (
            <ArtworkCard
              key={item.artworkId}
              id={item.artworkId}
              title={item.title}
              artist={item.artistName}
              price="Acquired"
              imageUrl={item.imageUrl}
            />
          ))}
        </div>
      )}
    </>
  );
}
