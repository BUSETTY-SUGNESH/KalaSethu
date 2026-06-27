'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { getArtworksByArtist, deleteArtwork } from "@/lib/services/artwork-service";
import type { Artwork } from "@/app/types";

export default function ArtistStudioPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadArtworks();
    }
  }, [user]);

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
    if (!confirm("Are you sure you want to delete this artwork? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteArtwork(artworkId);
      setArtworks(artworks.filter(a => a.id !== artworkId));
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
          <div className="flex items-center gap-8 text-primary" style={{ marginBottom: 8 }}>
            <Icon name="palette" size={24} />
            <span className="text-label-md uppercase tracking-wider">Artist Studio</span>
          </div>
          <h1 className="text-headline-lg text-primary">Your Workspace</h1>
        </div>
        <div className="flex gap-12">
          <Button
            variant="outline"
            icon="local_shipping"
            iconPosition="left"
            href="/dashboard/artist/orders"
          >
            Sales Orders
          </Button>
          <Button 
            variant="outline" 
            icon="visibility" 
            iconPosition="left"
            href={user ? `/profile/${user.id}` : "#"}
          >
            View Public Profile
          </Button>
          <Button 
            variant="primary" 
            icon="add" 
            iconPosition="left"
            href="/dashboard/artist/upload"
          >
            Upload Artwork
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 48 }}>
        <div className="metric-card">
          <Icon name="inventory_2" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Total Artworks</span>
          <span className="text-display-lg text-primary">{isLoading ? "..." : artworks.length}</span>
        </div>
        <div className="metric-card">
          <Icon name="visibility" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Followers</span>
          <span className="text-display-lg text-primary">{user?.followerCount || 0}</span>
        </div>
        <div className="metric-card">
          <Icon name="payments" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Sales Count</span>
          <span className="text-display-lg text-primary">{user?.salesCount || 0}</span>
        </div>
      </div>

      <h2 className="text-headline-md text-primary mb-4" style={{ marginBottom: 24 }}>Manage Inventory</h2>
      
      <div className="card overflow-hidden">
        <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
          <div className="header-search" style={{ margin: 0 }}>
            <Icon name="search" size={20} />
            <input type="text" placeholder="Search your artworks..." disabled={artworks.length === 0} />
          </div>
          <div className="flex gap-8">
            <button className="btn btn-ghost text-label-md" disabled={artworks.length === 0}><Icon name="filter_list" size={18} /> Filter</button>
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
              {[1, 2].map(i => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 4 }} />
              ))}
            </div>
          ) : artworks.length === 0 ? (
            <div className="text-center p-32 text-on-surface-variant italic">
              No artworks found in your portfolio. Click "Upload Artwork" to add one.
            </div>
          ) : (
            artworks.map((item) => (
              <div key={item.id} className="mod-table-row px-6 hover:bg-surface-container-low transition-colors" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.1)" }}>
                <div className="flex items-center gap-12">
                  <img src={item.thumbnailUrl || "/placeholder-artwork.jpg"} alt={item.title} style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", objectFit: "cover" }} />
                  <span className="text-title-md text-primary">{item.title}</span>
                </div>
                <div>
                  <span className={`status-pill ${item.status === 'published' ? 'completed' : item.status === 'sold' ? 'shipped' : 'pending'}`}>
                    {item.status}
                  </span>
                </div>
                <div className="text-body-md text-primary font-bold">₹{item.price.toLocaleString('en-IN')}</div>
                <div className="flex gap-8">
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="btn-icon bg-surface-container-high rounded-full hover:bg-error/10 hover:text-error transition-colors text-primary"
                    title="Delete Artwork"
                    style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
                  >
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
