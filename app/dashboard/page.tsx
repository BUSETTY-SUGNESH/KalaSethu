'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  formatCompactINR,
  getCollectorDashboardData,
  type CollectorActivityItem,
  type CollectorStats,
  type FollowedArtistUpdate,
} from "@/lib/services/collector-service";
import { ARTWORK_PLACEHOLDER } from "@/lib/utils/order-display";

export default function DashboardOverviewPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<CollectorStats | null>(null);
  const [activity, setActivity] = useState<CollectorActivityItem[]>([]);
  const [artistUpdates, setArtistUpdates] = useState<FollowedArtistUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getCollectorDashboardData(user.id);
        setStats(data.stats);
        setActivity(data.activity);
        setArtistUpdates(data.artistUpdates);
      } catch (error) {
        console.error("Failed to load dashboard overview", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [user]);

  const displayName = user?.displayName || "Collector";

  if (isLoading) {
    return (
      <>
        <div className="flex justify-between items-end mb-8" style={{ marginBottom: 32 }}>
          <div>
            <div className="skeleton" style={{ width: 280, height: 40, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 360, height: 20 }} />
          </div>
          <div className="skeleton" style={{ width: 180, height: 44, borderRadius: "var(--radius-full)" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 48 }}>
          {[1, 2, 3].map((item) => (
            <div key={item} className="skeleton" style={{ height: 140, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div className="skeleton" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />
          <div className="skeleton" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="text-headline-lg text-primary">Welcome, {displayName}</h1>
          <p className="text-body-md text-on-surface-variant mt-2" style={{ marginTop: 8 }}>
            Here is what is happening with your collection and bids.
          </p>
        </div>
        <Button variant="primary" icon="explore" iconPosition="left" href="/explore">
          Discover New Art
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 48 }}>
        <div className="metric-card">
          <Icon name="collections" className="metric-card-watermark" />
          <div className="flex justify-between items-start mb-4" style={{ marginBottom: 16 }}>
            <span className="text-label-md text-on-surface-variant uppercase">Total Collection</span>
            {stats && stats.newThisMonth > 0 && (
              <div className="flex items-center gap-4 text-accent-emerald text-label-sm">
                <Icon name="trending_up" size={16} /> +{stats.newThisMonth} this month
              </div>
            )}
          </div>
          <span className="text-display-lg text-primary">{stats?.totalCollection ?? 0}</span>
        </div>

        <div className="metric-card">
          <Icon name="gavel" className="metric-card-watermark" />
          <div className="flex justify-between items-start mb-4" style={{ marginBottom: 16 }}>
            <span className="text-label-md text-on-surface-variant uppercase">Active Bids</span>
            {stats && stats.endingSoonCount > 0 && (
              <div className="flex items-center gap-4 text-accent-terracotta text-label-sm">
                <Icon name="warning" size={16} /> {stats.endingSoonCount} ending soon
              </div>
            )}
          </div>
          <span className="text-display-lg text-primary">{stats?.activeBids ?? 0}</span>
        </div>

        <div className="metric-card">
          <Icon name="account_balance_wallet" className="metric-card-watermark" />
          <div className="flex justify-between items-start mb-4" style={{ marginBottom: 16 }}>
            <span className="text-label-md text-on-surface-variant uppercase">Est. Value</span>
          </div>
          <span className="text-display-lg text-primary">
            {formatCompactINR(stats?.estimatedValue ?? 0)}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div className="card p-6" style={{ padding: 24 }}>
          <h3 className="text-headline-sm text-primary mb-4" style={{ marginBottom: 24 }}>Recent Activity</h3>
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

        <div className="card p-6" style={{ padding: 24 }}>
          <div className="flex justify-between items-center mb-4" style={{ marginBottom: 24 }}>
            <h3 className="text-headline-sm text-primary">Updates from Artists</h3>
            <Link href="/explore" className="text-label-sm text-primary hover:underline uppercase">View All</Link>
          </div>
          {artistUpdates.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <p className="text-body-md text-on-surface-variant">Follow artists to see their updates here.</p>
              <Link href="/explore" className="text-label-sm text-primary hover:underline uppercase" style={{ marginTop: 12, display: "inline-block" }}>
                Discover Artists
              </Link>
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
    </>
  );
}
