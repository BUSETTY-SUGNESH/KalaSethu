import type { Artwork } from '@/app/types';

export function isPubliclyVisible(artwork: Artwork): boolean {
  return (
    artwork.status === 'published' ||
    (artwork.listingType === 'auction' &&
      artwork.status !== 'draft' &&
      artwork.status !== 'archived')
  );
}

export function canViewArtwork(
  artwork: Artwork,
  userId: string | undefined,
  isStaff: boolean
): boolean {
  if (isPubliclyVisible(artwork)) return true;
  if (userId && userId === artwork.artistId) return true;
  return isStaff;
}
