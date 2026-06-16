'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getActiveAuctions } from "@/lib/services/auction-service";
import type { Auction } from "@/app/types";
import { formatDistanceToNow } from "date-fns";

export default function BidsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAuctions() {
      try {
        const result = await getActiveAuctions(10);
        setAuctions(result.data);
      } catch (error) {
        console.error("Failed to load auctions", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuctions();
  }, []);

  return (
    <>
      <div className="bg-surface-container border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container py-8 flex flex-col gap-16" style={{ padding: "48px var(--margin-desktop) 32px" }}>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-display-lg text-primary">Live Bidding</h1>
              <p className="text-body-lg text-on-surface-variant mt-2" style={{ marginTop: 8 }}>
                Participate in real-time auctions for exclusive, authenticated masterworks.
              </p>
            </div>
            <div className="flex flex-col items-end gap-8">
              <span className="text-label-sm text-on-surface-variant uppercase">Your Bidding Power</span>
              <span className="text-headline-md text-primary">₹5,00,000</span>
            </div>
          </div>
        </div>
      </div>

      <section className="container section-gap">
        <div style={{ display: "grid", gridTemplateColumns: "8fr 4fr", gap: 64 }}>
          {/* Main Content */}
          <div className="flex flex-col gap-32">
            <h2 className="text-headline-md text-primary">Active Auctions</h2>
            
            {isLoading ? (
              <div className="flex flex-col gap-24">
                {[1, 2].map((i) => (
                  <div key={i} className="card" style={{ padding: 24 }}>
                    <div className="flex gap-24">
                      <div className="skeleton" style={{ width: 180, height: 180, borderRadius: "var(--radius-md)", flexShrink: 0 }} />
                      <div className="flex flex-col grow gap-16">
                        <div className="skeleton" style={{ width: "60%", height: 32 }} />
                        <div className="skeleton" style={{ width: "40%", height: 20 }} />
                        <div className="skeleton" style={{ width: "100%", height: 80, marginTop: "auto" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : auctions.length > 0 ? (
              <div className="flex flex-col gap-24">
                {auctions.map((auction) => (
                  <div key={auction.id} className="card" style={{ padding: 24 }}>
                    <div className="flex gap-24">
                      <div style={{ width: 180, height: 180, borderRadius: "var(--radius-md)", overflow: "hidden", flexShrink: 0 }}>
                        <Link href={`/bids/${auction.id}`}>
                          <img 
                            src={auction.artworkImageUrl || "https://placehold.co/400x400"} 
                            alt={auction.artworkTitle} 
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                          />
                        </Link>
                      </div>
                      <div className="flex flex-col grow">
                        <div className="flex justify-between items-start" style={{ marginBottom: 8 }}>
                          <Link href={`/bids/${auction.id}`}>
                            <h3 className="text-headline-sm text-primary hover:underline">{auction.artworkTitle}</h3>
                          </Link>
                          <div className="verified-badge">
                            <div className="status-dot pulse" style={{ marginRight: 4 }} /> Live
                          </div>
                        </div>
                        <p className="text-body-md text-on-surface-variant mb-4">
                          By {auction.artistName}
                        </p>
                        
                        <div className="mt-auto grid grid-cols-2 gap-16" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: "auto" }}>
                          <div className="bg-surface-container-low p-4 rounded" style={{ padding: 16, borderRadius: 4 }}>
                            <span className="text-caption text-on-surface-variant block uppercase">Current Bid</span>
                            <span className="text-price-lg text-primary">₹{auction.currentBid.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="bg-surface-container-low p-4 rounded" style={{ padding: 16, borderRadius: 4 }}>
                            <span className="text-caption text-on-surface-variant block uppercase">Time Remaining</span>
                            <span className="text-headline-md text-status-urgency">
                              {formatDistanceToNow(new Date(auction.endsAt))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>
                  gavel
                </span>
                <p className="text-body-lg text-on-surface-variant">
                  No active auctions at the moment. Check back soon.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-32">
            <div className="card" style={{ padding: 24, backgroundColor: "var(--color-surface-container-lowest)" }}>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Bid Analytics</h3>
              <ul className="flex flex-col gap-16">
                <li className="flex justify-between border-b border-outline-variant pb-2">
                  <span className="text-body-md text-on-surface-variant">Win Rate</span>
                  <span className="text-body-md text-primary font-bold">68%</span>
                </li>
                <li className="flex justify-between border-b border-outline-variant pb-2">
                  <span className="text-body-md text-on-surface-variant">Active Bids</span>
                  <span className="text-body-md text-primary font-bold">2</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-body-md text-on-surface-variant">Won Items</span>
                  <span className="text-body-md text-primary font-bold">14</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
