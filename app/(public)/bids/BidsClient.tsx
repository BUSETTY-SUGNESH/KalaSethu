'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import type { Auction } from "@/app/types";
import { formatDistanceToNow } from "date-fns";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getUserBidAnalytics, getUserBids, getAuctionsByIds } from "@/lib/services/auction-service";
import SellerBidsClient from "./SellerBidsClient";

export default function BidsClient({ initialAuctions }: { initialAuctions: Auction[] }) {
  const [auctions, setAuctions] = useState<Auction[]>(initialAuctions);
  const { user, isArtist } = useAuthStore();

  // isArtist check moved to the bottom to avoid breaking React hook rules

  const [analytics, setAnalytics] = useState<{
    totalParticipated: number;
    activeBids: number;
    wonItems: number;
    winRate: number;
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Issue 2.2: My Active Bids tracking state
  const [activeTab, setActiveTab] = useState<'all' | 'my_bids'>('all');
  const [myBidsData, setMyBidsData] = useState<{ auction: Auction, userMaxBid: number }[]>([]);
  const [loadingMyBids, setLoadingMyBids] = useState(false);
  const [hasFetchedMyBids, setHasFetchedMyBids] = useState(false);

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
    if (!user) {
      setLoadingAnalytics(false);
      return;
    }
    
    if (user.role === 'artist' || user.role === 'verified_artist') {
      setLoadingAnalytics(false);
      return;
    }

    setLoadingAnalytics(true);
    getUserBidAnalytics()
      .then(setAnalytics)
      .catch(err => console.error("Failed to load bid analytics:", err))
      .finally(() => setLoadingAnalytics(false));
  }, [user]);

  // Fetch My Bids logic
  useEffect(() => {
    if (activeTab === 'my_bids' && !hasFetchedMyBids && user) {
      setLoadingMyBids(true);
      // Fetch up to 50 recent bids by the user
      getUserBids(user.id, 50).then(async (result) => {
        const bids = result.data;
        
        // Group by auctionId to find the user's max bid per auction
        const auctionBidMap = new Map<string, number>();
        bids.forEach(b => {
          const existingMax = auctionBidMap.get(b.auctionId) || 0;
          if (b.amount > existingMax) {
            auctionBidMap.set(b.auctionId, b.amount);
          }
        });
        
        const auctionIds = Array.from(auctionBidMap.keys());
        if (auctionIds.length > 0) {
          const fetchedAuctions = await getAuctionsByIds(auctionIds);
          // Sort ending soonest first
          fetchedAuctions.sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
          
          setMyBidsData(fetchedAuctions.map(a => ({
            auction: a,
            userMaxBid: auctionBidMap.get(a.id) || 0
          })));
        }
        
        setHasFetchedMyBids(true);
        setLoadingMyBids(false);
      }).catch(err => {
        console.error("Failed to load my bids:", err);
        setLoadingMyBids(false);
      });
    }
  }, [activeTab, hasFetchedMyBids, user]);

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

  const renderAuctionCard = (auction: Auction, userMaxBid?: number) => {
    const isMyBids = activeTab === 'my_bids' && userMaxBid !== undefined;
    const status = isMyBids && user ? getBidStatus(auction, userMaxBid, user.id) : null;

    return (
      <div key={auction.id} className="card" style={{ padding: 24, position: 'relative' }}>
        {isMyBids && status && (
          <div style={{ position: 'absolute', top: 24, right: 24, padding: '4px 12px', borderRadius: 16, backgroundColor: status.bg, fontWeight: 600 }} className={`text-label-sm uppercase ${status.color}`}>
            {status.label}
          </div>
        )}
        <div className="flex gap-24">
          {/* position:relative required for next/image fill mode */}
          <div style={{ width: 180, height: 180, borderRadius: "var(--radius-md)", overflow: "hidden", flexShrink: 0, position: "relative" }}>
            <Link href={`/bids/${auction.id}`} style={{ display: "block", width: "100%", height: "100%", position: "relative" }}>
              <Image
                src={auction.artworkImageUrl || "https://placehold.co/400x400"}
                alt={auction.artworkTitle}
                fill
                sizes="180px"
                style={{ objectFit: "cover" }}
              />
            </Link>
          </div>
          <div className="flex flex-col grow">
            <div className="flex justify-between items-start" style={{ marginBottom: 8, paddingRight: isMyBids ? 80 : 0 }}>
              <Link href={`/bids/${auction.id}`}>
                <h3 className="text-headline-sm text-primary hover:underline">{auction.artworkTitle}</h3>
              </Link>
              {!isMyBids && (
                <div className="verified-badge">
                  <div className="status-dot pulse" style={{ marginRight: 4 }} /> Live
                </div>
              )}
            </div>
            <p className="text-body-md text-on-surface-variant mb-4">
              By {auction.artistName}
            </p>
            
            <div className="mt-auto grid grid-cols-2 gap-16" style={{ display: "grid", gridTemplateColumns: isMyBids ? "1fr 1fr 1fr" : "1fr 1fr", gap: 16, marginTop: "auto" }}>
              <div className="bg-surface-container-low p-4 rounded" style={{ padding: 16, borderRadius: 4 }}>
                <span className="text-caption text-on-surface-variant block uppercase">Current Bid</span>
                <span className="text-price-lg text-primary">₹{auction.currentBid.toLocaleString('en-IN')}</span>
              </div>
              {isMyBids && (
                <div className="bg-surface-container-low p-4 rounded" style={{ padding: 16, borderRadius: 4 }}>
                  <span className="text-caption text-on-surface-variant block uppercase">Your Max Bid</span>
                  <span className="text-price-lg text-primary">₹{userMaxBid.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="bg-surface-container-low p-4 rounded" style={{ padding: 16, borderRadius: 4 }}>
                <span className="text-caption text-on-surface-variant block uppercase">Time Remaining</span>
                <span className="text-headline-md text-status-urgency">
                  {new Date(auction.endsAt).getTime() < Date.now() ? 'Ended' : formatDistanceToNow(new Date(auction.endsAt))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isArtist()) {
    return <SellerBidsClient />;
  }

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
                  <div className="flex flex-col gap-24">
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
                ) : myBidsData.length > 0 ? (
                  <div className="flex flex-col gap-24">
                    {myBidsData.map((data) => renderAuctionCard(data.auction, data.userMaxBid))}
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
