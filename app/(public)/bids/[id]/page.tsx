'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getAuction, subscribeToAuction, subscribeToAuctionBids, placeBid } from "@/lib/services/auction-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import type { Auction, Bid } from "@/app/types";
import { formatDistanceToNow, format } from "date-fns";

export default function AuctionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;
  
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [isPlacingBid, setIsPlacingBid] = useState(false);

  useEffect(() => {
    if (!auctionId) return;

    // Load initial data
    getAuction(auctionId)
      .then((data) => {
        if (data) {
          setAuction(data);
          // Set initial bid suggestion (current + increment)
          const nextBid = data.currentBid + data.minIncrement;
          setBidAmount(nextBid.toString());
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load auction", error);
        setIsLoading(false);
      });

    // Subscriptions for real-time updates
    const unsubAuction = subscribeToAuction(auctionId, (updatedAuction) => {
      if (updatedAuction) {
        setAuction(updatedAuction);
        // Only update bid amount input if they haven't typed anything higher
        const nextBid = updatedAuction.currentBid + updatedAuction.minIncrement;
        setBidAmount((prev) => {
          if (!prev || Number(prev) < nextBid) return nextBid.toString();
          return prev;
        });
      }
    });

    const unsubBids = subscribeToAuctionBids(auctionId, (newBids) => {
      setBids(newBids);
    });

    return () => {
      unsubAuction();
      unsubBids();
    };
  }, [auctionId]);

  async function handlePlaceBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      addToast({ type: 'error', title: 'Authentication Required', message: 'Please log in to place a bid.' });
      router.push('/login');
      return;
    }
    
    if (!auction) return;
    
    const amount = Number(bidAmount);
    if (isNaN(amount)) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid number.' });
      return;
    }
    
    if (amount < auction.currentBid + auction.minIncrement) {
      addToast({ 
        type: 'error', 
        title: 'Bid Too Low', 
        message: `Minimum bid is ₹${(auction.currentBid + auction.minIncrement).toLocaleString('en-IN')}` 
      });
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
    } catch (error: any) {
      addToast({ type: 'error', title: 'Bid Failed', message: error.message || 'Could not place bid.' });
    } finally {
      setIsPlacingBid(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container section-gap flex justify-center py-64">
        <div className="skeleton" style={{ width: "100%", height: 600, borderRadius: "var(--radius-lg)" }} />
      </div>
    );
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
            <div className="bg-surface-container-low" style={{ width: "100%", aspectRatio: "1/1", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
              <Link href={`/artwork/${auction.artworkId}`}>
                <img 
                  src={auction.artworkImageUrl || "https://placehold.co/800x800"} 
                  alt={auction.artworkTitle}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--color-on-surface-variant)", fontWeight: 600 }}>₹</span>
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{ paddingLeft: 32, fontSize: 18, fontWeight: 600 }}
                        min={auction.currentBid + auction.minIncrement}
                        step={auction.minIncrement}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        required
                        disabled={isPlacingBid}
                      />
                    </div>
                    <span className="text-caption text-on-surface-variant mt-4 block">
                      Enter ₹{(auction.currentBid + auction.minIncrement).toLocaleString('en-IN')} or more
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
