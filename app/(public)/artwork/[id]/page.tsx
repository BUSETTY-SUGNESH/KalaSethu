'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getArtwork, incrementArtworkViews } from "@/lib/services/artwork-service";
import { useCartStore } from "@/lib/stores/cart-store";
import { useUIStore } from "@/lib/stores/ui-store";
import type { Artwork } from "@/app/types";

export default function ArtworkDetailsPage() {
  const params = useParams();
  const artworkId = params.id as string;
  
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    async function loadArtwork() {
      if (!artworkId) return;
      try {
        const data = await getArtwork(artworkId);
        if (data) {
          setArtwork(data);
          // Increment view count in background
          incrementArtworkViews(artworkId).catch(console.error);
        }
      } catch (error) {
        console.error("Failed to load artwork", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadArtwork();
  }, [artworkId]);

  function handleAddToCart() {
    if (!artwork) return;
    
    addItem({
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      artistId: artwork.artistId,
      artistName: artwork.artistName,
      price: artwork.price,
      artworkImageUrl: artwork.thumbnailUrl || artwork.images[0]?.url || '',
    });
    
    addToast({
      type: 'success',
      title: 'Added to Cart',
      message: `${artwork.title} has been added to your cart.`,
    });
  }

  if (isLoading) {
    return (
      <div className="container section-gap">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
          <div className="flex flex-col gap-16">
            <div className="skeleton" style={{ width: "100%", aspectRatio: "1/1", borderRadius: "var(--radius-md)" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: "1/1", borderRadius: "var(--radius-md)" }} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-32">
            <div className="skeleton" style={{ width: "40%", height: 32 }} />
            <div className="skeleton" style={{ width: "80%", height: 64 }} />
            <div className="skeleton" style={{ width: "30%", height: 40 }} />
            <div className="skeleton" style={{ width: "100%", height: 56, borderRadius: "var(--radius-pill)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="container section-gap empty-state">
        <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>
          visibility_off
        </span>
        <h1 className="text-display-sm text-primary">Artwork Not Found</h1>
        <p className="text-body-lg text-on-surface-variant">
          This piece might have been removed or is no longer available.
        </p>
        <Link href="/marketplace">
          <Button variant="primary" style={{ marginTop: 24 }}>Back to KalaMarket</Button>
        </Link>
      </div>
    );
  }

  const images = artwork.images.length > 0 ? artwork.images : [{ url: 'https://placehold.co/800x800', isPrimary: true }];

  return (
    <>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="breadcrumb">
          <Link href="/marketplace">KalaMarket</Link>
          <Icon name="chevron_right" size={16} />
          <Link href={`/marketplace?category=${artwork.category}`}>{artwork.category}</Link>
          <Icon name="chevron_right" size={16} />
          <span className="current">{artwork.title}</span>
        </div>
      </div>

      <section className="container" style={{ paddingBottom: 80 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
          {/* Left Column: Image Gallery */}
          <div className="flex flex-col gap-16">
            <div className="bg-surface-container-low" style={{ width: "100%", aspectRatio: "1/1", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
              <img 
                src={images[activeImageIndex].url} 
                alt={artwork.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            {images.length > 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {images.map((img, idx) => (
                  <div 
                    key={idx} 
                    className="bg-surface-container-lowest" 
                    onClick={() => setActiveImageIndex(idx)}
                    style={{ 
                      aspectRatio: "1/1", 
                      borderRadius: "var(--radius-md)", 
                      cursor: "pointer", 
                      border: idx === activeImageIndex ? "2px solid var(--color-primary)" : "1px solid rgba(196, 199, 199, 0.2)", 
                      overflow: "hidden" 
                    }}
                  >
                    <img 
                      src={img.url} 
                      alt={`Thumbnail ${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: idx === activeImageIndex ? 1 : 0.6 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details & Actions */}
          <div className="flex flex-col gap-32">
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <Link href={`/profile/${artwork.artistId}`} className="flex items-center gap-8 text-label-md text-on-surface-variant uppercase hover:text-primary transition-colors">
                  <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {artwork.artistName.charAt(0)}
                  </div>
                  {artwork.artistName}
                  <Icon name="verified" size={16} className="text-accent-emerald" />
                </Link>
                <div className="flex gap-16">
                  <button className="btn-ghost" aria-label="Share" onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    addToast({ type: 'info', title: 'Link copied', message: 'Artwork link copied to clipboard.' });
                  }}>
                    <Icon name="share" />
                  </button>
                  <button className="btn-ghost" aria-label="Favorite">
                    <Icon name="favorite_border" />
                  </button>
                </div>
              </div>

              <h1 className="text-display-lg text-primary" style={{ marginBottom: 16 }}>{artwork.title}</h1>
              <p className="text-body-lg text-on-surface-variant" style={{ marginBottom: 32, whiteSpace: 'pre-line' }}>
                {artwork.description}
              </p>

              <div className="flex items-center gap-16" style={{ paddingBottom: 32, borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
                <span className="text-price-lg text-primary">₹{artwork.price.toLocaleString('en-IN')}</span>
                <span className="text-body-md text-on-surface-variant">Taxes included</span>
              </div>
            </div>

            <div className="flex flex-col gap-16">
              <Button 
                variant="primary" 
                size="lg" 
                fullWidth 
                onClick={handleAddToCart}
                disabled={artwork.status !== 'published'}
              >
                {artwork.status === 'published' ? 'Add to Cart' : `Currently ${artwork.status}`}
              </Button>
              <Button variant="outline" size="lg" fullWidth disabled={artwork.status !== 'published'}>
                Make an Offer
              </Button>
            </div>

            <div className="trust-grid" style={{ marginTop: 16 }}>
              <div className="trust-item">
                <div className="trust-icon-wrap"><Icon name="verified_user" size={32} /></div>
                <div>
                  <h4 className="text-label-md text-primary">Authenticity Guaranteed</h4>
                  <p className="text-caption text-on-surface-variant">Verified provenance by KalaSetu experts</p>
                </div>
              </div>
              <div className="trust-item">
                <div className="trust-icon-wrap"><Icon name="local_shipping" size={32} /></div>
                <div>
                  <h4 className="text-label-md text-primary">Secure Shipping</h4>
                  <p className="text-caption text-on-surface-variant">Fully insured specialized art transport</p>
                </div>
              </div>
            </div>
            
            <div className="bg-surface-container-lowest" style={{ padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Artwork Details</h3>
              <ul className="flex flex-col gap-12 text-body-md text-on-surface">
                {artwork.medium && (
                  <li className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-on-surface-variant">Medium</span>
                    <span>{artwork.medium}</span>
                  </li>
                )}
                {artwork.dimensions && (
                  <li className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-on-surface-variant">Dimensions</span>
                    <span>{artwork.dimensions}</span>
                  </li>
                )}
                {artwork.year && (
                  <li className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-on-surface-variant">Year</span>
                    <span>{artwork.year}</span>
                  </li>
                )}
                <li className="flex justify-between">
                  <span className="text-on-surface-variant">Category</span>
                  <span className="capitalize">{artwork.category}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
