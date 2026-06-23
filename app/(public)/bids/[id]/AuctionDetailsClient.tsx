'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { subscribeToAuction, subscribeToAuctionBids, placeBid } from "@/lib/services/auction-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import type { Auction, Bid } from "@/app/types";
import { formatDistanceToNow, format } from "date-fns";

export default function AuctionDetailsClient({
  initialAuction,
  initialBids
}: {
  initialAuction: Auction | null;
  initialBids: Bid[];
}) {
  const router = useRouter();
  
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [auction, setAuction] = useState<Auction | null>(initialAuction);
  const [bids, setBids] = useState<Bid[]>(initialBids);
  
  // ── Bid input state ──────────────────────────────────────────
  const initialBidAmount = initialAuction
    ? (initialAuction.currentBid + initialAuction.minIncrement).toString()
    : "";
  const [bidAmount, setBidAmount] = useState<string>(initialBidAmount);

  // ── Focus tracking (ref = no re-renders) ────────────────────
  // When true the subscription will not overwrite the user's input.
  const isBidInputFocused = useRef<boolean>(false);

  // ── Stale-bid banner state ───────────────────────────────────
  // Set when a real-time update arrives while the input is focused.
  // Holds the new minimum bid the user should be aware of.
  const [staleMinBid, setStaleMinBid] = useState<number | null>(null);

  const [isPlacingBid, setIsPlacingBid] = useState(false);

  // ── Real-time subscriptions ──────────────────────────────────
  useEffect(() => {
    if (!initialAuction) return;
    const auctionId = initialAuction.id;

    const unsubAuction = subscribeToAuction(auctionId, (updatedAuction) => {
      if (!updatedAuction) return;

      setAuction(updatedAuction);

      const nextMinBid = updatedAuction.currentBid + updatedAuction.minIncrement;

      if (isBidInputFocused.current) {
        // ✋ Input is focused — user is actively editing.
        // Do NOT overwrite their value. Instead, raise the stale-bid
        // banner so they're informed without losing their work.
        setStaleMinBid(nextMinBid);
      } else {
        // Input is idle — safe to auto-update to the latest minimum.
        setBidAmount((prev) => {
          if (!prev || Number(prev) < nextMinBid) return nextMinBid.toString();
          return prev;
        });
        // Clear any lingering banner if the field was idle when the update arrived.
        setStaleMinBid(null);
      }
    });

    const unsubBids = subscribeToAuctionBids(auctionId, (newBids) => {
      setBids(newBids);
    });

    return () => {
      unsubAuction();
      unsubBids();
    };
  }, [initialAuction]);

  // ── Focus handlers ───────────────────────────────────────────
  const handleInputFocus = useCallback(() => {
    isBidInputFocused.current = true;
  }, []);

  const handleInputBlur = useCallback(() => {
    isBidInputFocused.current = false;
    // When focus leaves, auto-correct to the latest minimum if the
    // user left a value that is now below the threshold.
    if (auction) {
      const nextMinBid = auction.currentBid + auction.minIncrement;
      setBidAmount((prev) => {
        if (!prev || Number(prev) < nextMinBid) return nextMinBid.toString();
        return prev;
      });
    }
    // Banner is no longer needed once the field is idle and auto-corrected.
    setStaleMinBid(null);
  }, [auction]);

  // ── "Update Bid" action from the stale-bid banner ────────────
  const handleUpdateToCurrent = useCallback(() => {
    if (!auction) return;
    const nextMinBid = auction.currentBid + auction.minIncrement;
    setBidAmount(nextMinBid.toString());
    setStaleMinBid(null);
    // Return focus to the input so the user can review / adjust
    // before submitting.
    document.getElementById('bid-amount-input')?.focus();
  }, [auction]);

  // ── Dismiss banner without changing input ────────────────────
  const handleDismissBanner = useCallback(() => {
    setStaleMinBid(null);
  }, []);

  // ── Bid submission ───────────────────────────────────────────
  async function handlePlaceBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      addToast({ type: 'error', title: 'Authentication Required', message: 'Please log in to place a bid.' });
      router.push('/login');
      return;
    }
    
    if (!auction) return;
    
    const amount = Number(bidAmount);
    if (isNaN(amount) || !bidAmount.trim()) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid number.' });
      return;
    }

    // Always validate against the LIVE auction state, not the
    // state at the time the user started typing — the backend
    // is the final authority, but we surface errors early.
    const liveMinimum = auction.currentBid + auction.minIncrement;
    if (amount < liveMinimum) {
      addToast({ 
        type: 'error', 
        title: 'Bid Too Low', 
        message: `The current minimum bid is ₹${liveMinimum.toLocaleString('en-IN')}. Please update your amount.`
      });
      // Auto-fill the minimum so the user can quickly resubmit
      setBidAmount(liveMinimum.toString());
      setStaleMinBid(null);
      return;
    }

    setIsPlacingBid(true);
    try {
      await placeBid({
        auctionId: auction.id,
        bidderId: user.id,
        bidderName: user.displayName,
        amount: amount,
      });
      addToast({ type: 'success', title: 'Bid Placed!', message: `Your bid of ₹${amount.toLocaleString('en-IN')} was successful.` });
      setStaleMinBid(null);
    } catch (error: any) {
      console.error("Bid error:", error);
      
      let errorMessage = error.message || 'Could not place bid. Please try again.';
      let title = 'Bid Failed';
      if (error.code === 'functions/unauthenticated') {
        title = 'Authentication Error';
      } else if (error.code === 'functions/failed-precondition') {
        title = 'Action Not Allowed';
      }

      addToast({ type: 'error', title, message: errorMessage });
    } finally {
      setIsPlacingBid(false);
    }
  }

  if (!auction) {
    return (
      <div className="container section-gap empty-state">
        <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>gavel</span>
        <h1 className="text-display-sm text-primary">Auction Not Found</h1>
        <p className="text-body-lg text-on-surface-variant">This auction doesn't exist or has ended.</p>
        <Link href="/bids">
          <Button variant="primary" style={{ marginTop: 24 }}>View Active Auctions</Button>
        </Link>
      </div>
    );
  }

  const isEnded = auction.status === 'ended' || new Date(auction.endsAt).getTime() < Date.now();
  const liveMinimum = auction.currentBid + auction.minIncrement;

  // ── Bidder status (Issue 3.3) ────────────────────────────────
  // Derived entirely from state already on the page — zero extra queries.
  // bids[0] is the highest bid (subscribeToAuctionBids orders by amount DESC).
  // Artists are excluded from bidder-status messaging per role-based spec.
  const isCustomer = !!user && user.role !== 'artist' && user.role !== 'verified_artist';
  const topBid = bids[0] ?? null;
  const isUserLeading = isCustomer && !isEnded && !!topBid && topBid.bidderId === user?.id;
  const isUserOutbid  = isCustomer && !isEnded && !!topBid && topBid.bidderId !== user?.id
                        && bids.some(b => b.bidderId === user?.id);
  const isUserWinner  = isCustomer && isEnded && !!auction.winnerId && auction.winnerId === user?.id;

  return (
    <>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="breadcrumb">
          <Link href="/bids">Live Bidding</Link>
          <Icon name="chevron_right" size={16} />
          <span className="current">{auction.artworkTitle}</span>
        </div>
      </div>

      <section className="container" style={{ paddingBottom: 80 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
          {/* Left Column: Image */}
          <div className="flex flex-col gap-16">
            {/* position:relative + display:block on Link required for next/image fill */}
            <div className="bg-surface-container-low" style={{ width: "100%", aspectRatio: "1/1", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid rgba(196, 199, 199, 0.2)", position: "relative" }}>
              <Link href={`/artwork/${auction.artworkId}`} style={{ display: "block", width: "100%", height: "100%" }}>
                <Image
                  src={auction.artworkImageUrl || "https://placehold.co/800x800"}
                  alt={auction.artworkTitle}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: "cover" }}
                />
              </Link>
            </div>
            <div className="text-center">
              <Link href={`/artwork/${auction.artworkId}`} className="text-label-md text-primary hover:underline">
                View Full Artwork Details <Icon name="open_in_new" size={14} className="align-middle" />
              </Link>
            </div>
          </div>

          {/* Right Column: Bidding Details */}
          <div className="flex flex-col gap-32">
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div className="flex items-center gap-8 text-label-md text-on-surface-variant uppercase">
                  {auction.artistName}
                  <Icon name="verified" size={16} className="text-accent-emerald" />
                </div>
                {isEnded ? (
                  <div className="verified-badge" style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }}>
                    Ended
                  </div>
                ) : (
                  <div className="verified-badge">
                    <div className="status-dot pulse" style={{ marginRight: 4 }} /> Live
                  </div>
                )}
              </div>

              <h1 className="text-display-lg text-primary" style={{ marginBottom: 16 }}>{auction.artworkTitle}</h1>
            </div>

            <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
                <div>
                  <span className="text-caption text-on-surface-variant block uppercase mb-4">Current Bid</span>
                  <span className="text-display-sm text-primary">₹{auction.currentBid.toLocaleString('en-IN')}</span>
                  {auction.totalBids > 0 && (
                    <span className="text-label-sm text-on-surface-variant block mt-4">{auction.totalBids} Bids</span>
                  )}

                  {/* ── Bidder status indicator (Issue 3.3) ──────────────
                      Derived from bids[] + auction.winnerId — no extra
                      queries. aria-live="polite" so screen readers pick up
                      real-time changes without interrupting the user. */}
                  {(isUserLeading || isUserOutbid || isUserWinner) && (
                    <div
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 10,
                        padding: '4px 10px',
                        borderRadius: 100,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        ...(isUserLeading ? {
                          backgroundColor: 'rgba(52, 199, 89, 0.12)',
                          color: 'var(--color-accent-emerald)',
                          border: '1px solid rgba(52, 199, 89, 0.25)',
                        } : isUserWinner ? {
                          backgroundColor: 'rgba(52, 199, 89, 0.15)',
                          color: 'var(--color-accent-emerald)',
                          border: '1px solid rgba(52, 199, 89, 0.3)',
                        } : /* outbid */ {
                          backgroundColor: 'rgba(212, 160, 23, 0.10)',
                          color: 'var(--color-accent-gold)',
                          border: '1px solid rgba(212, 160, 23, 0.25)',
                        })
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                        style={{ fontSize: 13, fontVariationSettings: "'wght' 600" }}
                      >
                        {isUserLeading || isUserWinner ? 'emoji_events' : 'trending_down'}
                      </span>
                      {isUserLeading && 'You are the highest bidder'}
                      {isUserWinner  && 'You won this auction'}
                      {isUserOutbid  && 'You have been outbid'}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-caption text-on-surface-variant block uppercase mb-4">
                    {isEnded ? "Ended On" : "Time Remaining"}
                  </span>
                  <span className={`text-display-sm ${isEnded ? "text-on-surface-variant" : "text-status-urgency"}`}>
                    {isEnded 
                      ? format(new Date(auction.endsAt), "MMM d, yyyy")
                      : formatDistanceToNow(new Date(auction.endsAt))
                    }
                  </span>
                </div>
              </div>

              {!isEnded && (
                <form onSubmit={handlePlaceBid} className="flex flex-col gap-16">

                  {/* ── Stale-bid banner ─────────────────────────────────
                      Shown only when a new bid arrives while the user is
                      actively editing the input. Non-intrusive: sits above
                      the field, does not reset or interrupt the user. */}
                  {staleMinBid !== null && (
                    <div
                      role="status"
                      aria-live="polite"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(212, 160, 23, 0.08)',
                        border: '1px solid rgba(212, 160, 23, 0.25)',
                        animation: 'fadeIn 0.2s var(--ease-default)',
                      }}
                    >
                      <div className="flex items-center gap-8">
                        <span style={{ color: 'var(--color-accent-gold)', flexShrink: 0, display: 'flex' }}>
                          <Icon name="trending_up" size={16} />
                        </span>
                        <span className="text-label-sm" style={{ color: 'var(--color-on-surface)' }}>
                          The bid has increased. New minimum:{' '}
                          <strong>₹{staleMinBid.toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-8" style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={handleUpdateToCurrent}
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: 'var(--color-secondary)',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            transition: 'background-color var(--duration-fast) var(--ease-default)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Update Bid
                        </button>
                        <button
                          type="button"
                          aria-label="Dismiss bid update notice"
                          onClick={handleDismissBanner}
                          style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1, display: 'flex' }}
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--color-on-surface-variant)", fontWeight: 600 }}>₹</span>
                      <input
                        id="bid-amount-input"
                        type="number"
                        className="form-input"
                        style={{ paddingLeft: 32, fontSize: 18, fontWeight: 600 }}
                        min={liveMinimum}
                        step={auction.minIncrement}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        required
                        disabled={isPlacingBid}
                        aria-label="Your bid amount in rupees"
                        aria-describedby="bid-minimum-hint"
                      />
                    </div>
                    <span id="bid-minimum-hint" className="text-caption text-on-surface-variant mt-4 block">
                      Enter ₹{liveMinimum.toLocaleString('en-IN')} or more
                    </span>
                  </div>
                  <Button variant="primary" size="lg" fullWidth type="submit" disabled={isPlacingBid}>
                    {isPlacingBid ? "Placing Bid..." : "Place Bid"}
                  </Button>
                </form>
              )}
              
              {isEnded && auction.winnerId && (
                <div className="bg-surface-container-low p-4 rounded text-center" style={{ padding: 16, borderRadius: 8 }}>
                  <span className="text-label-md text-primary font-bold">Auction Won</span>
                  <p className="text-body-sm text-on-surface-variant mt-2">This item has been sold to the highest bidder.</p>
                </div>
              )}
            </div>

            {/* Bid History */}
            <div>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Bid History</h3>
              {bids.length > 0 ? (
                <div className="bg-surface-container-lowest" style={{ borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)", overflow: "hidden" }}>
                  <ul className="flex flex-col">
                    {bids.map((bid, i) => (
                      <li key={bid.id} className="flex justify-between items-center" style={{ padding: "16px 24px", borderBottom: i < bids.length - 1 ? "1px solid rgba(196, 199, 199, 0.1)" : "none" }}>
                        <div className="flex items-center gap-12">
                          <div className="avatar avatar-sm" style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                            <span className="text-caption font-bold" style={{ color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                              {bid.bidderName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-label-md text-on-surface block">
                              {user?.id === bid.bidderId ? "You" : `${bid.bidderName.substring(0, 2)}***`}
                            </span>
                            <span className="text-caption text-on-surface-variant">
                              {format(new Date(bid.timestamp), "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                        <span className="text-body-md text-primary font-bold">₹{bid.amount.toLocaleString('en-IN')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-body-md text-on-surface-variant italic">No bids placed yet. Be the first!</div>
              )}
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
