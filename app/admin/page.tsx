'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { getPlatformStats, getPendingVerifications, getPendingReports } from "@/lib/services/admin-service";
import type { ArtistVerification, Report, PlatformStats } from "@/app/types";

const DEFAULT_STATS: PlatformStats = {
  totalUsers: 0,
  totalArtists: 0,
  verifiedArtists: 0,
  totalArtworks: 0,
  totalOrders: 0,
  totalRevenue: 0,
  monthlyGMV: 0,
  activeAuctions: 0,
  activeEvents: 0,
  pendingVerifications: 0,
  dailyActiveUsers: 0,
  openDisputes: 0,
  conversionRate: 0,
  userGrowth: 0,
  revenueGrowth: 0,
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<PlatformStats>(DEFAULT_STATS);
  const [pendingVerifications, setPendingVerifications] = useState<ArtistVerification[]>([]);
  const [flaggedContent, setFlaggedContent] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, verifData, reportData] = await Promise.all([
          getPlatformStats(),
          getPendingVerifications(5),
          getPendingReports(5),
        ]);

        if (statsData) {
          setStats({ ...DEFAULT_STATS, ...statsData });
        }

        setPendingVerifications(verifData.data || []);
        setFlaggedContent(reportData.data || []);
      } catch (error) {
        console.error("Failed to load admin dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-32">
        <div className="skeleton" style={{ width: "30%", height: 40 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 8 }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div className="skeleton" style={{ height: 300, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="text-headline-lg text-primary">Platform Overview</h1>
          <p className="text-body-md text-on-surface-variant mt-2" style={{ marginTop: 8 }}>
            Real-time metrics for KalaSetu operations.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 24 }}>
        <div className="metric-card">
          <Icon name="group" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Total Users</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">{stats.totalUsers.toLocaleString()}</span>
          </div>
        </div>
        <div className="metric-card">
          <Icon name="palette" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Total Artworks</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">{stats.totalArtworks.toLocaleString()}</span>
          </div>
        </div>
        <div className="metric-card">
          <Icon name="payments" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Total Orders</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">{stats.totalOrders.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 48 }}>
        <div className="metric-card">
          <Icon name="currency_rupee" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Total Revenue</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">₹{stats.totalRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="metric-card">
          <Icon name="gavel" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Active Auctions</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">{stats.activeAuctions.toLocaleString()}</span>
          </div>
        </div>
        <div className="metric-card">
          <Icon name="event" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Active Events</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">{stats.activeEvents.toLocaleString()}</span>
          </div>
        </div>
        <div className="metric-card">
          <Icon name="verified_user" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Pending Verifications</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">{stats.pendingVerifications.toLocaleString()}</span>
          </div>
        </div>
        <div className="metric-card">
          <Icon name="person_check" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Daily Active Users</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">{stats.dailyActiveUsers.toLocaleString()}</span>
          </div>
        </div>
        <div className="metric-card">
          <Icon name="trending_up" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Conversion Rate</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">{stats.conversionRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Pending Verifications */}
        <div className="card">
          <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h3 className="text-headline-sm text-primary">Pending Verifications</h3>
            <Link href="/admin/verification">
              <button className="text-label-sm text-primary uppercase hover:underline">View All</button>
            </Link>
          </div>
          <div className="flex flex-col">
            {pendingVerifications.length > 0 ? (
              pendingVerifications.map((app) => (
                <div key={app.id} className="flex justify-between items-center px-6 py-4 border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.1)" }}>
                  <div>
                    <h4 className="text-title-md text-primary">{app.artistName}</h4>
                    <p className="text-caption text-on-surface-variant uppercase">{app.artForm}</p>
                  </div>
                  <div className="flex items-center gap-16">
                    <span className="text-caption text-on-surface-variant">
                      {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A'}
                    </span>
                    <Link href={`/admin/verification/${app.id}`} className="text-accent-emerald">
                      <Icon name="check_circle" size={24} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-24 text-center text-body-md text-on-surface-variant italic">
                No pending verifications.
              </div>
            )}
          </div>
        </div>

        {/* Flagged Content */}
        <div className="card">
          <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h3 className="text-headline-sm text-primary">Flagged Content</h3>
            <Link href="/admin/moderation">
              <button className="text-label-sm text-primary uppercase hover:underline">View All</button>
            </Link>
          </div>
          <div className="flex flex-col">
            {flaggedContent.length > 0 ? (
              flaggedContent.map((flag) => (
                <div key={flag.id} className="flex flex-col gap-8 px-6 py-4 border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.1)" }}>
                  <div className="flex justify-between items-start">
                    <h4 className="text-body-md text-primary font-bold pr-8">{flag.reason}</h4>
                    <span className={`text-caption uppercase px-2 py-1 rounded ${flag.severity === 'high' ? 'bg-[#ffdad6] text-status-urgency' : 'bg-surface-container-high text-on-surface'}`} style={{ padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>
                      {flag.severity}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-caption text-on-surface-variant flex items-center gap-4">
                      <Icon name="flag" size={14} /> Type: {flag.targetType}
                    </span>
                    <Link href="/admin/moderation" className="text-label-sm text-primary uppercase hover:text-accent-terracotta hover:underline">
                      Review
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-24 text-center text-body-md text-on-surface-variant italic">
                No flagged content.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
