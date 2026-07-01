'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getArtworksByArtist } from "@/lib/services/artwork-service";
import { getAllAuctionsByArtist, computeSellerAuctionStats } from "@/lib/services/auction-service";
import { getSellerOrders } from "@/lib/services/order-service";

function formatRevenue(amount: number): string {
  if (amount === 0) return '₹0';
  return `₹${new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)}`;
}

export default function ArtistStudioHomePage() {
  const { user } = useAuthStore();
  const [artworkCount, setArtworkCount] = useState(0);
  const [auctionStats, setAuctionStats] = useState<ReturnType<typeof computeSellerAuctionStats> | null>(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const [artworks, auctions, orders] = await Promise.all([
          getArtworksByArtist(user.id, 100),
          getAllAuctionsByArtist(user.id),
          getSellerOrders(user.id, 20),
        ]);
        setArtworkCount(artworks.data?.length ?? 0);
        setAuctionStats(computeSellerAuctionStats(auctions));
        setPendingOrders(
          orders.data.filter((o) => ['pending', 'confirmed', 'processing'].includes(o.status)).length
        );
      } catch (error) {
        console.error("Failed to load artist dashboard", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user]);

  const displayName = user?.displayName || "Artist";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-32">
        <div className="skeleton dashboard-hero" style={{ height: 160 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-xl)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="dashboard-hero dashboard-hero--artist">
        <div className="flex justify-between items-start flex-wrap gap-16">
          <div>
            <p className="text-label-md text-primary uppercase tracking-wider" style={{ marginBottom: 8 }}>
              Artist Studio
            </p>
            <h1 className="text-headline-lg text-primary">Welcome, {displayName}</h1>
            <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8, maxWidth: 520 }}>
              Your creative command center — inventory, sales, and auctions at a glance.
            </p>
          </div>
          <div className="flex gap-12 flex-wrap">
            <Button variant="outline" icon="visibility" href={user ? `/profile/${user.id}` : '#'}>
              Public Profile
            </Button>
            <Button variant="primary" icon="add" href="/dashboard/artist/upload">
              Upload Artwork
            </Button>
          </div>
        </div>
        <div className="dashboard-quick-actions">
          <Link href="/dashboard/artist/inventory"><Button variant="outline" size="sm" icon="inventory_2">Inventory</Button></Link>
          <Link href="/dashboard/artist/orders"><Button variant="outline" size="sm" icon="local_shipping">Sales Orders</Button></Link>
          <Link href="/dashboard/artist/auctions"><Button variant="outline" size="sm" icon="gavel">Auctions</Button></Link>
          <Link href="/dashboard/artist/verify"><Button variant="outline" size="sm" icon="verified">Verification</Button></Link>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 40 }}>
        <Link href="/dashboard/artist/inventory" className="metric-card" style={{ textDecoration: 'none' }}>
          <Icon name="inventory_2" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Artworks</span>
          <span className="text-display-lg text-primary">{artworkCount}</span>
        </Link>
        <Link href="/dashboard/artist/orders" className="metric-card" style={{ textDecoration: 'none' }}>
          <Icon name="local_shipping" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Pending Orders</span>
          <span className="text-display-lg text-primary">{pendingOrders}</span>
        </Link>
        <Link href="/dashboard/artist/auctions" className="metric-card" style={{ textDecoration: 'none' }}>
          <Icon name="gavel" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Live Auctions</span>
          <span className="text-display-lg text-primary">{auctionStats?.activeCount ?? 0}</span>
        </Link>
        <Link href="/dashboard/artist/analytics" className="metric-card" style={{ textDecoration: 'none' }}>
          <Icon name="payments" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase" style={{ display: 'block', marginBottom: 16 }}>Auction Revenue</span>
          <span className="text-display-lg text-primary">{formatRevenue(auctionStats?.revenue ?? 0)}</span>
        </Link>
      </div>

      <div className="dashboard-two-col">
        <div className="card p-6" style={{ padding: 24 }}>
          <div className="dashboard-section-header">
            <h3 className="text-headline-sm text-primary">Studio Snapshot</h3>
            <Link href="/dashboard/artist/analytics" className="text-label-sm text-primary hover:underline uppercase">Analytics</Link>
          </div>
          <ul className="flex flex-col gap-16">
            <li className="flex justify-between items-center pb-4" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.15)", paddingBottom: 12 }}>
              <span className="text-body-md text-on-surface-variant">Followers</span>
              <span className="text-body-md text-primary font-bold">{user?.followerCount ?? 0}</span>
            </li>
            <li className="flex justify-between items-center pb-4" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.15)", paddingBottom: 12 }}>
              <span className="text-body-md text-on-surface-variant">Total Sales</span>
              <span className="text-body-md text-primary font-bold">{user?.salesCount ?? 0}</span>
            </li>
            <li className="flex justify-between items-center pb-4" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.15)", paddingBottom: 12 }}>
              <span className="text-body-md text-on-surface-variant">Auctions Won</span>
              <span className="text-body-md text-primary font-bold">{auctionStats?.wonCount ?? 0}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-body-md text-on-surface-variant">Verified Status</span>
              <Link href="/dashboard/artist/verify" className={`status-pill ${user?.isVerified ? 'completed' : 'pending'}`}>
                {user?.isVerified ? 'Verified' : 'Get Verified'}
              </Link>
            </li>
          </ul>
        </div>

        <div className="card p-6" style={{ padding: 24 }}>
          <div className="dashboard-section-header">
            <h3 className="text-headline-sm text-primary">Quick Links</h3>
          </div>
          <div className="flex flex-col gap-12">
            {[
              { href: '/dashboard/artist/upload', icon: 'add_photo_alternate', label: 'Upload new artwork' },
              { href: '/dashboard/artist/auctions', icon: 'gavel', label: 'Manage your auctions' },
              { href: '/events', icon: 'event', label: 'Browse Kalent events' },
              { href: '/dashboard/messages', icon: 'chat', label: 'Collector messages' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-12 p-12 rounded-lg hover:bg-surface-container-high transition-colors"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Icon name={link.icon} size={22} className="text-primary" />
                <span className="text-body-md text-primary">{link.label}</span>
                <span style={{ marginLeft: 'auto' }}>
                  <Icon name="chevron_right" size={18} className="text-on-surface-variant" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
