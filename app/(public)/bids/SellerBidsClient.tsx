'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import CreateAuctionModal from "@/app/(public)/bids/CreateAuctionModal";
import {
  getAllAuctionsByArtist,
  cancelAuction,
  computeSellerAuctionStats,
} from "@/lib/services/auction-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Auction, AuctionStatus } from "@/app/types";
import { formatDistanceToNow } from "date-fns";

const ACTIVE_STATUSES = ['live', 'ending_soon', 'scheduled'] as const;

function formatRevenue(amount: number): string {
  if (amount === 0) return '₹0';
  return `₹${new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)}`;
}

function getAuctionStatusBadge(auction: Auction) {
  const isEnded =
    auction.status === 'ended' ||
    auction.status === 'completed' ||
    auction.status === 'cancelled' ||
    new Date(auction.endsAt).getTime() < Date.now();

  if (isEnded) {
    return { label: 'Ended', dotClass: 'active' as const };
  }

  const statusMap: Record<AuctionStatus, { label: string; dotClass: 'pulse' | 'active' }> = {
    ending_soon: { label: 'Ending Soon', dotClass: 'pulse' },
    scheduled: { label: 'Scheduled', dotClass: 'active' },
    live: { label: 'Live', dotClass: 'pulse' },
    ended: { label: 'Ended', dotClass: 'active' },
    cancelled: { label: 'Cancelled', dotClass: 'active' },
    completed: { label: 'Completed', dotClass: 'active' },
  };

  return statusMap[auction.status] ?? { label: 'Live', dotClass: 'pulse' as const };
}

function formatAuctionTime(auction: Auction): string {
  if (auction.status === 'scheduled' && new Date(auction.startsAt).getTime() > Date.now()) {
    return `Starts ${formatDistanceToNow(new Date(auction.startsAt), { addSuffix: true })}`;
  }
  if (new Date(auction.endsAt).getTime() < Date.now()) {
    return 'Ended';
  }
  return formatDistanceToNow(new Date(auction.endsAt), { addSuffix: true });
}

export default function SellerBidsClient() {
  const { user } = useAuthStore();
  const [allAuctions, setAllAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);

  const activeAuctions = allAuctions.filter((a) =>
    ACTIVE_STATUSES.includes(a.status as (typeof ACTIVE_STATUSES)[number])
  );
  const stats = computeSellerAuctionStats(allAuctions);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const auctions = await getAllAuctionsByArtist(user.id);
      setAllAuctions(auctions);
    } catch (error) {
      console.error("Failed to load seller auction data", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dismissCreateModal = () => {
    setShowCreateModal(false);
    setEditingAuction(null);
    setModalMode('create');
  };

  const openCreateModal = () => {
    setEditingAuction(null);
    setModalMode('create');
    setShowCreateModal(true);
  };

  const openEditModal = (auction: Auction) => {
    if (auction.status !== 'scheduled' || auction.totalBids > 0) {
      alert('Only scheduled auctions with no bids can be edited.');
      return;
    }
    setEditingAuction(auction);
    setModalMode('edit');
    setShowCreateModal(true);
  };

  const handleCancelAuction = async (auction: Auction) => {
    if (auction.totalBids > 0) {
      alert('Cannot cancel an auction that has received bids.');
      return;
    }
    if (!window.confirm(`Cancel auction for "${auction.artworkTitle}"?`)) return;

    try {
      await cancelAuction(auction.id);
      await loadData();
    } catch (error) {
      console.error('Failed to cancel auction', error);
      alert('Failed to cancel auction. It may have received bids or already ended.');
    }
  };

  const canModify = (auction: Auction) =>
    auction.status === 'scheduled' && auction.totalBids === 0;

  const statItems = [
    { label: "Active", value: String(stats.activeCount), icon: "gavel", color: "var(--color-accent-gold)" },
    { label: "Bids Received", value: String(stats.totalBids), icon: "trending_up", color: "var(--color-primary)" },
    { label: "Won by Buyers", value: String(stats.wonCount), icon: "emoji_events", color: "var(--color-accent-emerald)" },
    { label: "Revenue", value: formatRevenue(stats.revenue), icon: "payments", color: "var(--color-accent-terracotta)" },
  ];

  const renderAuctionCard = (auction: Auction) => {
    const statusBadge = getAuctionStatusBadge(auction);

    return (
      <article key={auction.id} className="auction-card bids-auction-list-card seller-auction-card">
        <div className="auction-img-wrap">
          <div className="status-badge">
            <div className={`status-dot ${statusBadge.dotClass}`} />
            <span className="text-label-sm text-primary">{statusBadge.label}</span>
          </div>
          <Link href={`/bids/${auction.id}`} style={{ display: 'block', position: 'absolute', inset: 0 }}>
            <Image
              src={auction.artworkImageUrl || "https://placehold.co/400x500"}
              alt={auction.artworkTitle}
              fill
              sizes="(max-width: 640px) 100vw, 200px"
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
            Listed by you
          </p>

          <div className="bids-auction-stats seller-auction-stats">
            <div className="bids-auction-stat">
              <span className="text-caption text-on-surface-variant uppercase">Current Bid</span>
              <span className="text-label-md text-primary">₹{auction.currentBid.toLocaleString('en-IN')}</span>
            </div>
            <div className="bids-auction-stat">
              <span className="text-caption text-on-surface-variant uppercase">Bid Count</span>
              <span className="text-label-md text-primary">{auction.totalBids ?? 0}</span>
            </div>
            <div className="bids-auction-stat">
              <span className="text-caption text-on-surface-variant uppercase">Time</span>
              <span className="text-label-md text-status-urgency">{formatAuctionTime(auction)}</span>
            </div>
            <div className="bids-auction-stat">
              <span className="text-caption text-on-surface-variant uppercase">Status</span>
              <span className="text-label-md text-primary">{statusBadge.label}</span>
            </div>
          </div>

          <div className="seller-bids-actions">
            <Link href={`/bids/${auction.id}`} className="auction-btn seller-bids-action-primary">
              View Bids
            </Link>
            <button
              type="button"
              className="btn btn-outline seller-bids-action-btn"
              onClick={() => openEditModal(auction)}
              disabled={!canModify(auction)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn seller-bids-action-btn seller-bids-action-cancel"
              onClick={() => handleCancelAuction(auction)}
              disabled={!canModify(auction)}
            >
              Cancel
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <>
      <CreateAuctionModal
        open={showCreateModal}
        mode={modalMode}
        editingAuction={editingAuction}
        onClose={dismissCreateModal}
        onSuccess={loadData}
      />

      <div className="bg-surface-container border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container bids-page-header" style={{ padding: "32px var(--margin-desktop) 24px" }}>
          <div className="flex justify-between items-end" style={{ flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="flex items-center gap-8" style={{ color: "var(--color-accent-gold)", marginBottom: 8 }}>
                <Icon name="gavel" size={22} />
                <span className="text-label-sm uppercase tracking-wider">Seller Auction Hub</span>
              </div>
              <h1 className="text-display-lg text-primary">Manage Your Auctions</h1>
              <p className="text-body-md text-on-surface-variant" style={{ marginTop: 6 }}>
                Create auctions, track live bids, and manage listings.
              </p>
            </div>
            <Button variant="primary" size="md" icon="add" iconPosition="left" onClick={openCreateModal}>
              Create Auction
            </Button>
          </div>
        </div>
      </div>

      <section className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div className="seller-bids-stats-bar">
          {statItems.map((stat) => (
            <div key={stat.label} className="seller-bids-stat-item">
              <span className="material-symbols-outlined seller-bids-stat-icon" style={{ color: stat.color }}>
                {stat.icon}
              </span>
              <div className="seller-bids-stat-text">
                <span className="text-label-md text-primary" style={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {stat.value}
                </span>
                <span className="text-caption text-on-surface-variant uppercase">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="split-layout seller-bids-layout" style={{ marginTop: 32, gap: 48 }}>
          <div className="flex flex-col gap-20">
            <div className="section-header" style={{ marginBottom: 0, paddingBottom: 12 }}>
              <h2 className="text-headline-md text-primary">Your Active Auctions</h2>
              {!isLoading && (
                <span className="text-label-sm text-on-surface-variant uppercase">
                  {activeAuctions.length} listing{activeAuctions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="bids-auction-list">
                {[1, 2].map((i) => (
                  <div key={i} className="bids-auction-list-card seller-auction-card" style={{ padding: 16 }}>
                    <div className="skeleton" style={{ width: 160, minHeight: 200, borderRadius: "var(--radius-md)", flexShrink: 0 }} />
                    <div className="flex flex-col grow gap-12" style={{ padding: '8px 0' }}>
                      <div className="skeleton" style={{ width: "55%", height: 24 }} />
                      <div className="skeleton" style={{ width: "35%", height: 16 }} />
                      <div className="skeleton" style={{ width: "100%", height: 56 }} />
                      <div className="skeleton" style={{ width: "70%", height: 36 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeAuctions.length > 0 ? (
              <div className="bids-auction-list">
                {activeAuctions.map((auction) => renderAuctionCard(auction))}
              </div>
            ) : (
              <div className="empty-state" style={{ paddingTop: 32, paddingBottom: 32 }}>
                <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>gavel</span>
                <p className="text-body-lg text-on-surface-variant">You have no active auctions. Create one to get started!</p>
                <Button variant="primary" size="md" icon="add" iconPosition="left" onClick={openCreateModal} style={{ marginTop: 16 }}>
                  Create Auction
                </Button>
              </div>
            )}
          </div>

          <aside className="seller-bids-sidebar flex flex-col gap-20">
            <div className="seller-bids-sidebar-panel">
              <h3 className="text-label-md text-on-surface-variant uppercase" style={{ marginBottom: 12, letterSpacing: '0.06em' }}>
                Auction Tips
              </h3>
              <ul className="flex flex-col gap-10">
                {[
                  "Set a reserve price to protect your minimum value.",
                  "Enable auto-extend to prevent last-second sniping.",
                  "Upload high-res images to attract more bids.",
                  "Share your auction on CharchaSabha to boost visibility.",
                ].map((tip, i) => (
                  <li key={i} className="seller-bids-tip">
                    <Icon name="lightbulb" size={16} className="text-accent-gold" />
                    <span className="text-body-sm text-on-surface-variant">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="seller-bids-sidebar-panel">
              <h3 className="text-label-md text-on-surface-variant uppercase" style={{ marginBottom: 12, letterSpacing: '0.06em' }}>
                Completed Auctions
              </h3>
              <ul className="flex flex-col gap-12">
                <li className="flex justify-between border-b border-outline-variant pb-2">
                  <span className="text-body-sm text-on-surface-variant">Total Completed</span>
                  <span className="text-body-sm text-primary font-bold">{stats.completedCount}</span>
                </li>
                <li className="flex justify-between border-b border-outline-variant pb-2">
                  <span className="text-body-sm text-on-surface-variant">Avg. Final Bid</span>
                  <span className="text-body-sm text-primary font-bold">
                    {stats.avgFinalBid > 0 ? `₹${stats.avgFinalBid.toLocaleString('en-IN')}` : '—'}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-body-sm text-on-surface-variant">Highest Sale</span>
                  <span className="text-body-sm text-accent-gold font-bold">
                    {stats.highestSale > 0 ? `₹${stats.highestSale.toLocaleString('en-IN')}` : '—'}
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
