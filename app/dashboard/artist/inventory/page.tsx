'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { getArtworksByArtist, deleteArtwork } from "@/lib/services/artwork-service";
import type { Artwork, ArtworkStatus } from "@/app/types";
import { ARTWORK_PLACEHOLDER } from "@/lib/constants/placeholders";

const STATUS_FILTER_OPTIONS: { value: ArtworkStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'published', label: 'Published' },
  { value: 'sold', label: 'Sold' },
  { value: 'archived', label: 'Archived' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ArtistInventoryPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArtworkStatus | 'all'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadArtworks();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredArtworks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return artworks.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!query) return true;
      return [item.title, item.category, item.medium, ...(item.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [artworks, searchQuery, statusFilter]);

  const activeFilterLabel =
    STATUS_FILTER_OPTIONS.find((opt) => opt.value === statusFilter)?.label ?? 'Filter';

  async function loadArtworks() {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await getArtworksByArtist(user.id, 100);
      setArtworks(result.data || []);
    } catch (error) {
      console.error("Failed to load artworks:", error);
      addToast({ type: "error", title: "Error", message: "Failed to load your artworks." });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(artworkId: string) {
    if (!confirm("Are you sure you want to delete this artwork? This action cannot be undone.")) return;
    try {
      await deleteArtwork(artworkId);
      setArtworks(artworks.filter((a) => a.id !== artworkId));
      addToast({ type: "success", title: "Artwork Deleted", message: "Your artwork was successfully deleted." });
    } catch (error) {
      console.error("Failed to delete artwork:", error);
      addToast({ type: "error", title: "Delete Failed", message: "Could not delete the artwork." });
    }
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8" style={{ marginBottom: 32 }}>
        <div>
          <p className="text-label-md text-primary uppercase tracking-wider" style={{ marginBottom: 8 }}>Inventory</p>
          <h1 className="text-headline-lg text-primary">Your Artworks</h1>
          <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
            Manage drafts, listings, and sold pieces.
          </p>
        </div>
        <Button variant="primary" icon="add" iconPosition="left" href="/dashboard/artist/upload">
          Upload Artwork
        </Button>
      </div>

      <div className="card overflow-hidden">
        <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
          <div className="header-search" style={{ margin: 0 }}>
            <Icon name="search" size={20} />
            <input
              type="text"
              placeholder="Search your artworks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-8 relative" ref={filterRef}>
            <button
              type="button"
              className="btn btn-ghost text-label-md"
              disabled={isLoading}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Icon name="filter_list" size={18} /> {statusFilter === 'all' ? 'Filter' : activeFilterLabel}
            </button>
            <div
              className="dropdown-menu"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                width: "200px",
                backgroundColor: "var(--color-ink-charcoal)",
                color: "var(--color-surface)",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.24)",
                zIndex: 50,
                opacity: isFilterOpen ? 1 : 0,
                pointerEvents: isFilterOpen ? "auto" : "none",
              }}
            >
              <div style={{ padding: "12px 8px" }}>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="btn-ghost"
                    style={{ width: "100%", textAlign: "left", padding: "8px 16px" }}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setIsFilterOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mod-table-header px-6 bg-surface-container-lowest text-label-sm text-on-surface-variant uppercase" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
          <div>Artwork</div>
          <div>Status</div>
          <div>Price</div>
          <div>Actions</div>
        </div>

        <div className="flex flex-col">
          {isLoading ? (
            <div className="flex flex-col gap-16 p-24" style={{ padding: 24 }}>
              {[1, 2].map((i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 4 }} />
              ))}
            </div>
          ) : filteredArtworks.length === 0 ? (
            <div className="text-center p-32 text-on-surface-variant italic">
              {artworks.length === 0
                ? 'No artworks yet. Upload your first piece to get started.'
                : 'No artworks match your search or filter.'}
            </div>
          ) : (
            filteredArtworks.map((item) => (
              <div key={item.id} className="mod-table-row px-6 hover:bg-surface-container-low transition-colors" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.1)" }}>
                <div className="flex items-center gap-12">
                  <div style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
                    <Image src={item.thumbnailUrl || ARTWORK_PLACEHOLDER} alt={item.title} fill sizes="48px" style={{ objectFit: "cover" }} />
                  </div>
                  <span className="text-title-md text-primary">{item.title}</span>
                </div>
                <div>
                  <span className={`status-pill ${item.status === 'published' ? 'completed' : item.status === 'sold' ? 'shipped' : 'pending'}`}>
                    {item.status}
                  </span>
                </div>
                <div className="text-body-md text-primary font-bold">₹{item.price.toLocaleString('en-IN')}</div>
                <div className="flex gap-8">
                  <Link href={`/dashboard/artist/edit/${item.id}`} className="btn-icon bg-surface-container-high rounded-full text-primary" style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="edit" size={20} />
                  </Link>
                  <button onClick={() => handleDelete(item.id)} className="btn-icon bg-surface-container-high rounded-full text-primary" style={{ width: 36, height: 36, border: "none", cursor: "pointer" }}>
                    <Icon name="delete" size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
