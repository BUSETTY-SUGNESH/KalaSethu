'use client';

import { useState, useEffect } from "react";
import Icon from "@/app/components/ui/Icon";
import SectionHeader from "@/app/components/ui/SectionHeader";
import ArtworkCard from "@/app/components/cards/ArtworkCard";
import { getPublishedArtworks } from "@/lib/services/artwork-service";
import type { Artwork } from "@/app/types";
import type { DocumentSnapshot } from "firebase/firestore";

export default function MarketplacePage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    async function loadInitial() {
      try {
        const result = await getPublishedArtworks(12);
        setArtworks(result.data);
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error("Failed to load artworks", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitial();
  }, []);

  async function handleLoadMore() {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await getPublishedArtworks(12, lastDoc);
      setArtworks((prev) => [...prev, ...result.data]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Failed to load more artworks", error);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <>
      <div className="bg-surface-container-low border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container py-8 flex flex-col gap-16" style={{ padding: "32px var(--margin-desktop)" }}>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-display-lg text-primary">KalaMarket</h1>
              <p className="text-body-lg text-on-surface-variant mt-2" style={{ marginTop: 8 }}>
                Invest in authentic Indian heritage. Verified provenance.
              </p>
            </div>
            <div className="flex gap-12">
              <button className="btn btn-outline">
                <Icon name="filter_list" size={18} />
                Filters
              </button>
              <button className="btn btn-primary">
                Sort: Newest <Icon name="expand_more" size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="container section-gap">
        <SectionHeader title="Curated Collections" />
        <div className="category-grid">
          <div className="category-item span-2 span-2-row">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKpT1QStD4QUN9YJvPDowhRfY4TjHRgp14IKqTk-dZPf2QVxjhCYF9Do1TBcz9kYIn25JvmAmgMFN4SiTxz-bfiSaKSqY1jZo1SuUkxPUJ6l9P-9Dm_mRR3HsGLvnppZPcalC7fwYjMPSysIjKXjym_Tw38G3BbEDWKTPLy9TFYrwQHataEMqeki-Net3suHauERIeca6ra8pSls3jpNvn9jl3MGYKzoBJJ3wpU2bcZKdffDylUtqXPcAncnx8sFJ5RrX4wOd3iRu5" alt="Bronzes" />
            <div className="category-overlay">
              <h3 className="text-headline-md text-on-primary">Chola Bronzes</h3>
            </div>
          </div>
          <div className="category-item">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwJlulKZjpPmd-6a2h5G6AbOOFyYz7zE9LlAwyGcRChBYoAPL9R9mjt-C0525alfJk4yEXwpUhhR_IpWw7z95hBGpGXn7oQ5ai1oIHCBJvoHQS5txRfWMGGRpf0ZTowVPizUw8d6mZ0mRC6L5LBfdUgGtILI4HYDrj8NeB1NRMG30hgZc2VL1z7YW0t2AIm_xiiGp4geGfeyayLm7fkhLan2roWFJdI1Z2o3_yXgbwrqWQSOpuUEJOTxgMpHqU8N5jHG6OUQkjbku_" alt="Paintings" />
            <div className="category-overlay">
              <h3 className="text-title-md text-on-primary">Mithila</h3>
            </div>
          </div>
          <div className="category-item">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfV8vS5h5VOyr5bH1vMXxhFlMIctImbzswi0rpFLIxUlOlvN6PEWJ4_L-XbD_nLEzkUM1TTOVEFoXiPg72403DPokjRM-L0_HBNz4URAwWbgdK8YN_6R7LtODUqdscYBsiwYOFTjMh7QGmg6T8i05hAlWcXldwNHJHu0XT-BLj15I0EMibTx0rrZulL2vZBAnZKbcYYUVrqeRFH-pWKxAbeh68aft4agkEoWNyqDqKVtvgR9DPhQTFd4oPNBiEIYX3WFSi8fzExVi5" alt="Textiles" />
            <div className="category-overlay">
              <h3 className="text-title-md text-on-primary">Textiles</h3>
            </div>
          </div>
          <div className="category-item span-2">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9Nl4KAeLTkOxgSkftwoUkycNLcgMiXyRcyOC7cDH0unfRLptrT3zB7nQtdTQy8EUNLcJ5LX-HtWx3-P4QSMgZ_N0CXsbyNRvlmIjh6bTlCImv5GfUQBJi9TXzpJIx0LRPBaMbE9ufV26-po5glJ1KCm8L0L7_b2AGG_hRJYLnkKbSumOD8uv36xjarsOb3UVUO2_Wa9wsb0yQeg4aogK8cupTL7ZVZN8JcZRY_vxKJrfxrt7riLYWOgVYmSXFi3j3Fa2XolbH9bFm" alt="Woodcraft" />
            <div className="category-overlay">
              <h3 className="text-headline-md text-on-primary">Mysore Woodcraft</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 80 }}>
        <SectionHeader title="New Arrivals" />
        
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <div className="skeleton" style={{ width: '100%', height: 300, borderRadius: 'var(--radius-lg)' }}></div>
                <div className="skeleton" style={{ width: '70%', height: 20, marginTop: 16 }}></div>
                <div className="skeleton" style={{ width: '40%', height: 16, marginTop: 8 }}></div>
              </div>
            ))}
          </div>
        ) : artworks.length > 0 ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
              {artworks.map((item) => (
                <ArtworkCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  artist={item.artistName}
                  price={`₹${item.price.toLocaleString('en-IN')}`}
                  imageUrl={item.thumbnailUrl || item.images[0]?.url || "https://placehold.co/600x800"}
                />
              ))}
            </div>
            
            {hasMore && (
              <div className="flex justify-center" style={{ marginTop: 64 }}>
                <button 
                  className="btn btn-outline btn-lg" 
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading...' : 'Load More Artworks'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>
              palette
            </span>
            <p className="text-body-lg text-on-surface-variant">
              No artworks published yet. Check back soon!
            </p>
          </div>
        )}
      </section>
    </>
  );
}
