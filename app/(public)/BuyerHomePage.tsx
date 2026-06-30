"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import SectionHeader from "@/app/components/ui/SectionHeader";
import CategoryCollectionCard from "@/app/components/cards/CategoryCollectionCard";
import HomeAuctionCard from "@/app/components/home/HomeAuctionCard";
import ArtworkCardGrid, { ArtworkCardSkeleton, SoldArtworkCardGrid } from "@/app/components/home/ArtworkCardGrid";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getPersonalizedArtworks } from "@/lib/services/home-recommendations";
import type { HomeBuyerData } from "@/lib/services/server/home-admin.service";
import type { Artwork, CalendarEvent, Post, UserProfile } from "@/app/types";
import { HOME_HERO } from "@/lib/constants/home-hero";

function buildBuyerTicker(
  auctions: HomeBuyerData["endingSoonAuctions"],
  events: HomeBuyerData["upcomingEvents"]
): string | null {
  const parts: string[] = [];
  for (const auction of auctions.slice(0, 3)) {
    parts.push(
      `Live auction: ${auction.artworkTitle} — ₹${auction.currentBid.toLocaleString("en-IN")}`
    );
  }
  for (const event of events.slice(0, 2)) {
    parts.push(`Kalent: ${event.title} — ${format(new Date(event.startDate), "MMM d")}`);
  }
  return parts.length > 0 ? parts.join("   |   ") : null;
}

function ArtistAvatar({ artist }: { artist: UserProfile }) {
  if (artist.avatarUrl) {
    return (
      <Image
        src={artist.avatarUrl}
        alt=""
        width={80}
        height={80}
        style={{ objectFit: "cover", width: "100%", height: "100%" }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-surface-container-high)",
        fontSize: 28,
        fontWeight: 700,
        color: "var(--color-primary)",
      }}
    >
      {artist.displayName.charAt(0).toUpperCase()}
    </div>
  );
}

function EventDateBox({ dateStr, urgent = false }: { dateStr: string; urgent?: boolean }) {
  const date = new Date(dateStr);
  return (
    <div className="event-date-box">
      <span
        className={`text-label-sm ${urgent ? "text-status-urgency" : "text-accent-emerald"}`}
        style={{ lineHeight: 1 }}
      >
        {format(date, "MMM")}
      </span>
      <span className="text-headline-sm text-primary" style={{ lineHeight: 1, marginTop: 4 }}>
        {format(date, "d")}
      </span>
    </div>
  );
}

function HomeHero() {
  return (
    <section className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div className="hero-section">
        <div className="hero-text">
          <div className="flex flex-col gap-16">
            <span className="text-label-md hero-badge">
              <span className="hero-badge-line" />
              {HOME_HERO.badge}
            </span>
            <h1 className="text-display-lg text-primary">{HOME_HERO.title}</h1>
            <p className="text-body-lg text-on-surface-variant">{HOME_HERO.description}</p>
          </div>
          <div>
            <Link href={HOME_HERO.ctaHref} className="btn btn-primary btn-lg">
              {HOME_HERO.ctaLabel}
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
          </div>
        </div>
        <div className="hero-image-wrap">
          <div className="hero-image-overlay" />
          <Image
            src={HOME_HERO.imageSrc}
            alt={HOME_HERO.imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            style={{ objectFit: "cover" }}
          />
        </div>
      </div>
    </section>
  );
}

export default function BuyerHomePage({ initialData }: { initialData: HomeBuyerData }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [personalized, setPersonalized] = useState<Artwork[]>([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);

  const {
    trendingArtworks,
    recentlyListed,
    recentlySold,
    featuredArtists,
    endingSoonAuctions,
    trendingPosts,
    upcomingEvents,
    categories,
  } = initialData;

  const tickerText = buildBuyerTicker(endingSoonAuctions, upcomingEvents);

  const excludeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of [...trendingArtworks, ...recentlyListed, ...recentlySold]) {
      ids.add(a.id);
    }
    return [...ids];
  }, [trendingArtworks, recentlyListed, recentlySold]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPersonalized([]);
      return;
    }
    let cancelled = false;
    setLoadingPersonalized(true);
    getPersonalizedArtworks(user.id, excludeIds, 8)
      .then((items) => {
        if (!cancelled) setPersonalized(items);
      })
      .catch(() => {
        if (!cancelled) setPersonalized([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPersonalized(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, isAuthenticated, excludeIds]);

  const filteredTrending = trendingArtworks.slice(0, 8);
  const filteredRecent = recentlyListed.slice(0, 8);

  return (
    <>
      {tickerText ? (
        <div className="ticker-bar">
          <div className="container ticker-inner">
            <span className="text-label-sm ticker-label">Live Updates</span>
            <div className="ticker-scroll-area" aria-live="polite">
              <div className="text-caption ticker-content" style={{ color: "var(--color-on-surface-variant)" }}>
                {tickerText}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <HomeHero />

      {filteredTrending.length > 0 ? (
        <section className="container home-section">
          <SectionHeader title="Trending on KalaMarket" actionHref="/marketplace" actionLabel="Shop All" />
          <ArtworkCardGrid artworks={filteredTrending} />
        </section>
      ) : null}

      {endingSoonAuctions.length > 0 ? (
        <section className="container home-section home-auctions-section">
          <SectionHeader title="Live Auctions Ending Soon" actionHref="/bids" actionLabel="All Auctions" />
          <div className="home-auction-scroll">
            {endingSoonAuctions.map((auction) => (
              <HomeAuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        </section>
      ) : null}

      {featuredArtists.length > 0 ? (
        <section className="container home-section">
          <SectionHeader title="Featured & Verified Artists" actionHref="/explore" actionLabel="Discover More" />
          <div className="horizontal-scroll">
            {featuredArtists.map((artist) => (
              <Link
                key={artist.id}
                href={`/profile/${artist.id}`}
                className="artist-card"
                aria-label={`View ${artist.displayName}'s profile${artist.specialty ? ` — ${artist.specialty}` : ""}`}
              >
                <div className="artist-avatar-wrap">
                  <ArtistAvatar artist={artist} />
                </div>
                <div>
                  <h3 className="text-headline-sm text-primary">{artist.displayName}</h3>
                  <p className="text-label-sm text-on-surface-variant uppercase" style={{ marginTop: 4, letterSpacing: "0.05em" }}>
                    {artist.specialty ?? "Artist"}
                  </p>
                  {artist.isVerified ? (
                    <span className="text-caption text-accent-emerald" style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span>
                      Verified
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {categories.length > 0 ? (
        <section className="container home-section">
          <SectionHeader title="Browse by Category" actionHref="/marketplace" actionLabel="KalaMarket" />
          <div className="category-grid category-grid-marketplace">
            {categories.slice(0, 6).map((cat) => (
              <CategoryCollectionCard
                key={cat.slug}
                category={cat}
                onSelect={(slug) => router.push(`/marketplace?category=${slug}`)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {filteredRecent.length > 0 ? (
        <section className="container home-section">
          <SectionHeader title="Recently Listed" actionHref="/marketplace" actionLabel="New Arrivals" />
          <ArtworkCardGrid artworks={filteredRecent} />
        </section>
      ) : null}

      {isAuthenticated && (loadingPersonalized || personalized.length > 0) ? (
        <section className="container home-section home-personalized-section" aria-live="polite">
          <SectionHeader
            title={personalized.length > 0 ? "Recommended for You" : "Finding recommendations…"}
            actionHref={personalized.length > 0 ? "/marketplace" : undefined}
            actionLabel="Explore More"
          />
          {loadingPersonalized ? (
            <ArtworkCardSkeleton count={4} />
          ) : (
            <ArtworkCardGrid artworks={personalized} />
          )}
        </section>
      ) : null}

      {(trendingPosts.length > 0 || upcomingEvents.length > 0) ? (
        <section className="container home-section" style={{ paddingBottom: 80 }}>
          <div className="split-layout home-community-layout">
            {trendingPosts.length > 0 ? (
              <div>
                <SectionHeader title="CharchaSabha" actionHref="/community" actionLabel="Join Discussion" />
                <div className="flex flex-col gap-16">
                  {trendingPosts.map((post, index) => (
                    <CommunityThreadCard key={post.id} post={post} active={index === 0} />
                  ))}
                </div>
              </div>
            ) : null}

            {upcomingEvents.length > 0 ? (
              <div className="kalent-box">
                <SectionHeader title="Kalent" actionHref="/events" actionLabel="All Events" className="home-kalent-header" />
                <div className="flex flex-col gap-16">
                  {upcomingEvents.map((event) => (
                    <EventPreviewCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {recentlySold.length > 0 ? (
        <section className="container home-section home-sold-section">
          <SectionHeader title="Recently Sold" actionHref="/marketplace" actionLabel="Marketplace" />
          <SoldArtworkCardGrid artworks={recentlySold} />
        </section>
      ) : null}

      <section className="container home-cta-band">
        <div className="home-cta-inner">
          <div>
            <h2 className="text-headline-lg text-primary">Start Your Collection</h2>
            <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8, maxWidth: 480 }}>
              Explore authenticated Indian art, join live auctions, and connect with master artisans on KalaSetu.
            </p>
          </div>
          <div className="home-cta-actions">
            <Link href="/marketplace" className="btn btn-primary">Browse KalaMarket</Link>
            <Link href="/bids" className="btn btn-outline">Live Auctions</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function CommunityThreadCard({ post, active }: { post: Post; active: boolean }) {
  return (
    <Link
      href={`/community/${post.id}`}
      className={`thread-item ${active ? "active-thread" : "inactive-thread"}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <span className="text-caption text-on-surface-variant" style={{ display: "block", marginBottom: 4 }}>
        {post.category ?? "Discussion"} • {post.commentCount} repl{post.commentCount === 1 ? "y" : "ies"}
      </span>
      <h4 className="text-headline-sm text-primary">{post.title ?? post.content.slice(0, 80)}</h4>
      <p className="text-body-md text-on-surface-variant line-clamp-2">{post.content}</p>
    </Link>
  );
}

function EventPreviewCard({ event }: { event: CalendarEvent }) {
  const isUrgent = new Date(event.startDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
  return (
    <Link href={`/events/${event.id}`} className="event-item" style={{ textDecoration: "none" }}>
      <EventDateBox dateStr={event.startDate} urgent={isUrgent} />
      <div>
        <h4 className="text-label-md text-primary" style={{ textTransform: "none" }}>{event.title}</h4>
        <p className="text-caption text-on-surface-variant" style={{ marginTop: 4 }}>
          {event.mode === "online" ? "Virtual" : event.city ?? "In Person"}
          {event.registrationCount > 0 ? ` • ${event.registrationCount} registered` : ""}
        </p>
      </div>
    </Link>
  );
}
