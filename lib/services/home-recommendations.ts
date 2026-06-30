// ============================================================
// KalaSetu — Home Page Personalized Recommendations (client)
// Derives suggestions from bookmarks, bids, and followed artists.
// ============================================================
import type { Artwork } from '@/app/types';
import { getArtwork, getPublishedArtworks, getPublishedArtworksByArtist } from '@/lib/services/artwork-service';
import { getUserBookmarks, getFollowing } from '@/lib/services/community-service';
import { getAuctionsByIds, getUserBids } from '@/lib/services/auction-service';

const CACHE_KEY = 'kalasethu_home_recommendations';
const CACHE_TTL_MS = 5 * 60 * 1000;

type RecommendationCache = {
  userId: string;
  fetchedAt: number;
  artworks: Artwork[];
};

function readCache(userId: string): Artwork[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecommendationCache;
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.artworks;
  } catch {
    return null;
  }
}

function writeCache(userId: string, artworks: Artwork[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: RecommendationCache = { userId, fetchedAt: Date.now(), artworks };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

function dedupeArtworks(items: Artwork[], excludeIds: Set<string>, limit: number): Artwork[] {
  const seen = new Set<string>(excludeIds);
  const result: Artwork[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    if (item.status !== 'published') continue;
    seen.add(item.id);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

export async function getPersonalizedArtworks(
  userId: string,
  excludeIds: string[] = [],
  limit = 8
): Promise<Artwork[]> {
  const cached = readCache(userId);
  if (cached) {
    return dedupeArtworks(cached, new Set(excludeIds), limit);
  }

  const exclude = new Set(excludeIds);
  const collected: Artwork[] = [];

  try {
    const [bookmarks, following, bidsResult] = await Promise.all([
      getUserBookmarks(userId, 'artwork'),
      getFollowing(userId, 30),
      getUserBids(userId, 15),
    ]);

    const bookmarkIds = bookmarks.map((b) => b.targetId).filter(Boolean).slice(0, 8);
    const bookmarkArtworks = (
      await Promise.all(bookmarkIds.map((id) => getArtwork(id)))
    ).filter((a): a is Artwork => !!a);

    const categories = new Set<string>();
    const mediums = new Set<string>();
    for (const a of bookmarkArtworks) {
      if (a.category) categories.add(a.category);
      if (a.medium) mediums.add(a.medium);
    }

    const auctionIds = [...new Set(bidsResult.data.map((b) => b.auctionId).filter(Boolean))];
    if (auctionIds.length > 0) {
      const auctions = await getAuctionsByIds(auctionIds);
      const bidArtworkIds = auctions.map((a) => a.artworkId).filter(Boolean).slice(0, 6);
      const bidArtworks = (
        await Promise.all(bidArtworkIds.map((id) => getArtwork(id)))
      ).filter((a): a is Artwork => !!a);
      for (const a of bidArtworks) {
        if (a.category) categories.add(a.category);
      }
      collected.push(...bidArtworks);
    }

    const categoryList = [...categories].slice(0, 3);
    for (const category of categoryList) {
      const result = await getPublishedArtworks(6, null, { category, sortBy: 'popular' });
      collected.push(...result.data);
    }

    if (collected.length < limit && mediums.size > 0) {
      const medium = [...mediums][0];
      const result = await getPublishedArtworks(6, null, { medium, sortBy: 'newest' });
      collected.push(...result.data);
    }

    const followedIds = following.map((f) => f.followingId).slice(0, 5);
    for (const artistId of followedIds) {
      const result = await getPublishedArtworksByArtist(artistId, 3);
      collected.push(...result.data);
    }

    if (collected.length < limit) {
      const fallback = await getPublishedArtworks(limit * 2, null, { sortBy: 'popular' });
      collected.push(...fallback.data);
    }

    const deduped = dedupeArtworks(collected, exclude, limit);
    writeCache(userId, deduped);
    return deduped;
  } catch (error) {
    console.error('Failed to load personalized artworks', error);
    return [];
  }
}
