'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import type { Auction, AuctionStatus } from "@/app/types";
import { formatDistanceToNow } from "date-fns";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  getUserBidAnalytics,
  getUserBids,
  getAuctionsByIds,
  EMPTY_BID_ANALYTICS,
  normalizeBidAnalytics,
  BID_CHANGED_EVENT,
  type BidAnalytics,
} from "@/lib/services/auction-service";
import SellerBidsClient from "./SellerBidsClient";

export default function BidsClient({ initialAuctions }: { initialAuctions: Auction[] }) {
  const [auctions, setAuctions] = useState<Auction[]>(initialAuctions);
  const { user, isArtist, firebaseUser, isLoading: authLoading } = useAuthStore();

  // isArtist check moved to the bottom to avoid breaking React hook rules

  const [analytics, setAnalytics] = useState<BidAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Issue 2.2: My Active Bids tracking state
  const [activeTab, setActiveTab] = useState<'all' | 'my_bids'>('all');
  const [myBidsData, setMyBidsData] = useState<{ auction: Auction, userMaxBid: number }[]>([]);
  const [loadingMyBids, setLoadingMyBids] = useState(false);
  const [myBidsError, setMyBidsError] = useState<string | null>(null);
  const myBidsInitialLoad = useRef(true);

  // Tab indicator state
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    function updateIndicator() {
      const activeIndex = activeTab === 'all' ? 0 : 1;
      if (tabRefs.current[activeIndex]) {
        const activeEl = tabRefs.current[activeIndex]!;
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1
        });
      }
    }

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    const timeout = setTimeout(updateIndicator, 100);
    return () => {
      window.removeEventListener('resize', updateIndicator);
      clearTimeout(timeout);
    };
  }, [activeTab, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !firebaseUser) {
      setAnalytics(null);
      setLoadingAnalytics(false);
      return;
    }

    if (user.role === 'artist' || user.role === 'verified_artist') {
      setLoadingAnalytics(false);
      return;
    }

    setLoadingAnalytics(true);
    getUserBidAnalytics()
      .then((data) => setAnalytics(normalizeBidAnalytics(data)))
      .catch(() => setAnalytics({ ...EMPTY_BID_ANALYTICS }))
      .finally(() => setLoadingAnalytics(false));
  }, [user, firebaseUser, authLoading]);

  const refreshAnalytics = useCallback(() => {
    if (!user || !firebaseUser || user.role === 'artist' || user.role === 'verified_artist') {
      return;
    }
    getUserBidAnalytics()
      .then((data) => setAnalytics(normalizeBidAnalytics(data)))
      .catch(() => setAnalytics({ ...EMPTY_BID_ANALYTICS }));
  }, [user, firebaseUser]);

  const loadMyBids = useCallback(async () => {
    if (!user || !firebaseUser) return;

    const showSpinner = myBidsInitialLoad.current;
    if (showSpinner) setLoadingMyBids(true);
    setMyBidsError(null);

    try {
      const result = await getUserBids(user.id, 50);
      const bids = result.data.filter((b) => b.auctionId);

      const auctionBidMap = new Map<string, number>();
      bids.forEach((b) => {
        const existingMax = auctionBidMap.get(b.auctionId) || 0;
        if (b.amount > existingMax) {
          auctionBidMap.set(b.auctionId, b.amount);
        }
      });

      const auctionIds = Array.from(auctionBidMap.keys());
      if (auctionIds.length > 0) {
        const fetchedAuctions = await getAuctionsByIds(auctionIds);
        fetchedAuctions.sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());

        setMyBidsData(fetchedAuctions.map((a) => ({
          auction: a,
          userMaxBid: auctionBidMap.get(a.id) || 0,
        })));
      } else {
        setMyBidsData([]);
      }

      myBidsInitialLoad.current = false;
    } catch {
      setMyBidsError('Unable to load your bids. Please try again.');
      setMyBidsData([]);
    } finally {
      setLoadingMyBids(false);
    }
  }, [user, firebaseUser]);

  // Reset my-bids state when account changes
  useEffect(() => {
    myBidsInitialLoad.current = true;
    setMyBidsData([]);
    setMyBidsError(null);
  }, [firebaseUser?.uid]);

  // Fetch My Bids when tab is active (re-fetch on each visit)
  useEffect(() => {
    if (authLoading || activeTab !== 'my_bids') return;
    loadMyBids();
  }, [activeTab, authLoading, loadMyBids]);

  // Refresh my bids and analytics after a successful bid elsewhere on the site
  useEffect(() => {
    const onBidChanged = () => {
      refreshAnalytics();
      if (activeTab === 'my_bids') {
        loadMyBids();
      } else {
        myBidsInitialLoad.current = true;
      }
    };

    window.addEventListener(BID_CHANGED_EVENT, onBidChanged);
    return () => window.removeEventListener(BID_CHANGED_EVENT, onBidChanged);
  }, [activeTab, loadMyBids, refreshAnalytics]);

  const getBidStatus = (auction: Auction, userMaxBid: number, userId: string) => {
    const isEnded = auction.status === 'ended' || new Date(auction.endsAt).getTime() < Date.now();
    if (isEnded) {
      if (auction.winnerId === userId) return { label: 'Won', color: 'text-status-success', bg: '#E6F4EA' };
      return { label: 'Ended', color: 'text-on-surface-variant', bg: 'var(--color-surface-container-high)' };
    }
    
    if (auction.currentBid === userMaxBid) {
      return { label: 'Leading', color: 'text-status-success', bg: '#E6F4EA' };
    }
    return { label: 'Outbid', color: 'text-status-error', bg: '#FCE8E6' };
  };

  const renderSidebar = () => {
    if (!user) {
      return (
        <div className="card" style={{ padding: 24, backgroundColor: "var(--color-surface-container-lowest)" }}>
          <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Bid Analytics</h3>
          <p className="text-body-md text-on-surface-variant">Log in to track your auction performance.</p>
          <Link href="/login" style={{ marginTop: 16, display: 'inline-block' }}>
            <Button variant="outline">Log In</Button>
          </Link>
        </div>
      );
    }

    if (user.role === 'artist' || user.role === 'verified_artist') {
      return (
        <div className="card" style={{ padding: 24, backgroundColor: "var(--color-surface-container-lowest)" }}>
          <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Artist Analytics</h3>
          <div className="bg-surface-container-low p-4 rounded text-center" style={{ padding: 16, borderRadius: 8 }}>
            <span style={{ marginBottom: 8, display: 'inline-block' }}>
              <Icon name="monitoring" size={32} className="text-primary" />
            </span>
            <p className="text-label-md text-primary font-bold mt-2">Coming Soon</p>
            <p className="text-body-sm text-on-surface-variant mt-2">Track your auction performance and earnings here.</p>
          </div>
        </div>
      );
    }

    if (loadingAnalytics) {
      return (
        <div className="card" style={{ padding: 24, backgroundColor: "var(--color-surface-container-lowest)" }}>
          <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Bid Analytics</h3>
          <div className="animate-pulse flex flex-col gap-16">
            <div style={{ height: 24, backgroundColor: 'var(--color-surface-container-high)', borderRadius: 4 }}></div>
            <div style={{ height: 24, backgroundColor: 'var(--color-surface-container-high)', borderRadius: 4 }}></div>
            <div style={{ height: 24, backgroundColor: 'var(--color-surface-container-high)', borderRadius: 4 }}></div>
          </div>
        </div>
      );
    }

    if (!analytics || analytics.totalParticipated === 0) {
      return (
        <div className="card" style={{ padding: 24, backgroundColor: "var(--color-surface-container-lowest)" }}>
          <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Bid Analytics</h3>
          <p className="text-body-md text-on-surface-variant italic">Start participating in auctions to unlock your analytics.</p>
        </div>
      );
    }

    return (
      <div className="card" style={{ padding: 24, backgroundColor: "var(--color-surface-container-lowest)" }}>
        <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Bid Analytics</h3>
        <ul className="flex flex-col gap-16">
          <li className="flex justify-between border-b border-outline-variant pb-2">
            <span className="text-body-md text-on-surface-variant">Win Rate</span>
            <span className="text-body-md text-primary font-bold">{analytics.winRate}%</span>
          </li>
          <li className="flex justify-between border-b border-outline-variant pb-2">
            <span className="text-body-md text-on-surface-variant">Active Bids</span>
            <span className="text-body-md text-primary font-bold">{analytics.activeBids}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-body-md text-on-surface-variant">Won Items</span>
            <span className="text-body-md text-primary font-bold">{analytics.wonItems}</span>
          </li>
        </ul>
      </div>
    );
  };

  const isCustomer = user && (user.role === 'guest' || user.role === 'user');

  const getAuctionStatusBadge = (auction: Auction) => {
    const isEnded =
      auction.status === 'ended' ||
      auction.status === 'completed' ||
      auction.status === 'cancelled' ||
      new Date(auction.endsAt).getTime() < Date.now();

    if (isEnded) {
      return { label: 'Ended', pulse: false, dotClass: 'active' as const };
    }

    const statusMap: Record<AuctionStatus, { label: string; pulse: boolean; dotClass: 'pulse' | 'active' }> = {
      ending_soon: { label: 'Ending Soon', pulse: true, dotClass: 'pulse' },
      scheduled: { label: 'Scheduled', pulse: false, dotClass: 'active' },
      live: { label: 'Live', pulse: true, dotClass: 'pulse' },
      ended: { label: 'Ended', pulse: false, dotClass: 'active' },
      cancelled: { label: 'Cancelled', pulse: false, dotClass: 'active' },
      completed: { label: 'Completed', pulse: false, dotClass: 'active' },
    };

    return statusMap[auction.status] ?? { label: 'Live', pulse: true, dotClass: 'pulse' as const };
  };

  const formatTimeRemaining = (auction: Auction) => {
    if (new Date(auction.endsAt).getTime() < Date.now()) {
      return 'Ended';
    }
    return formatDistanceToNow(new Date(auction.endsAt), { addSuffix: true });
  };

  const renderBiddingPower = () => {
    if (!user || user.role === 'artist' || user.role === 'verified_artist') {
      return null;
    }

    let value: string;
    let caption: string | null = null;

    const exposure = normalizeBidAnalytics(analytics).activeBidExposure;

    if (loadingAnalytics) {
      value = '—';
    } else if (!analytics) {
      value = '—';
      caption = 'Unavailable';
    } else {
      value = `₹${exposure.toLocaleString('en-IN')}`;
      if (exposure === 0) {
        caption = 'No active commitments';
      }
    }

    return (
      <div className="bids-page-header-power flex flex-col items-end gap-8">
        <span className="text-label-sm text-on-surface-variant uppercase">Your Bidding Power</span>
        <span className="text-headline-md text-primary">{value}</span>
        {caption && (
          <span className="text-caption text-on-surface-variant">{caption}</span>
        )}
      </div>
    );
  };

  const renderAuctionCard = (auction: Auction, userMaxBid?: number, variant: 'grid' | 'list' = 'grid') => {
    const isMyBids = activeTab === 'my_bids' && userMaxBid !== undefined;
    const bidStatus = isMyBids && user ? getBidStatus(auction, userMaxBid, user.id) : null;
    const statusBadge = getAuctionStatusBadge(auction);
    const cardClass = variant === 'list' ? 'auction-card bids-auction-list-card' : 'auction-card';

    return (
      <article key={auction.id} className={cardClass}>
        <div className="auction-img-wrap">
          {!isMyBids && (
            <div className="status-badge">
              <div className={`status-dot ${statusBadge.dotClass}`} />
              <span className="text-label-sm text-primary">{statusBadge.label}</span>
            </div>
          )}
          {isMyBids && bidStatus && (
            <div
              className="status-badge"
              style={{ backgroundColor: bidStatus.bg, borderColor: 'transparent' }}
            >
              <span className={`text-label-sm uppercase ${bidStatus.color}`} style={{ fontWeight: 600 }}>
                {bidStatus.label}
              </span>
            </div>
          )}
          <Link href={`/bids/${auction.id}`} style={{ display: 'block', position: 'absolute', inset: 0 }}>
            <Image
              src={auction.artworkImageUrl || "https://placehold.co/400x500"}
              alt={auction.artworkTitle}
              fill
              sizes={variant === 'list' ? '(max-width: 640px) 100vw, 240px' : '(max-width: 768px) 100vw, 50vw'}
              className="card-img"
              style={{ objectFit: 'cover' }}
            />
          </Link>
        </div>

        <div className="auction-info">
          <div className="auction-title-row">
            <Link href={`/bids/${auction.id}`}>
              <h3 className="text-headline-sm text-primary auction-title">{auction.artworkTitle}</h3>
            </Link>
            <span className="text-headline-sm text-accent-gold shrink-0">
              ₹{auction.currentBid.toLocaleString('en-IN')}
            </span>
          </div>

          <p className="text-label-sm text-on-surface-variant auction-author uppercase">
            {auction.artistName}
            <span style={{ marginLeft: 4, verticalAlign: 'middle', display: 'inline-flex' }}>
              <Icon name="verified" size={14} className="text-accent-emerald" />
            </span>
          </p>

          <div className="bids-auction-stats">
            <div className="bids-auction-stat">
              <span className="text-caption text-on-surface-variant uppercase">Time</span>
              <span className="text-label-md text-status-urgency">{formatTimeRemaining(auction)}</span>
            </div>
            <div className="bids-auction-stat">
              <span className="text-caption text-on-surface-variant uppercase">Bids</span>
              <span className="text-label-md text-primary">{auction.totalBids ?? 0}</span>
            </div>
            <div className="bids-auction-stat">
              <span className="text-caption text-on-surface-variant uppercase">Min Inc.</span>
              <span className="text-label-md text-primary">₹{auction.minIncrement.toLocaleString('en-IN')}</span>
            </div>
            {isMyBids && userMaxBid !== undefined && (
              <div className="bids-auction-stat">
                <span className="text-caption text-on-surface-variant uppercase">Your Max</span>
                <span className="text-label-md text-primary">₹{userMaxBid.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          <Link href={`/bids/${auction.id}`} className="auction-btn" style={{ textDecoration: 'none', display: 'block' }}>
            {isMyBids ? 'View Auction' : 'Place Bid'}
          </Link>
        </div>
      </article>
    );
  };

  if (isArtist()) {
    return <SellerBidsClient />;
  }

  return (
    <>
      <div className="bg-surface-container border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container bids-page-header py-8 flex flex-col gap-16" style={{ padding: "48px var(--margin-desktop) 32px" }}>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-display-lg text-primary">Live Bidding</h1>
              <p className="text-body-lg text-on-surface-variant mt-2" style={{ marginTop: 8 }}>
                Participate in real-time auctions for exclusive, authenticated masterworks.
              </p>
            </div>
            {renderBiddingPower()}
          </div>
        </div>
      </div>

      <section className="container section-gap">
        <div style={{ display: "grid", gridTemplateColumns: "8fr 4fr", gap: 64 }}>
          {/* Main Content */}
          <div className="flex flex-col gap-32">
            <div className="flex justify-between items-end border-b border-outline-variant" style={{ paddingBottom: 16, borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
              {isCustomer ? (
                <div className="flex gap-24" style={{ position: 'relative' }}>
                  <button 
                    ref={(el) => { tabRefs.current[0] = el; }}
                    onClick={() => setActiveTab('all')}
                    className={`text-headline-md pb-4 ${activeTab === 'all' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    style={{ transition: 'color 200ms ease' }}
                  >
                    All Auctions
                  </button>
                  <button 
                    ref={(el) => { tabRefs.current[1] = el; }}
                    onClick={() => setActiveTab('my_bids')}
                    className={`text-headline-md pb-4 ${activeTab === 'my_bids' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    style={{ transition: 'color 200ms ease' }}
                  >
                    My Active Bids
                  </button>
                  <div className="nav-indicator" style={{ ...indicatorStyle, height: '3px', bottom: '-17px' }} />
                </div>
              ) : (
                <h2 className="text-headline-md text-primary" style={{ paddingBottom: 4 }}>Active Auctions</h2>
              )}
            </div>
            
            {/* Stable content wrapper — min-height prevents the column from
                collapsing when switching between a full list, empty state, or
                the loading spinner, which was the root cause of the page jump. */}
            <div style={{ minHeight: 480 }}>
              {activeTab === 'all' ? (
                auctions.length > 0 ? (
                  <div className="auction-grid">
                    {auctions.map((auction) => renderAuctionCard(auction))}
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
                )
              ) : (
                loadingMyBids ? (
                  /* Same vertical rhythm as the empty-state (64px top + 64px bottom)
                     so the column height stays identical during loading. */
                  <div className="empty-state">
                    <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>
                      hourglass_top
                    </span>
                    <p className="text-body-md text-on-surface-variant">Loading your bids…</p>
                  </div>
                ) : myBidsError ? (
                  <div className="empty-state">
                    <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>
                      error_outline
                    </span>
                    <p className="text-body-lg text-error" role="alert">{myBidsError}</p>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ marginTop: 16 }}
                      onClick={() => {
                        setMyBidsError(null);
                        myBidsInitialLoad.current = true;
                        loadMyBids();
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                ) : myBidsData.length > 0 ? (
                  <div className="bids-auction-list">
                    {myBidsData.map((data) => renderAuctionCard(data.auction, data.userMaxBid, 'list'))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>
                      history
                    </span>
                    <p className="text-body-lg text-on-surface-variant">
                      No active bids yet. Participate in auctions to track them here.
                    </p>
                    <Link href="/bids" onClick={(e) => { e.preventDefault(); setActiveTab('all'); }} style={{ marginTop: 16 }}>
                      <Button variant="outline">Browse Auctions</Button>
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-32">
            {renderSidebar()}
          </div>
        </div>
      </section>
    </>
  );
}
