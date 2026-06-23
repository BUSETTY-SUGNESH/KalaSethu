'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getActiveAuctions } from "@/lib/services/auction-service";
import type { Auction } from "@/app/types";
import { formatDistanceToNow } from "date-fns";

export default function SellerBidsClient() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

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
      {/* Header */}
      <div className="bg-surface-container border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container py-8 flex flex-col gap-16" style={{ padding: "48px var(--margin-desktop) 32px" }}>
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-8" style={{ color: "var(--color-accent-gold)", marginBottom: 12 }}>
                <Icon name="gavel" size={28} />
                <span className="text-label-md uppercase tracking-wider">Seller Auction Hub</span>
              </div>
              <h1 className="text-display-lg text-primary">Manage Your Auctions</h1>
              <p className="text-body-lg text-on-surface-variant" style={{ marginTop: 8 }}>
                Create new auctions, track live bids, and manage your active listings.
              </p>
            </div>
            <Button variant="primary" size="lg" icon="add" iconPosition="left" onClick={() => setShowCreateForm(true)}>
              Create Auction
            </Button>
          </div>
        </div>
      </div>

      {/* Create Auction Form (inline panel) */}
      {showCreateForm && (
        <div style={{ backgroundColor: "var(--color-surface-container-low)", borderBottom: "1px solid rgba(196,199,199,0.2)" }}>
          <div className="container" style={{ padding: "32px var(--margin-desktop)" }}>
            <div className="card" style={{ padding: 32, maxWidth: 720 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
                <h2 className="text-headline-md text-primary">Create New Auction</h2>
                <button onClick={() => setShowCreateForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <Icon name="close" size={24} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Select Artwork</label>
                  <select style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }}>
                    <option>Pahari Miniature: Radha & Krishna</option>
                    <option>Harappan Terracotta Vessel</option>
                    <option>Bronze Nataraja (Commission)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Auction Type</label>
                  <select style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }}>
                    <option>Timed Auction</option>
                    <option>Live Auction</option>
                  </select>
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Starting Price (₹)</label>
                  <input type="number" placeholder="e.g. 50000" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Reserve Price (₹) — Optional</label>
                  <input type="number" placeholder="e.g. 80000" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Minimum Bid Increment (₹)</label>
                  <input type="number" placeholder="e.g. 5000" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Auto-extend on Late Bids</label>
                  <select style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }}>
                    <option>5 minutes</option>
                    <option>10 minutes</option>
                    <option>No extension</option>
                  </select>
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Auction Start</label>
                  <input type="datetime-local" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Auction End</label>
                  <input type="datetime-local" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <Button variant="primary" size="md">Launch Auction</Button>
                <Button variant="outline" size="md" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seller Auction Stats */}
      <section className="container" style={{ paddingTop: 40, paddingBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {[
            { label: "Active Auctions", value: "3", icon: "gavel", color: "var(--color-accent-gold)" },
            { label: "Total Bids Received", value: "47", icon: "trending_up", color: "var(--color-primary)" },
            { label: "Auctions Won by Buyers", value: "14", icon: "emoji_events", color: "var(--color-accent-emerald)" },
            { label: "Revenue from Bids", value: "₹8.2L", icon: "payments", color: "var(--color-accent-terracotta)" },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: stat.color }}>{stat.icon}</span>
              <span className="text-headline-md text-primary" style={{ fontWeight: 700 }}>{stat.value}</span>
              <span className="text-caption text-on-surface-variant uppercase">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Active Auctions List */}
      <section className="container section-gap">
        <div style={{ display: "grid", gridTemplateColumns: "8fr 4fr", gap: 64 }}>
          <div className="flex flex-col gap-32">
            <h2 className="text-headline-md text-primary">Your Active Auctions</h2>
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
                          <img src={auction.artworkImageUrl || "https://placehold.co/400x400"} alt={auction.artworkTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                        <p className="text-body-md text-on-surface-variant mb-4">By {auction.artistName}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "auto" }}>
                          <div className="bg-surface-container-low p-4 rounded" style={{ padding: 12, borderRadius: 4 }}>
                            <span className="text-caption text-on-surface-variant block uppercase">Current Bid</span>
                            <span className="text-price-lg text-primary">₹{auction.currentBid.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="bg-surface-container-low p-4 rounded" style={{ padding: 12, borderRadius: 4 }}>
                            <span className="text-caption text-on-surface-variant block uppercase">Total Bids</span>
                            <span className="text-headline-md text-primary">{auction.totalBids}</span>
                          </div>
                          <div className="bg-surface-container-low p-4 rounded" style={{ padding: 12, borderRadius: 4 }}>
                            <span className="text-caption text-on-surface-variant block uppercase">Time Left</span>
                            <span className="text-headline-md text-status-urgency">{formatDistanceToNow(new Date(auction.endsAt))}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                          <Link href={`/bids/${auction.id}`} className="btn btn-primary" style={{ fontSize: 13, padding: "8px 16px" }}>View Bids</Link>
                          <button className="btn btn-outline" style={{ fontSize: 13, padding: "8px 16px" }}>Edit Auction</button>
                          <button className="btn" style={{ fontSize: 13, padding: "8px 16px", color: "var(--color-status-urgency)", border: "1px solid var(--color-status-urgency)", background: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>gavel</span>
                <p className="text-body-lg text-on-surface-variant">You have no active auctions. Create one to get started!</p>
                <Button variant="primary" size="md" icon="add" iconPosition="left" onClick={() => setShowCreateForm(true)} style={{ marginTop: 16 }}>
                  Create Auction
                </Button>
              </div>
            )}
          </div>

          {/* Seller Sidebar */}
          <div className="flex flex-col gap-32">
            <div className="card" style={{ padding: 24, backgroundColor: "var(--color-surface-container-lowest)" }}>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Auction Tips</h3>
              <ul className="flex flex-col gap-12">
                {[
                  "Set a reserve price to protect your minimum value.",
                  "Enable auto-extend to prevent last-second sniping.",
                  "Upload multiple high-res images to attract more bids.",
                  "Share your auction on CharchaSabha to boost visibility.",
                ].map((tip, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-accent-gold)", flexShrink: 0, marginTop: 1 }}>lightbulb</span>
                    <span className="text-body-md text-on-surface-variant">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card" style={{ padding: 24, backgroundColor: "var(--color-surface-container-lowest)" }}>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Completed Auctions</h3>
              <ul className="flex flex-col gap-16">
                <li className="flex justify-between border-b border-outline-variant pb-2">
                  <span className="text-body-md text-on-surface-variant">Total Completed</span>
                  <span className="text-body-md text-primary font-bold">14</span>
                </li>
                <li className="flex justify-between border-b border-outline-variant pb-2">
                  <span className="text-body-md text-on-surface-variant">Avg. Final Bid</span>
                  <span className="text-body-md text-primary font-bold">₹58,000</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-body-md text-on-surface-variant">Highest Sale</span>
                  <span className="text-body-md text-accent-gold font-bold">₹4,50,000</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
