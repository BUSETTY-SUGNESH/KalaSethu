"use client";

import Link from "next/link";
import Image from "next/image";
import type { Auction, AuctionStatus } from "@/app/types";
import { ARTWORK_PLACEHOLDER } from "@/lib/constants/placeholders";
import AuctionCountdown from "./AuctionCountdown";

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

export default function HomeAuctionCard({ auction }: { auction: Auction }) {
  const statusBadge = getAuctionStatusBadge(auction);
  const isUrgent =
    new Date(auction.endsAt).getTime() - Date.now() < 6 * 60 * 60 * 1000 &&
    new Date(auction.endsAt).getTime() > Date.now();

  return (
    <article className="auction-card home-auction-card">
      <div className="auction-img-wrap">
        <div className="status-badge">
          <div className={`status-dot ${statusBadge.dotClass}`} aria-label={`Status: ${statusBadge.label}`} />
          <span className="text-label-sm text-primary">{statusBadge.label}</span>
        </div>
        <Link href={`/bids/${auction.id}`} style={{ display: "block", position: "absolute", inset: 0 }}>
          <Image
            src={auction.artworkImageUrl || ARTWORK_PLACEHOLDER}
            alt={auction.artworkTitle}
            fill
            sizes="(max-width: 640px) 85vw, 320px"
            style={{ objectFit: "cover" }}
          />
        </Link>
      </div>
      <div className="auction-info">
        <div className="auction-title-row">
          <Link href={`/bids/${auction.id}`}>
            <h3 className="text-headline-sm text-primary auction-title">{auction.artworkTitle}</h3>
          </Link>
          <span className="text-headline-sm text-accent-gold shrink-0">
            ₹{auction.currentBid.toLocaleString("en-IN")}
          </span>
        </div>
        <p className="text-label-sm text-on-surface-variant auction-author uppercase">{auction.artistName}</p>
        <div className="home-auction-meta">
          <div className="home-auction-countdown" data-urgent={isUrgent || undefined}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>timer</span>
            <AuctionCountdown endsAt={auction.endsAt} className="text-label-md text-status-urgency" />
          </div>
          <span className="text-caption text-on-surface-variant">
            {auction.totalBids} bid{auction.totalBids !== 1 ? "s" : ""}
          </span>
        </div>
        <Link
          href={`/bids/${auction.id}`}
          className="auction-btn"
          style={{ textDecoration: "none", display: "block", textAlign: "center" }}
        >
          Place Bid
        </Link>
      </div>
    </article>
  );
}
