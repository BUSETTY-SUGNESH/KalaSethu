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
import CollectorSubpageHero from "@/app/components/dashboard/CollectorSubpageHero";

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
      <div className="collector-dashboard-page">
        <div className="skeleton dashboard-sub-hero" style={{ height: 120, marginBottom: 32 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
          {[1, 2, 3].map((item) => (
            <div key={item} className="skeleton" style={{ height: 360, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="collector-dashboard-page">
      <CollectorSubpageHero
        eyebrow="My Collection"
        title="Purchased Collection"
        description="Acquired pieces from marketplace purchases and auction wins."
        actions={
          <div className="header-search" style={{ minWidth: 240 }}>
            <Icon name="search" size={20} />
            <input
              type="text"
              placeholder="Search collection..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        }
        quickLinks={[
          { href: '/marketplace', icon: 'storefront', label: 'Marketplace' },
          { href: '/dashboard/bids', icon: 'gavel', label: 'Active Bids' },
          { href: '/dashboard/orders', icon: 'receipt_long', label: 'Orders' },
        ]}
      />

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
    </div>
  );
}
