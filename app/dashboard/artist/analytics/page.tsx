'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getAllAuctionsByArtist, computeSellerAuctionStats } from "@/lib/services/auction-service";
import { getArtworksByArtist } from "@/lib/services/artwork-service";
import { getSellerOrders } from "@/lib/services/order-service";

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function ArtistAnalyticsPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [auctionStats, setAuctionStats] = useState<ReturnType<typeof computeSellerAuctionStats> | null>(null);
  const [publishedCount, setPublishedCount] = useState(0);
  const [orderRevenue, setOrderRevenue] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);

  useEffect(() => {
    async function load() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const [auctions, artworks, orders] = await Promise.all([
          getAllAuctionsByArtist(user.id),
          getArtworksByArtist(user.id, 100),
          getSellerOrders(user.id, 50),
        ]);
        setAuctionStats(computeSellerAuctionStats(auctions));
        setPublishedCount(artworks.data.filter((a) => a.status === 'published').length);
        const completed = orders.data.filter((o) =>
          ['delivered', 'completed'].includes(o.status)
        );
        setCompletedOrders(completed.length);
        setOrderRevenue(completed.reduce((sum, o) => sum + o.totalAmount, 0));
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-24">
        <div className="skeleton" style={{ height: 80 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-xl)" }} />
          ))}
        </div>
      </div>
    );
  }

  const stats = auctionStats ?? computeSellerAuctionStats([]);

  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <p className="text-label-md text-primary uppercase tracking-wider" style={{ marginBottom: 8 }}>Analytics</p>
        <h1 className="text-headline-lg text-primary">Performance Overview</h1>
        <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
          Sales, auctions, and audience metrics for your studio.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
        <div className="metric-card">
          <Icon name="visibility" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Followers</span>
          <span className="text-display-lg text-primary">{user?.followerCount ?? 0}</span>
        </div>
        <div className="metric-card">
          <Icon name="inventory_2" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Published Listings</span>
          <span className="text-display-lg text-primary">{publishedCount}</span>
        </div>
        <div className="metric-card">
          <Icon name="shopping_bag" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Completed Orders</span>
          <span className="text-display-lg text-primary">{completedOrders}</span>
        </div>
        <div className="metric-card">
          <Icon name="payments" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Order Revenue</span>
          <span className="text-display-lg text-primary">{formatINR(orderRevenue)}</span>
        </div>
        <div className="metric-card">
          <Icon name="gavel" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Active Auctions</span>
          <span className="text-display-lg text-primary">{stats.activeCount}</span>
        </div>
        <div className="metric-card">
          <Icon name="trending_up" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Auction Revenue</span>
          <span className="text-display-lg text-primary">{formatINR(stats.revenue)}</span>
        </div>
      </div>

      <div className="card p-6" style={{ padding: 24 }}>
        <h3 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Auction Insights</h3>
        <div className="dashboard-two-col">
          <ul className="flex flex-col gap-16">
            <li className="flex justify-between"><span className="text-on-surface-variant">Total bids received</span><strong>{stats.totalBids}</strong></li>
            <li className="flex justify-between"><span className="text-on-surface-variant">Auctions with winners</span><strong>{stats.wonCount}</strong></li>
            <li className="flex justify-between"><span className="text-on-surface-variant">Completed auctions</span><strong>{stats.completedCount}</strong></li>
          </ul>
          <ul className="flex flex-col gap-16">
            <li className="flex justify-between"><span className="text-on-surface-variant">Average final bid</span><strong>{stats.avgFinalBid > 0 ? formatINR(stats.avgFinalBid) : '—'}</strong></li>
            <li className="flex justify-between"><span className="text-on-surface-variant">Highest sale</span><strong>{stats.highestSale > 0 ? formatINR(stats.highestSale) : '—'}</strong></li>
            <li className="flex justify-between"><span className="text-on-surface-variant">Platform sales count</span><strong>{user?.salesCount ?? 0}</strong></li>
          </ul>
        </div>
        <div className="flex gap-12" style={{ marginTop: 24 }}>
          <Link href="/dashboard/artist/auctions" className="btn btn-outline">Manage Auctions</Link>
          <Link href="/dashboard/artist/orders" className="btn btn-outline">View Sales Orders</Link>
        </div>
      </div>
    </>
  );
}
