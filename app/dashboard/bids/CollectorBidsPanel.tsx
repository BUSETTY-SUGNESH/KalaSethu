'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ARTWORK_PLACEHOLDER } from "@/lib/constants/placeholders";
import {
  EMPTY_BID_ANALYTICS,
  getAuctionsByIds,
  getUserBidAnalytics,
  getUserBids,
  normalizeBidAnalytics,
  BID_CHANGED_EVENT,
  type BidAnalytics,
} from "@/lib/services/auction-service";
import type { Auction } from "@/app/types";
import CollectorSubpageHero from "@/app/components/dashboard/CollectorSubpageHero";

function getBidStatus(auction: Auction, userMaxBid: number, userId: string) {
  const isEnded =
    auction.status === 'ended' ||
    auction.status === 'completed' ||
    new Date(auction.endsAt).getTime() < Date.now();

  if (isEnded) {
    if (auction.winnerId === userId) return { label: 'Won' };
    return { label: 'Ended' };
  }
  if (auction.currentBid <= userMaxBid) return { label: 'Leading' };
  return { label: 'Outbid' };
}

export default function CollectorBidsPanel() {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<BidAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [myBidsData, setMyBidsData] = useState<{ auction: Auction; userMaxBid: number }[]>([]);
  const [loadingMyBids, setLoadingMyBids] = useState(true);
  const [myBidsError, setMyBidsError] = useState<string | null>(null);
  const initialLoad = useRef(true);

  const loadAnalytics = useCallback(async () => {
    if (!user) return;
    setLoadingAnalytics(true);
    try {
      const data = await getUserBidAnalytics();
      setAnalytics(normalizeBidAnalytics(data));
    } catch {
      setAnalytics({ ...EMPTY_BID_ANALYTICS });
    } finally {
      setLoadingAnalytics(false);
    }
  }, [user]);

  const loadMyBids = useCallback(async () => {
    if (!user) return;
    const showSpinner = initialLoad.current;
    if (showSpinner) setLoadingMyBids(true);
    setMyBidsError(null);
    try {
      const result = await getUserBids(user.id, 50);
      const auctionBidMap = new Map<string, number>();
      result.data.filter((b) => b.auctionId).forEach((b) => {
        const existing = auctionBidMap.get(b.auctionId) || 0;
        if (b.amount > existing) auctionBidMap.set(b.auctionId, b.amount);
      });
      const auctionIds = Array.from(auctionBidMap.keys());
      if (auctionIds.length === 0) {
        setMyBidsData([]);
        return;
      }
      const auctions = await getAuctionsByIds(auctionIds);
      const live = auctions.filter(
        (a) => ['live', 'ending_soon', 'scheduled'].includes(a.status) && new Date(a.endsAt).getTime() > Date.now()
      );
      live.sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
      setMyBidsData(live.map((a) => ({ auction: a, userMaxBid: auctionBidMap.get(a.id) || 0 })));
    } catch {
      setMyBidsError('Could not load your bids. Please try again.');
    } finally {
      setLoadingMyBids(false);
      initialLoad.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAnalytics();
      loadMyBids();
    }
  }, [user, loadAnalytics, loadMyBids]);

  useEffect(() => {
    const handler = () => {
      loadAnalytics();
      loadMyBids();
    };
    window.addEventListener(BID_CHANGED_EVENT, handler);
    return () => window.removeEventListener(BID_CHANGED_EVENT, handler);
  }, [loadAnalytics, loadMyBids]);

  const exposure = normalizeBidAnalytics(analytics).activeBidExposure;

  return (
    <div className="collector-dashboard-page">
      <CollectorSubpageHero
        eyebrow="Active Bids"
        title="Your Auction Activity"
        description="Track live bids and bidding power across KalaSetu auctions."
        actions={
          <div className="text-right">
            <span className="text-label-sm text-on-surface-variant uppercase">Bidding Power</span>
            <p className="text-headline-md text-primary">
              {loadingAnalytics ? '—' : `₹${exposure.toLocaleString('en-IN')}`}
            </p>
          </div>
        }
        quickLinks={[
          { href: '/bids', icon: 'explore', label: 'Browse Auctions' },
          { href: '/dashboard/collector', icon: 'collections', label: 'My Collection' },
          { href: '/dashboard/orders', icon: 'receipt_long', label: 'Orders' },
        ]}
      />

      <div className="dashboard-metric-grid dashboard-metric-grid--3">
        <div className="metric-card">
          <Icon name="gavel" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Active Bids</span>
          <span className="text-display-lg text-primary">{analytics?.activeBids ?? 0}</span>
        </div>
        <div className="metric-card">
          <Icon name="emoji_events" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Won Items</span>
          <span className="text-display-lg text-primary">{analytics?.wonItems ?? 0}</span>
        </div>
        <div className="metric-card">
          <Icon name="percent" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Win Rate</span>
          <span className="text-display-lg text-primary">{analytics?.winRate ?? 0}%</span>
        </div>
      </div>

      <div className="dashboard-section-header">
        <h2 className="text-headline-sm text-primary">Live Bids</h2>
        <Link href="/bids">
          <Button variant="outline" size="sm" icon="explore">Browse All Auctions</Button>
        </Link>
      </div>

      {loadingMyBids ? (
        <div className="flex flex-col gap-16">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : myBidsError ? (
        <div className="empty-state">
          <p className="text-body-lg text-error">{myBidsError}</p>
          <Button variant="outline" onClick={loadMyBids} style={{ marginTop: 16 }}>Try Again</Button>
        </div>
      ) : myBidsData.length === 0 ? (
        <div className="empty-state">
          <Icon name="gavel" size={40} className="empty-state-icon" />
          <p className="text-body-lg text-on-surface-variant">No active bids right now.</p>
          <Link href="/bids">
            <Button variant="primary" style={{ marginTop: 16 }}>Explore Auctions</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-16">
          {myBidsData.map(({ auction, userMaxBid }) => {
            const status = user ? getBidStatus(auction, userMaxBid, user.id) : null;
            return (
              <Link
                key={auction.id}
                href={`/bids/${auction.id}`}
                className="dashboard-reminder-card"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  borderLeftColor: status?.label === 'Outbid' ? 'var(--color-accent-terracotta)' : 'var(--color-accent-emerald)',
                }}
              >
                <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                  <Image src={auction.artworkImageUrl || ARTWORK_PLACEHOLDER} alt={auction.artworkTitle} fill sizes="72px" style={{ objectFit: 'cover' }} />
                </div>
                <div className="grow">
                  <p className="text-body-md text-primary font-bold">{auction.artworkTitle}</p>
                  <p className="text-caption text-on-surface-variant">
                    Current ₹{auction.currentBid.toLocaleString('en-IN')} · Your bid ₹{userMaxBid.toLocaleString('en-IN')}
                  </p>
                  <p className="text-caption text-on-surface-variant">
                    Ends {formatDistanceToNow(new Date(auction.endsAt), { addSuffix: true })}
                  </p>
                </div>
                {status && (
                  <span className={`status-pill ${status.label === 'Leading' ? 'completed' : status.label === 'Outbid' ? 'pending' : 'live'}`}>
                    {status.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
