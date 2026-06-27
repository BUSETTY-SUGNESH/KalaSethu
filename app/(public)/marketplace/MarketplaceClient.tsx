'use client';

import { useState, useEffect, useRef } from "react";
import Icon from "@/app/components/ui/Icon";
import Image from "next/image";
import SectionHeader from "@/app/components/ui/SectionHeader";
import ArtworkCard from "@/app/components/cards/ArtworkCard";
import { getPublishedArtworks, searchArtworks } from "@/lib/services/artwork-service";
import { useUIStore } from "@/lib/stores/ui-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Artwork } from "@/app/types";
import Link from "next/link";

interface MarketplaceClientProps {
  initialArtworks: Artwork[];
  initialHasMore: boolean;
  initialCursor: unknown;
  initialError?: string | null;
}

export default function MarketplaceClient({
  initialArtworks,
  initialHasMore,
  initialCursor,
  initialError = null
}: MarketplaceClientProps) {
  // Global Query State
  const {
    searchQuery, setSearchQuery,
    activeCategory, setActiveCategory,
    sortBy, setSortBy,
    marketplaceCache, setMarketplaceCache
  } = useUIStore();

  // Auth State
  const { isArtist } = useAuthStore();

  const [artworks, setArtworks] = useState<Artwork[]>(marketplaceCache ? marketplaceCache.artworks : initialArtworks);
  const [lastDoc, setLastDoc] = useState<unknown>(marketplaceCache ? marketplaceCache.lastDoc : initialCursor);
  const [hasMore, setHasMore] = useState(marketplaceCache ? marketplaceCache.hasMore : initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [isRetryingInitial, setIsRetryingInitial] = useState(false);

  // Local UI State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Artwork[] | null>(marketplaceCache ? marketplaceCache.searchResults : null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // Track state for caching on unmount
  const stateRef = useRef({ artworks, lastDoc, hasMore, searchResults });
  useEffect(() => {
    stateRef.current = { artworks, lastDoc, hasMore, searchResults };
  }, [artworks, lastDoc, hasMore, searchResults]);

  // Save cache on unmount
  useEffect(() => {
    return () => {
      setMarketplaceCache({
        ...stateRef.current,
        scrollY: window.scrollY
      });
    };
  }, [setMarketplaceCache]);

  // Restore scroll position
  const hasRestoredScroll = useRef(false);
  useEffect(() => {
    if (marketplaceCache?.scrollY && !hasRestoredScroll.current) {
      hasRestoredScroll.current = true;
      setTimeout(() => window.scrollTo(0, marketplaceCache.scrollY), 100);
    }
  }, [marketplaceCache]);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFilterMenuOpen(false);
        setIsSortMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Constants
  const categories = ["Chola Bronzes", "Mithila", "Textiles", "Mysore Woodcraft"];
  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'popular', label: 'Most Popular' }
  ];

  // Effect to handle Search, Filter, and Sort changes
  const isFirstFilterEffect = useRef(true);

  useEffect(() => {
    const isFirst = isFirstFilterEffect.current;
    isFirstFilterEffect.current = false;

    if (isFirst && marketplaceCache) {
      // The cache restoration handles populating searchResults and artworks.
      return;
    }

    // If there is an active search, perform it (and apply client-side filtering/sorting)
    if (searchQuery.trim()) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        setError(null);
        try {
          let results = await searchArtworks(searchQuery.trim());

          // Client-side category filtering
          if (activeCategory) {
            results = results.filter(a => a.category === activeCategory);
          }

          // Client-side sorting
          if (sortBy === 'price_low') {
            results.sort((a, b) => a.price - b.price);
          } else if (sortBy === 'price_high') {
            results.sort((a, b) => b.price - a.price);
          } else if (sortBy === 'popular') {
            results.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
          } else {
            // Newest
            results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }

          setSearchResults(results);
        } catch (err) {
          console.error("Search failed", err);
          setError("Failed to search artworks. Please try again.");
        } finally {
          setIsSearching(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // If no search, but filters/sort changed, reset and fetch from Firestore
    // Note: We skip this on initial render if no filters are applied, because initialArtworks are already loaded.
    // However, to keep it simple, if category or sort changes from default, we fetch immediately.
    let isMounted = true;
    const fetchFiltered = async () => {
      setIsRetryingInitial(true);
      setError(null);
      try {
        const result = await getPublishedArtworks(12, null, {
          category: activeCategory || undefined,
          sortBy
        });
        if (isMounted) {
          setArtworks(result.data);
          setLastDoc(result.lastDoc);
          setHasMore(result.hasMore);
          setSearchResults(null);
          setIsSearching(false);
        }
      } catch (err) {
        console.error("Filter/Sort failed", err);
        if (isMounted) setError("Unable to connect. Please check your network and try again.");
      } finally {
        if (isMounted) setIsRetryingInitial(false);
      }
    };

    // We only trigger fetch if it's not the initial default load
    // (since initial load is handled by server component)
    // To detect this, we can just fetch anyway since the user interacted, 
    // but if it's strictly the first render, we shouldn't. 
    // Actually, useEffect runs on first render. If we fetch, we duplicate the server work.
    // Let's use a ref to skip the first render, OR just rely on the fact that if it's default, we don't fetch.
    if (activeCategory !== null || sortBy !== 'newest') {
      fetchFiltered();
    } else {
      // If we cleared filters back to default, and we had previously changed them, we should reset to initial.
      // But initialArtworks is available. We can just reset to it.
      setArtworks(initialArtworks);
      setLastDoc(initialCursor);
      setHasMore(initialHasMore);
      setSearchResults(null);
      setIsSearching(false);
    }

    return () => { isMounted = false; };
  }, [searchQuery, activeCategory, sortBy, initialArtworks, initialCursor, initialHasMore]);

  async function handleRetryInitial() {
    setIsRetryingInitial(true);
    setError(null);
    try {
      const result = await getPublishedArtworks(12, null, {
        category: activeCategory || undefined,
        sortBy
      });
      setArtworks(result.data);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Retry failed", err);
      setError("Unable to connect. Please check your network and try again.");
    } finally {
      setIsRetryingInitial(false);
    }
  }

  async function handleLoadMore() {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      // We cast lastDoc to any here to allow primitive cursors for the first client fetch, 
      // and DocumentSnapshot for subsequent fetches.
      const result = await getPublishedArtworks(12, lastDoc as any, {
        category: activeCategory || undefined,
        sortBy
      });
      setArtworks((prev) => [...prev, ...result.data]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Failed to load more artworks", err);
      setError("Failed to load more artworks. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <>
      <div className="bg-surface-container-low border-b border-outline-variant">
        <div className="container py-8 flex flex-col gap-16">
          <div className="flex justify-between items-end mobile-flex-col mobile-items-start mobile-gap-16">
            <div>
              <h1 className="text-display-lg text-primary">KalaMarket</h1>
              <p className="text-body-lg text-on-surface-variant mt-2">
                Invest in authentic Indian heritage. Verified provenance.
              </p>
            </div>
            <div className="flex gap-12 relative mobile-w-full mobile-flex-col">
              <div className="relative mobile-w-full" ref={filterRef}>
                <button
                  className={`btn ${activeCategory ? 'btn-outline' : 'btn-outline'} mobile-w-full justify-between`}
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={isFilterMenuOpen}
                >
                  {!activeCategory && <Icon name="filter_list" size={18} />}
                  {activeCategory ? activeCategory : 'FILTERS'}
                  {activeCategory && <Icon name="expand_more" size={18} />}
                </button>
                <div
                  className="dropdown-menu"
                  style={{
                    position: "absolute",
                    top: "100%",
                    marginTop: "-40px",
                    left: 0,
                    width: "220px",
                    backgroundColor: "var(--color-ink-charcoal)",
                    color: "var(--color-surface)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.24)",
                    zIndex: 50,
                    opacity: isFilterMenuOpen ? 1 : 0,
                    transform: isFilterMenuOpen ? "translateY(0)" : "translateY(-8px)",
                    pointerEvents: isFilterMenuOpen ? "auto" : "none",
                    transition: "all var(--duration-normal) var(--ease-default)",
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: "-6px",
                    left: "24px",
                    width: "12px",
                    height: "12px",
                    backgroundColor: "var(--color-ink-charcoal)",
                    transform: "rotate(45deg)",
                    borderRadius: "2px 0 0 0"
                  }} />
                  <div style={{ padding: "12px 8px", position: "relative", zIndex: 2 }}>
                    <div className="text-label-sm mb-2" style={{ padding: "4px 16px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.05em" }}>CATEGORIES</div>
                    <button
                      className="btn-ghost"
                      style={{
                        width: "100%", textAlign: "left", padding: "8px 16px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center",
                        color: activeCategory === null ? "var(--color-surface)" : "rgba(255,255,255,0.8)",
                        fontWeight: activeCategory === null ? 500 : 400
                      }}
                      onClick={() => { setActiveCategory(null); setIsFilterMenuOpen(false); }}
                    >
                      All Categories
                      {activeCategory === null && <Icon name="check" size={16} className="text-accent-gold" />}
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        className="btn-ghost"
                        style={{
                          width: "100%", textAlign: "left", padding: "8px 16px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center",
                          color: activeCategory === cat ? "var(--color-surface)" : "rgba(255,255,255,0.8)",
                          fontWeight: activeCategory === cat ? 500 : 400
                        }}
                        onClick={() => { setActiveCategory(cat); setIsFilterMenuOpen(false); }}
                      >
                        {cat}
                        {activeCategory === cat && <Icon name="check" size={16} className="text-accent-gold" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative mobile-w-full" ref={sortRef}>
                <button
                  className="btn btn-primary mobile-w-full justify-between"
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={isSortMenuOpen}
                >
                  {sortBy === 'newest' ? 'SORT: NEWEST' : sortOptions.find(o => o.value === sortBy)?.label} <Icon name="expand_more" size={18} />
                </button>
                <div
                  className="dropdown-menu"
                  style={{
                    position: "absolute",
                    top: "100%",
                    marginTop: "-40px",
                    right: 0,
                    width: "200px",
                    backgroundColor: "var(--color-ink-charcoal)",
                    color: "var(--color-surface)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.24)",
                    zIndex: 50,
                    opacity: isSortMenuOpen ? 1 : 0,
                    transform: isSortMenuOpen ? "translateY(0)" : "translateY(-8px)",
                    pointerEvents: isSortMenuOpen ? "auto" : "none",
                    transition: "all var(--duration-normal) var(--ease-default)",
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: "-6px",
                    right: "24px",
                    width: "12px",
                    height: "12px",
                    backgroundColor: "var(--color-ink-charcoal)",
                    transform: "rotate(45deg)",
                    borderRadius: "2px 0 0 0"
                  }} />
                  <div style={{ padding: "12px 8px", position: "relative", zIndex: 2 }}>
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        className="btn-ghost"
                        style={{
                          width: "100%", textAlign: "left", padding: "8px 16px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center",
                          color: sortBy === option.value ? "var(--color-surface)" : "rgba(255,255,255,0.8)",
                          fontWeight: sortBy === option.value ? 500 : 400
                        }}
                        onClick={() => { setSortBy(option.value as any); setIsSortMenuOpen(false); }}
                      >
                        {option.label}
                        {sortBy === option.value && <Icon name="check" size={16} className="text-accent-gold" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isArtist() && (
            <div className="bg-surface-container border border-outline-variant rounded-md p-4 mt-4 flex justify-between items-center mobile-flex-col mobile-items-start mobile-gap-12">
              <div>
                <h3 className="text-title-md text-primary" style={{ fontWeight: 600 }}>Artist Hub</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">Manage your listings and track your artwork activity.</p>
              </div>
              <div className="flex gap-12 mobile-w-full">
                <Link href="/dashboard/artist/upload" className="btn btn-primary mobile-w-full justify-center">
                  <Icon name="add" size={18} /> Add New Artwork
                </Link>
                <Link href="/dashboard/artist" className="btn btn-outline mobile-w-full justify-center">
                  Manage Listings
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {searchQuery.trim() ? (
        <section className="container section-gap" style={{ paddingBottom: 80, paddingTop: 40 }} aria-live="polite" aria-busy={isSearching}>
          <div className="flex justify-between items-center mb-8 mobile-flex-col mobile-items-start mobile-gap-12">
            <h2 className="text-headline-md text-on-surface">
              Search Results for "{searchQuery}"
            </h2>
            {isSearching && <span className="text-body-md text-on-surface-variant">Searching...</span>}
          </div>

          {isSearching ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="skeleton" style={{ width: '100%', height: 300, borderRadius: 'var(--radius-lg)' }} aria-busy="true"></div>
                  <div className="skeleton" style={{ width: '70%', height: 20, marginTop: 16 }} aria-busy="true"></div>
                  <div className="skeleton" style={{ width: '40%', height: 16, marginTop: 8 }} aria-busy="true"></div>
                </div>
              ))}
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
              {searchResults.map((item) => (
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
          ) : (
            <div className="empty-state" style={{ padding: '64px 24px' }}>
              <span className="material-symbols-outlined empty-state-icon text-outline" style={{ fontSize: 48 }}>
                search_off
              </span>
              <h3 className="text-title-lg text-on-surface mt-4 mb-2">No results found</h3>
              <p className="text-body-md text-on-surface-variant mb-6 text-center max-w-md">
                We couldn't find anything matching "{searchQuery}". Try modifying your search keywords or browsing our curated collections.
              </p>
              <button
                className="btn btn-outline"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="container section-gap">
            <SectionHeader title="Curated Collections" />
            <div className="category-grid">
              <button 
                className="category-item span-2 span-2-row text-left"
                style={{ position: "relative" }}
                onClick={() => { setActiveCategory("Chola Bronzes"); setSearchQuery(""); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                aria-label="Filter by Chola Bronzes"
              >
                <Image src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKpT1QStD4QUN9YJvPDowhRfY4TjHRgp14IKqTk-dZPf2QVxjhCYF9Do1TBcz9kYIn25JvmAmgMFN4SiTxz-bfiSaKSqY1jZo1SuUkxPUJ6l9P-9Dm_mRR3HsGLvnppZPcalC7fwYjMPSysIjKXjym_Tw38G3BbEDWKTPLy9TFYrwQHataEMqeki-Net3suHauERIeca6ra8pSls3jpNvn9jl3MGYKzoBJJ3wpU2bcZKdffDylUtqXPcAncnx8sFJ5RrX4wOd3iRu5" alt="Bronzes" fill priority sizes="(max-width: 768px) 100vw, 50vw" />
                <div className="category-overlay">
                  <h3 className="text-headline-md text-on-primary">Chola Bronzes</h3>
                </div>
              </button>
              <button 
                className="category-item text-left"
                style={{ position: "relative" }}
                onClick={() => { setActiveCategory("Mithila"); setSearchQuery(""); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                aria-label="Filter by Mithila"
              >
                <Image src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwJlulKZjpPmd-6a2h5G6AbOOFyYz7zE9LlAwyGcRChBYoAPL9R9mjt-C0525alfJk4yEXwpUhhR_IpWw7z95hBGpGXn7oQ5ai1oIHCBJvoHQS5txRfWMGGRpf0ZTowVPizUw8d6mZ0mRC6L5LBfdUgGtILI4HYDrj8NeB1NRMG30hgZc2VL1z7YW0t2AIm_xiiGp4geGfeyayLm7fkhLan2roWFJdI1Z2o3_yXgbwrqWQSOpuUEJOTxgMpHqU8N5jHG6OUQkjbku_" alt="Paintings" fill priority sizes="(max-width: 768px) 50vw, 25vw" />
                <div className="category-overlay">
                  <h3 className="text-title-md text-on-primary">Mithila</h3>
                </div>
              </button>
              <button 
                className="category-item text-left"
                style={{ position: "relative" }}
                onClick={() => { setActiveCategory("Textiles"); setSearchQuery(""); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                aria-label="Filter by Textiles"
              >
                <Image src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfV8vS5h5VOyr5bH1vMXxhFlMIctImbzswi0rpFLIxUlOlvN6PEWJ4_L-XbD_nLEzkUM1TTOVEFoXiPg72403DPokjRM-L0_HBNz4URAwWbgdK8YN_6R7LtODUqdscYBsiwYOFTjMh7QGmg6T8i05hAlWcXldwNHJHu0XT-BLj15I0EMibTx0rrZulL2vZBAnZKbcYYUVrqeRFH-pWKxAbeh68aft4agkEoWNyqDqKVtvgR9DPhQTFd4oPNBiEIYX3WFSi8fzExVi5" alt="Textiles" fill priority sizes="(max-width: 768px) 50vw, 25vw" />
                <div className="category-overlay">
                  <h3 className="text-title-md text-on-primary">Textiles</h3>
                </div>
              </button>
              <button 
                className="category-item span-2 text-left"
                style={{ position: "relative" }}
                onClick={() => { setActiveCategory("Mysore Woodcraft"); setSearchQuery(""); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                aria-label="Filter by Mysore Woodcraft"
              >
                <Image src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9Nl4KAeLTkOxgSkftwoUkycNLcgMiXyRcyOC7cDH0unfRLptrT3zB7nQtdTQy8EUNLcJ5LX-HtWx3-P4QSMgZ_N0CXsbyNRvlmIjh6bTlCImv5GfUQBJi9TXzpJIx0LRPBaMbE9ufV26-po5glJ1KCm8L0L7_b2AGG_hRJYLnkKbSumOD8uv36xjarsOb3UVUO2_Wa9wsb0yQeg4aogK8cupTL7ZVZN8JcZRY_vxKJrfxrt7riLYWOgVYmSXFi3j3Fa2XolbH9bFm" alt="Woodcraft" fill priority sizes="(max-width: 768px) 100vw, 50vw" />
                <div className="category-overlay">
                  <h3 className="text-headline-md text-on-primary">Mysore Woodcraft</h3>
                </div>
              </button>
            </div>
          </section>

          <section className="container" style={{ paddingBottom: 80 }} aria-live="polite" aria-busy={isRetryingInitial || isLoadingMore}>
            <SectionHeader title="New Arrivals" />

            {error && artworks.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined empty-state-icon text-error" style={{ fontSize: 32 }}>
                  error_outline
                </span>
                <h3 className="text-title-lg text-on-surface mb-2">{error}</h3>
                <p className="text-body-md text-on-surface-variant mb-6">
                  We encountered an issue connecting to the database.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={handleRetryInitial}
                  disabled={isRetryingInitial}
                  aria-busy={isRetryingInitial}
                >
                  {isRetryingInitial ? "Retrying..." : "Try Again"}
                </button>
              </div>
            ) : isRetryingInitial ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i}>
                    <div className="skeleton" style={{ width: '100%', height: 300, borderRadius: 'var(--radius-lg)' }} aria-busy="true"></div>
                    <div className="skeleton" style={{ width: '70%', height: 20, marginTop: 16 }} aria-busy="true"></div>
                    <div className="skeleton" style={{ width: '40%', height: 16, marginTop: 8 }} aria-busy="true"></div>
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

                {error && artworks.length > 0 && (
                  <div className="flex flex-col items-center gap-16" style={{ marginTop: 64 }}>
                    <p className="text-body-md text-error" role="alert">{error}</p>
                    <button
                      className="btn btn-outline btn-lg"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      aria-busy={isLoadingMore}
                    >
                      {isLoadingMore ? 'Loading...' : 'Try Again'}
                    </button>
                  </div>
                )}

                {!error && hasMore && (
                  <div className="flex justify-center" style={{ marginTop: 64 }}>
                    <button
                      className="btn btn-outline btn-lg"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      aria-busy={isLoadingMore}
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
      )}
    </>
  );
}
