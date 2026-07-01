'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { isValidQueryString } from '@/lib/firebase/query-guards';
import {
  formatCompactINR,
  getCollectorDashboardData,
  type AuctionReminder,
  type CollectorActivityItem,
  type CollectorStats,
  type FollowedArtistUpdate,
  type RecentPurchase,
} from "@/lib/services/collector-service";
import { getPersonalizedArtworks } from "@/lib/services/home-recommendations";
import { ARTWORK_PLACEHOLDER } from "@/lib/utils/order-display";
import type { Artwork } from "@/app/types";
import { getOrderStatusPillClass } from "@/lib/utils/order-display";
import CollectorSubpageHero, {
  CollectorPageSkeleton,
  CollectorQuickLinkList,
} from "@/app/components/dashboard/CollectorSubpageHero";

export default function CollectorHomePage() {
  const router = useRouter();
  const { user, isArtist, isLoading: authLoading } = useAuthStore();
  const [stats, setStats] = useState<CollectorStats | null>(null);
  const [activity, setActivity] = useState<CollectorActivityItem[]>([]);
  const [artistUpdates, setArtistUpdates] = useState<FollowedArtistUpdate[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [auctionReminders, setAuctionReminders] = useState<AuctionReminder[]>([]);
  const [recommendations, setRecommendations] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (isArtist()) {
      router.replace('/dashboard/artist');
    }
  }, [authLoading, isArtist, router]);

  useEffect(() => {
    async function loadDashboard() {
      if (!user?.id || !isValidQueryString(user.id) || isArtist()) {
        setIsLoading(false);
        return;
      }

      try {
        const [data, recs] = await Promise.all([
          getCollectorDashboardData(user.id),
          getPersonalizedArtworks(user.id, [], 6),
        ]);
        setStats(data.stats);
        setActivity(data.activity);
        setArtistUpdates(data.artistUpdates);
        setRecentPurchases(data.recentPurchases);
        setAuctionReminders(data.auctionReminders);
        setRecommendations(recs);
      } catch (error) {
        console.error("Failed to load collector dashboard", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) loadDashboard();
  }, [user, authLoading, isArtist]);

  const displayName = user?.displayName || "Collector";

  if (authLoading || isArtist() || isLoading) {
    return <CollectorPageSkeleton metricCount={4} />;
  }

  return (
    <div className="collector-dashboard-page">
      <section className="dashboard-hero dashboard-hero--collector">
        <div className="flex justify-between items-start flex-wrap gap-16">
          <div>
            <p className="text-label-md text-primary uppercase tracking-wider" style={{ marginBottom: 8 }}>
              Collector Dashboard
            </p>
            <h1 className="text-headline-lg text-primary">Welcome back, {displayName}</h1>
            <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8, maxWidth: 520 }}>
              Track your collection, bids, and discoveries in one place.
            </p>
          </div>
          <div className="flex gap-12 flex-wrap">
            <Button variant="outline" icon="storefront" href="/marketplace">
              Browse Marketplace
            </Button>
            <Button variant="primary" icon="explore" iconPosition="left" href="/explore">
              Discover Art
            </Button>
          </div>
        </div>
        <div className="dashboard-quick-actions">
          <Link href="/dashboard/collector"><Button variant="outline" size="sm" icon="collections">My Collection</Button></Link>
          <Link href="/dashboard/bids"><Button variant="outline" size="sm" icon="gavel">Active Bids</Button></Link>
          <Link href="/dashboard/orders"><Button variant="outline" size="sm" icon="receipt_long">Orders</Button></Link>
          <Link href="/dashboard/saved"><Button variant="outline" size="sm" icon="favorite">Wishlist</Button></Link>
        </div>
      </section>

      <div className="dashboard-metric-grid">
        <Link href="/dashboard/collector" className="metric-card" style={{ textDecoration: 'none' }}>
          <Icon name="payments" className="metric-card-watermark" />
          <div className="flex justify-between items-start" style={{ marginBottom: 16 }}>
            <span className="text-label-md text-on-surface-variant uppercase">Collection Value</span>
            {stats && stats.newThisMonth > 0 && (
              <span className="flex items-center gap-4 text-accent-emerald text-label-sm">
                <Icon name="trending_up" size={16} /> +{stats.newThisMonth}
              </span>
            )}
          </div>
          <span className="text-display-lg text-primary">{formatCompactINR(stats?.estimatedValue ?? 0)}</span>
        </Link>

        <Link href="/dashboard/collector" className="metric-card" style={{ textDecoration: 'none' }}>
          <Icon name="collections" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>
            Pieces Owned
          </span>
          <span className="text-display-lg text-primary">{stats?.totalCollection ?? 0}</span>
        </Link>

        <Link href="/dashboard/bids" className="metric-card" style={{ textDecoration: 'none' }}>
          <Icon name="gavel" className="metric-card-watermark" />
          <div className="flex justify-between items-start" style={{ marginBottom: 16 }}>
            <span className="text-label-md text-on-surface-variant uppercase">Active Bids</span>
            {stats && stats.endingSoonCount > 0 && (
              <span className="flex items-center gap-4 text-accent-terracotta text-label-sm">
                <Icon name="warning" size={16} /> {stats.endingSoonCount}
              </span>
            )}
          </div>
          <span className="text-display-lg text-primary">{stats?.activeBids ?? 0}</span>
        </Link>

        <Link href="/dashboard/orders" className="metric-card" style={{ textDecoration: 'none' }}>
          <Icon name="receipt_long" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>
            Recent Orders
          </span>
          <span className="text-display-lg text-primary">{recentPurchases.length}</span>
        </Link>
      </div>

      {auctionReminders.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div className="dashboard-section-header">
            <h2 className="text-headline-sm text-primary">Auction Reminders</h2>
            <Link href="/dashboard/bids" className="text-label-sm text-primary hover:underline uppercase">View All Bids</Link>
          </div>
          <div className="flex flex-col gap-12">
            {auctionReminders.map((reminder) => (
              <Link
                key={reminder.auctionId}
                href={`/bids/${reminder.auctionId}`}
                className="dashboard-reminder-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                  <Image src={reminder.imageUrl} alt={reminder.title} fill sizes="56px" style={{ objectFit: 'cover' }} />
                </div>
                <div className="grow">
                  <p className="text-body-md text-primary font-bold">{reminder.title}</p>
                  <p className="text-caption text-on-surface-variant">
                    Ends {formatDistanceToNow(new Date(reminder.endsAt), { addSuffix: true })} · Your bid ₹{reminder.userMaxBid.toLocaleString('en-IN')}
                  </p>
                </div>
                <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {recentPurchases.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div className="dashboard-section-header">
            <h2 className="text-headline-sm text-primary">Recent Purchases</h2>
            <Link href="/dashboard/orders" className="text-label-sm text-primary hover:underline uppercase">All Orders</Link>
          </div>
          <div className="dashboard-widget-grid">
            {recentPurchases.map((purchase) => (
              <Link
                key={`${purchase.orderId}-${purchase.artworkId}`}
                href={`/dashboard/orders/${purchase.orderId}`}
                className="dashboard-widget-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="dashboard-widget-card-img">
                  <Image src={purchase.imageUrl} alt={purchase.title} fill sizes="200px" style={{ objectFit: 'cover' }} />
                </div>
                <div className="dashboard-widget-card-body">
                  <p className="text-body-md text-primary font-bold truncate">{purchase.title}</p>
                  <p className="text-caption text-on-surface-variant">₹{purchase.price.toLocaleString('en-IN')}</p>
                  <span className={`status-pill ${getOrderStatusPillClass(purchase.status)}`} style={{ marginTop: 8, display: 'inline-block' }}>
                    {purchase.status.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div className="dashboard-section-header">
            <h2 className="text-headline-sm text-primary">Recommended for You</h2>
            <Link href="/marketplace" className="text-label-sm text-primary hover:underline uppercase">Browse Marketplace</Link>
          </div>
          <div className="dashboard-widget-grid">
            {recommendations.map((artwork) => (
              <Link
                key={artwork.id}
                href={`/artwork/${artwork.id}`}
                className="dashboard-widget-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="dashboard-widget-card-img">
                  <Image
                    src={artwork.thumbnailUrl || artwork.images[0]?.url || ARTWORK_PLACEHOLDER}
                    alt={artwork.title}
                    fill
                    sizes="200px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className="dashboard-widget-card-body">
                  <p className="text-body-md text-primary font-bold truncate">{artwork.title}</p>
                  <p className="text-caption text-on-surface-variant">{artwork.artistName}</p>
                  <p className="text-label-sm text-primary" style={{ marginTop: 4 }}>
                    ₹{artwork.price.toLocaleString('en-IN')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="dashboard-two-col" style={{ marginBottom: 40 }}>
        <div className="card dashboard-panel-card">
          <div className="dashboard-section-header">
            <h3 className="text-headline-sm text-primary">Collection Snapshot</h3>
            <Link href="/dashboard/collector" className="text-label-sm text-primary hover:underline uppercase">
              View Collection
            </Link>
          </div>
          <ul className="flex flex-col gap-16">
            <li className="flex justify-between items-center pb-4" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.15)", paddingBottom: 12 }}>
              <span className="text-body-md text-on-surface-variant">Acquired Pieces</span>
              <span className="text-body-md text-primary font-bold">{stats?.totalCollection ?? 0}</span>
            </li>
            <li className="flex justify-between items-center pb-4" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.15)", paddingBottom: 12 }}>
              <span className="text-body-md text-on-surface-variant">Active Bids</span>
              <span className="text-body-md text-primary font-bold">{stats?.activeBids ?? 0}</span>
            </li>
            <li className="flex justify-between items-center pb-4" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.15)", paddingBottom: 12 }}>
              <span className="text-body-md text-on-surface-variant">Ending Soon</span>
              <span className="text-body-md text-primary font-bold">{stats?.endingSoonCount ?? 0}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-body-md text-on-surface-variant">Estimated Value</span>
              <span className="text-body-md text-primary font-bold">{formatCompactINR(stats?.estimatedValue ?? 0)}</span>
            </li>
          </ul>
        </div>

        <CollectorQuickLinkList
          links={[
            { href: '/dashboard/collector', icon: 'collections', label: 'Browse your collection' },
            { href: '/dashboard/saved', icon: 'favorite', label: 'View wishlist' },
            { href: '/bids', icon: 'gavel', label: 'Explore live auctions' },
            { href: '/dashboard/messages', icon: 'chat', label: 'Collector messages' },
          ]}
        />
      </div>

      <div className="dashboard-two-col">
        <div className="card dashboard-panel-card">
          <div className="dashboard-section-header">
            <h3 className="text-headline-sm text-primary">Recent Activity</h3>
          </div>
          {activity.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <p className="text-body-md text-on-surface-variant">No recent activity yet.</p>
              <Link href="/bids" className="text-label-sm text-primary hover:underline uppercase" style={{ marginTop: 12, display: "inline-block" }}>
                Browse Auctions
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-16">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-12 pb-4 border-b border-outline-variant"
                  style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)", paddingBottom: 16 }}
                >
                  <div className="bg-surface-container-high rounded-full p-2 text-primary" style={{ padding: 8, borderRadius: "50%" }}>
                    <Icon name={item.icon} size={20} />
                  </div>
                  <div>
                    <p className="text-body-md text-on-surface">{item.message}</p>
                    <span className="text-caption text-on-surface-variant">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card dashboard-panel-card">
          <div className="dashboard-section-header">
            <h3 className="text-headline-sm text-primary">Followed Artists</h3>
            <Link href="/explore" className="text-label-sm text-primary hover:underline uppercase">Discover</Link>
          </div>
          {artistUpdates.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <p className="text-body-md text-on-surface-variant">Follow artists to see their updates here.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-16">
              {artistUpdates.map((update) => (
                <li
                  key={update.id}
                  className="flex items-center gap-12 pb-4 border-b border-outline-variant"
                  style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)", paddingBottom: 16 }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", position: "relative", flexShrink: 0 }}>
                    <Image
                      src={update.authorAvatarUrl || ARTWORK_PLACEHOLDER}
                      alt={update.authorName}
                      fill
                      sizes="48px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <p className="text-body-md text-on-surface">
                      <strong>{update.authorName}</strong> {update.content}
                    </p>
                    <span className="text-caption text-on-surface-variant">
                      {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
