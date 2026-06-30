'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/app/components/ui/Icon';
import Button from '@/app/components/ui/Button';
import ArtworkBreadcrumb from '@/app/components/artwork/ArtworkBreadcrumb';
import ArtworkImageGallery from '@/app/components/artwork/ArtworkImageGallery';
import ArtworkMetadataPanel from '@/app/components/artwork/ArtworkMetadataPanel';
import ArtworkTrustBadges from '@/app/components/artwork/ArtworkTrustBadges';
import FixedPriceActions from '@/app/components/artwork/FixedPriceActions';
import AuctionBiddingPanel from '@/app/components/artwork/AuctionBiddingPanel';
import { getArtwork, incrementArtworkViews } from '@/lib/services/artwork-service';
import { getAuctionForArtwork, getAuctionBids } from '@/lib/services/auction-service';
import { useCartStore } from '@/lib/stores/cart-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Artwork, Auction, Bid } from '@/app/types';
import { buildArtworkBreadcrumbs } from '@/lib/utils/artwork-breadcrumbs';
import {
  resolveArtworkListingMode,
  showsAuctionUi,
  showsPurchaseUi,
} from '@/lib/utils/artwork-listing-state';
import { canViewArtwork, isPubliclyVisible } from '@/lib/utils/artwork-visibility';

interface ArtworkDetailsClientProps {
  artworkId: string;
  initialArtwork: Artwork | null;
  initialAuction: Auction | null;
  initialBids: Bid[];
}

function AuctionStatusBadge({ auction }: { auction: Auction }) {
  const isEnded =
    auction.status === 'ended' || new Date(auction.endsAt).getTime() < Date.now();
  const isNotStarted =
    auction.status === 'scheduled' && new Date(auction.startsAt).getTime() > Date.now();

  if (isEnded) {
    return (
      <div
        className="verified-badge"
        style={{
          backgroundColor: 'var(--color-surface-container-high)',
          color: 'var(--color-on-surface-variant)',
        }}
      >
        Ended
      </div>
    );
  }

  if (isNotStarted) {
    return (
      <div
        className="verified-badge"
        style={{
          backgroundColor: 'var(--color-surface-container-high)',
          color: 'var(--color-on-surface-variant)',
        }}
      >
        Scheduled
      </div>
    );
  }

  return (
    <div className="verified-badge">
      <div className="status-dot pulse" style={{ marginRight: 4 }} /> Live
    </div>
  );
}

export default function ArtworkDetailsClient({
  artworkId,
  initialArtwork,
  initialAuction,
  initialBids,
}: ArtworkDetailsClientProps) {
  const [artwork, setArtwork] = useState<Artwork | null>(initialArtwork);
  const [auction, setAuction] = useState<Auction | null>(initialAuction);
  const [bids, setBids] = useState<Bid[]>(initialBids);
  const [isLoading, setIsLoading] = useState(!initialArtwork);

  const addItem = useCartStore((s) => s.addItem);
  const addToast = useUIStore((s) => s.addToast);
  const { user, isAdmin, isModerator } = useAuthStore();

  useEffect(() => {
    async function loadArtwork() {
      if (!artworkId) return;

      if (initialArtwork) {
        setArtwork(initialArtwork);
        setAuction(initialAuction);
        setBids(initialBids);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setArtwork(null);
      setAuction(null);
      setBids([]);

      try {
        const data = await getArtwork(artworkId);
        const isStaff = isAdmin() || isModerator();
        if (data && canViewArtwork(data, user?.id, isStaff)) {
          setArtwork(data);
          const auctionData = await getAuctionForArtwork(artworkId);
          setAuction(auctionData);
          if (auctionData) {
            setBids(await getAuctionBids(auctionData.id));
          }
          if (data.status === 'published') {
            incrementArtworkViews(artworkId).catch(() => {});
          }
        }
      } catch (error) {
        console.error('Failed to load artwork', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadArtwork();
  }, [artworkId, initialArtwork, initialAuction, initialBids, user?.id, isAdmin, isModerator]);

  useEffect(() => {
    if (!artwork || !initialArtwork) return;
    if (isPubliclyVisible(artwork)) return;
    if (!user) return;
    const isStaff = isAdmin() || isModerator();
    if (!canViewArtwork(artwork, user.id, isStaff)) {
      setArtwork(null);
    }
  }, [artwork, initialArtwork, user, isAdmin, isModerator]);

  useEffect(() => {
    if (artwork?.status === 'published' && initialArtwork) {
      incrementArtworkViews(artworkId).catch(() => {});
    }
  }, [artwork?.status, artworkId, initialArtwork]);

  const listingMode = useMemo(
    () => (artwork ? resolveArtworkListingMode(artwork, auction) : 'unavailable'),
    [artwork, auction]
  );

  const breadcrumbs = useMemo(
    () => (artwork ? buildArtworkBreadcrumbs(artwork, listingMode) : []),
    [artwork, listingMode]
  );

  function handleAddToCart() {
    if (!artwork || !showsPurchaseUi(listingMode)) return;

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
          <div className="skeleton" style={{ width: '100%', aspectRatio: '1/1', borderRadius: 'var(--radius-md)' }} />
          <div className="flex flex-col gap-32">
            <div className="skeleton" style={{ width: '80%', height: 64 }} />
            <div className="skeleton" style={{ width: '100%', height: 56, borderRadius: 'var(--radius-pill)' }} />
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
          <Button variant="primary" style={{ marginTop: 24 }}>
            Back to KalaMarket
          </Button>
        </Link>
      </div>
    );
  }

  const galleryImages =
    artwork.images.length > 0
      ? artwork.images.map((img) => ({ url: img.url }))
      : artwork.thumbnailUrl
        ? [{ url: artwork.thumbnailUrl }]
        : [];

  return (
    <>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <ArtworkBreadcrumb segments={breadcrumbs} />
      </div>

      <section className="container" style={{ paddingBottom: 80 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
          <ArtworkImageGallery title={artwork.title} images={galleryImages} />

          <div className="flex flex-col gap-32">
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <Link
                  href={`/profile/${artwork.artistId}`}
                  className="flex items-center gap-8 text-label-md text-on-surface-variant uppercase hover:text-primary transition-colors"
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {artwork.artistName.charAt(0)}
                  </div>
                  {artwork.artistName}
                  <Icon name="verified" size={16} className="text-accent-emerald" />
                </Link>

                {showsAuctionUi(listingMode) && auction ? (
                  <AuctionStatusBadge auction={auction} />
                ) : (
                  <div className="flex gap-16">
                    <button
                      type="button"
                      className="btn-ghost"
                      aria-label="Share"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        addToast({
                          type: 'info',
                          title: 'Link copied',
                          message: 'Artwork link copied to clipboard.',
                        });
                      }}
                    >
                      <Icon name="share" />
                    </button>
                    <button type="button" className="btn-ghost" aria-label="Favorite">
                      <Icon name="favorite_border" />
                    </button>
                  </div>
                )}
              </div>

              <h1 className="text-display-lg text-primary" style={{ marginBottom: 16 }}>
                {artwork.title}
              </h1>
              <p
                className="text-body-lg text-on-surface-variant"
                style={{ marginBottom: 32, whiteSpace: 'pre-line' }}
              >
                {artwork.description}
              </p>
            </div>

            {showsAuctionUi(listingMode) && auction ? (
              <AuctionBiddingPanel initialAuction={auction} initialBids={initialBids} />
            ) : showsPurchaseUi(listingMode) ? (
              <>
                <FixedPriceActions
                  artwork={artwork}
                  mode={listingMode}
                  onAddToCart={handleAddToCart}
                />
                <ArtworkTrustBadges />
              </>
            ) : (
              <div
                className="bg-surface-container-lowest"
                style={{
                  padding: 24,
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(196, 199, 199, 0.2)',
                }}
              >
                <p className="text-body-md text-on-surface-variant">
                  {listingMode === 'sold'
                    ? 'This artwork has been sold and is no longer available for purchase.'
                    : 'This artwork is not currently available for purchase.'}
                </p>
              </div>
            )}

            {!showsAuctionUi(listingMode) && <ArtworkMetadataPanel artwork={artwork} />}
          </div>
        </div>

        {showsAuctionUi(listingMode) && <div style={{ marginTop: 48 }}><ArtworkMetadataPanel artwork={artwork} /></div>}
      </section>
    </>
  );
}
