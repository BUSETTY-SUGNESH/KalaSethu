"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getArtworksByArtist } from "@/lib/services/artwork-service";
import { getAllAuctionsByArtist, computeSellerAuctionStats } from "@/lib/services/auction-service";
import { getEventsByOrganizer } from "@/lib/services/event-service";
import type { HomeBuyerData } from "@/lib/services/server/home-admin.service";
import type {
  Artwork,
  Auction,
  AuctionStatus,
  CalendarEvent,
} from "@/app/types";
import { ARTWORK_PLACEHOLDER } from "@/lib/constants/placeholders";
import BuyerHomePage from "./BuyerHomePage";

const ACTIVE_AUCTION_STATUSES = ["live", "ending_soon", "scheduled"] as const;

const SELLER_FALLBACK_TICKER =
  'New bid on your artwork!   |   Your workshop has new registrations.   |   Payout processed successfully.   |   Kalent: Add your next exhibition before the deadline.';

function formatRevenue(amount: number): string {
  if (amount === 0) return "₹0";
  return `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(amount)}`;
}

function getArtworkImageUrl(artwork: Artwork): string {
  return artwork.thumbnailUrl || artwork.images[0]?.url || ARTWORK_PLACEHOLDER;
}

function getAuctionStatusBadge(auction: Auction) {
  const isEnded =
    auction.status === "ended" ||
    auction.status === "completed" ||
    auction.status === "cancelled" ||
    new Date(auction.endsAt).getTime() < Date.now();

  if (isEnded) {
    return { label: "Ended", dotClass: "active" as const };
  }

  const statusMap: Record<AuctionStatus, { label: string; dotClass: "pulse" | "active" }> = {
    ending_soon: { label: "Ending Soon", dotClass: "pulse" },
    scheduled: { label: "Scheduled", dotClass: "active" },
    live: { label: "Live", dotClass: "pulse" },
    ended: { label: "Ended", dotClass: "active" },
    cancelled: { label: "Cancelled", dotClass: "active" },
    completed: { label: "Completed", dotClass: "active" },
  };

  return statusMap[auction.status] ?? { label: "Live", dotClass: "pulse" as const };
}

function formatAuctionTime(auction: Auction): string {
  if (new Date(auction.endsAt).getTime() < Date.now()) {
    return "Ended";
  }
  return formatDistanceToNow(new Date(auction.endsAt), { addSuffix: true });
}

function buildSellerTicker(auctions: Auction[], events: CalendarEvent[]): string {
  const parts: string[] = [];
  for (const auction of auctions.slice(0, 2)) {
    parts.push(
      `Bid update on "${auction.artworkTitle}" — ₹${auction.currentBid.toLocaleString("en-IN")} (${formatAuctionTime(auction)})`
    );
  }
  for (const event of events.slice(0, 1)) {
    parts.push(`Your event "${event.title}" — ${event.registrationCount} registered`);
  }
  return parts.length > 0 ? parts.join("   |   ") : SELLER_FALLBACK_TICKER;
}

function getActiveAuctionForArtwork(artworkId: string, activeAuctions: Auction[]): Auction | undefined {
  return activeAuctions.find((a) => a.artworkId === artworkId);
}

type SellerArtworkCardModel = {
  badge: { label: string; dotClass: "pulse" | "active"; color?: string };
  priceLabel: string;
  priceCaption?: string;
  showAuctionMeta: boolean;
  primaryAction: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
};

function getSellerArtworkCardModel(artwork: Artwork, activeAuctions: Auction[]): SellerArtworkCardModel {
  const activeAuction = getActiveAuctionForArtwork(artwork.id, activeAuctions);

  if (activeAuction) {
    const auctionBadge = getAuctionStatusBadge(activeAuction);
    return {
      badge: { label: auctionBadge.label, dotClass: auctionBadge.dotClass },
      priceLabel: `₹${activeAuction.currentBid.toLocaleString("en-IN")}`,
      priceCaption: `${activeAuction.totalBids} bid${activeAuction.totalBids !== 1 ? "s" : ""} • ${formatAuctionTime(activeAuction)}`,
      showAuctionMeta: true,
      primaryAction: { href: `/artwork/${activeAuction.artworkId}`, label: "Manage Bid" },
      secondaryAction: { href: `/dashboard/artist/edit/${artwork.id}`, label: "Edit" },
    };
  }

  if (artwork.status === "sold") {
    return {
      badge: { label: "Sold", dotClass: "active", color: "var(--color-on-surface-variant)" },
      priceLabel: `₹${artwork.price.toLocaleString("en-IN")}`,
      showAuctionMeta: false,
      primaryAction: { href: `/artwork/${artwork.id}`, label: "View Listing" },
    };
  }

  if (artwork.status === "draft") {
    return {
      badge: { label: "Draft", dotClass: "active", color: "var(--color-on-surface-variant)" },
      priceLabel: artwork.price > 0 ? `₹${artwork.price.toLocaleString("en-IN")}` : "—",
      showAuctionMeta: false,
      primaryAction: { href: `/dashboard/artist/edit/${artwork.id}`, label: "Edit" },
      secondaryAction: { href: "/dashboard/artist", label: "Manage Listing" },
    };
  }

  if (artwork.status === "pending") {
    return {
      badge: { label: "Pending Review", dotClass: "active", color: "var(--color-accent-gold)" },
      priceLabel: `₹${artwork.price.toLocaleString("en-IN")}`,
      showAuctionMeta: false,
      primaryAction: { href: `/dashboard/artist/edit/${artwork.id}`, label: "Edit" },
      secondaryAction: { href: "/dashboard/artist", label: "Manage Listing" },
    };
  }

  if (artwork.status === "rejected") {
    return {
      badge: { label: "Rejected", dotClass: "active", color: "var(--color-status-urgency)" },
      priceLabel: `₹${artwork.price.toLocaleString("en-IN")}`,
      showAuctionMeta: false,
      primaryAction: { href: `/dashboard/artist/edit/${artwork.id}`, label: "Edit" },
      secondaryAction: { href: "/dashboard/artist", label: "Manage Listing" },
    };
  }

  if (artwork.status === "archived") {
    return {
      badge: { label: "Archived", dotClass: "active", color: "var(--color-on-surface-variant)" },
      priceLabel: `₹${artwork.price.toLocaleString("en-IN")}`,
      showAuctionMeta: false,
      primaryAction: { href: `/dashboard/artist/edit/${artwork.id}`, label: "Edit" },
      secondaryAction: { href: "/dashboard/artist", label: "Manage Listing" },
    };
  }

  if (artwork.listingType === "auction") {
    return {
      badge: { label: "Auction Listed", dotClass: "active", color: "var(--color-accent-gold)" },
      priceLabel: `₹${artwork.price.toLocaleString("en-IN")}`,
      priceCaption: "No active auction",
      showAuctionMeta: false,
      primaryAction: { href: "/bids", label: "Create Auction" },
      secondaryAction: { href: `/dashboard/artist/edit/${artwork.id}`, label: "Edit" },
    };
  }

  if (artwork.listingType === "not_for_sale") {
    return {
      badge: { label: "Not For Sale", dotClass: "active", color: "var(--color-on-surface-variant)" },
      priceLabel: "—",
      showAuctionMeta: false,
      primaryAction: { href: `/artwork/${artwork.id}`, label: "View Listing" },
      secondaryAction: { href: `/dashboard/artist/edit/${artwork.id}`, label: "Edit" },
    };
  }

  if (artwork.listingType === "commission") {
    return {
      badge: { label: "Commission", dotClass: "active", color: "var(--color-accent-emerald)" },
      priceLabel: artwork.price > 0 ? `₹${artwork.price.toLocaleString("en-IN")}` : "On request",
      showAuctionMeta: false,
      primaryAction: { href: `/artwork/${artwork.id}`, label: "View Listing" },
      secondaryAction: { href: `/dashboard/artist/edit/${artwork.id}`, label: "Manage Listing" },
    };
  }

  // published fixed_price (default sale listing)
  return {
    badge: { label: "For Sale", dotClass: "active", color: "var(--color-accent-emerald)" },
    priceLabel: `₹${artwork.price.toLocaleString("en-IN")}`,
    showAuctionMeta: false,
    primaryAction: { href: `/artwork/${artwork.id}`, label: "View Listing" },
    secondaryAction: { href: `/dashboard/artist/edit/${artwork.id}`, label: "Manage Listing" },
  };
}

function sortSellerArtworks(artworks: Artwork[], activeAuctions: Auction[]): Artwork[] {
  const activeArtworkIds = new Set(activeAuctions.map((a) => a.artworkId));
  return [...artworks].sort((a, b) => {
    const aActive = activeArtworkIds.has(a.id) ? 1 : 0;
    const bActive = activeArtworkIds.has(b.id) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function getAuctionAlertDetail(auction: Auction): { headline: string; detail: string } {
  const reserveMet =
    !auction.reservePrice || auction.currentBid >= auction.reservePrice;
  if (!reserveMet) {
    return {
      headline: "Reserve price not yet met",
      detail: `Current bid: ₹${auction.currentBid.toLocaleString("en-IN")} / Reserve: ₹${auction.reservePrice!.toLocaleString("en-IN")}`,
    };
  }
  if (auction.totalBids > 0) {
    return {
      headline: `Current bid: ₹${auction.currentBid.toLocaleString("en-IN")}`,
      detail: `${auction.totalBids} bid${auction.totalBids !== 1 ? "s" : ""} received`,
    };
  }
  return {
    headline: "Awaiting first bid",
    detail: `Starting at ₹${auction.startPrice.toLocaleString("en-IN")}`,
  };
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

function StatusBadge({ label, dotClass, color }: { label: string; dotClass: "pulse" | "active"; color?: string }) {
  return (
    <div className="status-badge">
      <div
        className={`status-dot ${dotClass}`}
        style={color ? { backgroundColor: color } : undefined}
        role="img"
        aria-label={`Status: ${label}`}
      />
      <span className="text-label-sm text-primary">{label}</span>
    </div>
  );
}

function SellerArtworkCard({
  artwork,
  activeAuctions,
}: {
  artwork: Artwork;
  activeAuctions: Auction[];
}) {
  const model = getSellerArtworkCardModel(artwork, activeAuctions);

  return (
    <article className="auction-card">
      <div className="auction-img-wrap">
        <StatusBadge label={model.badge.label} dotClass={model.badge.dotClass} color={model.badge.color} />
        <Link href={`/artwork/${artwork.id}`} style={{ display: "block", position: "absolute", inset: 0 }}>
          <Image
            src={getArtworkImageUrl(artwork)}
            alt={artwork.title}
            fill
            sizes="(max-width: 640px) 100vw, 300px"
            style={{ objectFit: "cover" }}
          />
        </Link>
      </div>
      <div className="auction-info">
        <div className="auction-title-row">
          <h3 className="text-headline-sm text-primary auction-title">{artwork.title}</h3>
          <span className="text-headline-sm text-accent-gold shrink-0">{model.priceLabel}</span>
        </div>
        {model.showAuctionMeta && model.priceCaption ? (
          <p className="text-label-sm text-on-surface-variant" style={{ marginTop: 4 }}>
            {model.priceCaption}
          </p>
        ) : model.priceCaption ? (
          <p className="text-label-sm text-on-surface-variant" style={{ marginTop: 4 }}>
            {model.priceCaption}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Link
            href={model.primaryAction.href}
            className={model.showAuctionMeta ? "auction-btn" : "btn btn-primary"}
            style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: model.showAuctionMeta ? undefined : "8px 12px", fontSize: model.showAuctionMeta ? undefined : 13 }}
          >
            {model.primaryAction.label}
          </Link>
          {model.secondaryAction ? (
            <Link
              href={model.secondaryAction.href}
              className="btn btn-outline"
              style={{ flex: 1, padding: "8px 12px", fontSize: 13, textAlign: "center", textDecoration: "none" }}
            >
              {model.secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// ── Seller Dashboard Home ────────────────────────────────────
function SellerHomePage() {
  const { user } = useAuthStore();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [allAuctions, setAllAuctions] = useState<Auction[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [artworkResult, auctions, organizerEvents] = await Promise.all([
        getArtworksByArtist(user.id, 20),
        getAllAuctionsByArtist(user.id),
        getEventsByOrganizer(user.id),
      ]);
      setArtworks(artworkResult.data.filter((a) => a.status !== "archived"));
      setAllAuctions(auctions);
      setEvents(
        organizerEvents
          .filter((e) => e.status === "upcoming")
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 2)
      );
    } catch (error) {
      console.error("Failed to load seller home data", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = computeSellerAuctionStats(allAuctions);
  const activeAuctions = allAuctions.filter((a) =>
    ACTIVE_AUCTION_STATUSES.includes(a.status as (typeof ACTIVE_AUCTION_STATUSES)[number])
  );
  const displayedArtworks = sortSellerArtworks(artworks, activeAuctions).slice(0, 2);
  const tickerText = buildSellerTicker(activeAuctions, events);

  const statItems = [
    { label: "Listed Artworks", value: String(user?.artworkCount ?? 0), icon: "palette", color: "var(--color-primary)" },
    { label: "Active Auctions", value: String(stats.activeCount), icon: "gavel", color: "var(--color-accent-gold)" },
    {
      label: "Total Sales",
      value: formatRevenue(user?.totalRevenue ?? stats.revenue),
      icon: "payments",
      color: "var(--color-accent-emerald)",
    },
    { label: "Followers", value: String(user?.followerCount ?? 0), icon: "group", color: "var(--color-accent-terracotta)" },
  ];

  return (
    <>
      <div className="ticker-bar">
        <div className="container ticker-inner">
          <span className="text-label-sm ticker-label">Seller Updates</span>
          <div className="ticker-scroll-area" aria-live="polite">
            <div className="ticker-content text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
              {tickerText}
            </div>
          </div>
        </div>
      </div>

      <section className="container" style={{ paddingTop: 48, paddingBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span className="text-label-sm" style={{ color: "var(--color-accent-gold)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Seller Dashboard
            </span>
            <h1 className="text-display-lg text-primary" style={{ marginTop: 8 }}>
              Welcome back, {user?.displayName?.split(" ")[0] ?? "Artist"}
            </h1>
            <p className="text-body-lg text-on-surface-variant" style={{ marginTop: 8 }}>
              {activeAuctions.length > 0
                ? "Manage your artworks, track live bids, and grow your presence on KalaSetu."
                : "Manage your listings, track sales, and grow your presence on KalaSetu."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/marketplace" className="btn btn-outline">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>storefront</span>
              View Market
            </Link>
            <Link href="/dashboard/artist" className="btn btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              List Artwork
            </Link>
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
          {statItems.map((stat) => (
            <div key={stat.label} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: stat.color }}>{stat.icon}</span>
              <span className="text-display-sm text-primary" style={{ fontWeight: 700 }}>{stat.value}</span>
              <span className="text-label-sm text-on-surface-variant uppercase">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 80 }}>
        <div className="split-layout">
          <div className="flex flex-col gap-32">
            <div className="section-header" style={{ marginBottom: 0 }}>
              <h2 className="text-headline-lg text-primary">My Listed Artworks</h2>
              <Link href="/dashboard/artist" className="section-link">
                Manage All <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>
            {isLoading ? (
              <div className="auction-grid">
                {[1, 2].map((i) => (
                  <div key={i} className="auction-card skeleton" style={{ height: 320 }} />
                ))}
              </div>
            ) : displayedArtworks.length > 0 ? (
              <div className="auction-grid">
                {displayedArtworks.map((item) => (
                  <SellerArtworkCard key={item.id} artwork={item} activeAuctions={activeAuctions} />
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "32px 0" }}>
                <p className="text-body-md text-on-surface-variant">No listed artworks yet.</p>
                <Link href="/dashboard/artist" className="btn btn-primary" style={{ marginTop: 16 }}>
                  List Your First Artwork
                </Link>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-48">
            {activeAuctions.length > 0 ? (
              <div>
                <div className="panel-header">
                  <span className="material-symbols-outlined text-accent-gold">gavel</span>
                  <h2 className="text-headline-md text-primary">Active Bid Alerts</h2>
                </div>
                {isLoading ? (
                  <div className="flex flex-col gap-16">
                    {[1, 2].map((i) => (
                      <div key={i} className="thread-item skeleton" style={{ height: 80 }} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-16">
                    {activeAuctions.slice(0, 2).map((auction, index) => {
                      const alert = getAuctionAlertDetail(auction);
                      return (
                        <Link
                          key={auction.id}
                          href={`/artwork/${auction.artworkId}`}
                          className={`thread-item ${index === 0 ? "active-thread" : "inactive-thread"}`}
                          style={{ textDecoration: "none" }}
                        >
                          <span className="text-caption text-on-surface-variant" style={{ display: "block", marginBottom: 4 }}>
                            {auction.artworkTitle} • {formatAuctionTime(auction)}
                          </span>
                          <h4 className="text-headline-sm text-primary">{alert.headline}</h4>
                          <p className="text-body-md text-on-surface-variant">{alert.detail}</p>
                        </Link>
                      );
                    })}
                  </div>
                )}
                <Link href="/bids" className="btn btn-outline" style={{ marginTop: 16, width: "100%", textAlign: "center" }}>
                  Manage All Auctions
                </Link>
              </div>
            ) : null}

            <div className="kalent-box">
              <div className="panel-header">
                <span className="material-symbols-outlined text-accent-emerald">event</span>
                <h2 className="text-headline-md text-primary">My Events</h2>
              </div>
              {isLoading ? (
                <div className="flex flex-col gap-16">
                  {[1, 2].map((i) => (
                    <div key={i} className="event-item skeleton" style={{ height: 64 }} />
                  ))}
                </div>
              ) : events.length > 0 ? (
                <div className="flex flex-col gap-16">
                  {events.map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`} className="event-item" style={{ textDecoration: "none" }}>
                      <EventDateBox dateStr={event.startDate} />
                      <div>
                        <h4 className="text-label-md text-primary" style={{ textTransform: "none" }}>{event.title}</h4>
                        <p className="text-caption text-on-surface-variant" style={{ marginTop: 4 }}>
                          {event.mode === "online" ? "Virtual" : event.city ?? "In Person"} • {event.registrationCount} Registered
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-body-md text-on-surface-variant">No upcoming events.</p>
              )}
              <Link href="/events" className="btn btn-outline" style={{ marginTop: 16, width: "100%", textAlign: "center" }}>
                Create New Event
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ── Root Client — Role Switch ────────────────────────────────
export default function HomeClient({ initialData }: { initialData: HomeBuyerData }) {
  const { isArtist } = useAuthStore();
  const showSeller = isArtist();

  return showSeller ? <SellerHomePage /> : <BuyerHomePage initialData={initialData} />;
}
