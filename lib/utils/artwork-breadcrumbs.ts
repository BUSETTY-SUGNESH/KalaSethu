import type { Artwork } from '@/app/types';
import { getCategoryLabel } from '@/lib/constants/artwork-categories';
import type { ArtworkListingMode } from '@/lib/utils/artwork-listing-state';
import { showsAuctionUi } from '@/lib/utils/artwork-listing-state';

export interface BreadcrumbSegment {
  href?: string;
  label: string;
}

export function buildArtworkBreadcrumbs(
  artwork: Artwork,
  mode: ArtworkListingMode
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [
    { href: '/', label: 'Home' },
  ];

  if (showsAuctionUi(mode)) {
    segments.push({ href: '/bids', label: 'Bids' });
  } else {
    segments.push({ href: '/marketplace', label: 'KalaMarket' });
    segments.push({
      href: `/marketplace?category=${artwork.category}`,
      label: getCategoryLabel(artwork.category),
    });
  }

  segments.push({ label: artwork.title });
  return segments;
}
