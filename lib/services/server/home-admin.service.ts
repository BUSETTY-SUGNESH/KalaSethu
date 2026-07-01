import { getAdminDb } from '@/lib/firebase/admin-db';
import type { Artwork, Auction, CalendarEvent, MarketplaceCategorySummary, Post, UserProfile } from '@/app/types';
import { getMarketplaceCategorySummariesServer } from '@/lib/services/server/artwork-admin.service';

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

function mapArtworkDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): Artwork {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toIsoString(data.createdAt) ?? data.createdAt,
    updatedAt: toIsoString(data.updatedAt) ?? data.updatedAt,
    publishedAt: toIsoString(data.publishedAt) ?? data.publishedAt,
  } as Artwork;
}

function mapAuctionDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): Auction {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toIsoString(data.createdAt) ?? data.createdAt,
    updatedAt: toIsoString(data.updatedAt) ?? data.updatedAt,
  } as Auction;
}

function mapPostDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): Post {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toIsoString(data.createdAt) ?? data.createdAt,
    updatedAt: toIsoString(data.updatedAt) ?? data.updatedAt,
  } as Post;
}

function mapEventDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): CalendarEvent {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    startDate: toIsoString(data.startDate) ?? data.startDate,
    endDate: toIsoString(data.endDate) ?? data.endDate,
    createdAt: toIsoString(data.createdAt) ?? data.createdAt,
    updatedAt: toIsoString(data.updatedAt) ?? data.updatedAt,
  } as CalendarEvent;
}

function mapUserProfileDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): UserProfile {
  const data = doc.data();
  const role = data.role === 'collector' ? 'user' : data.role;
  return { id: doc.id, ...data, role } as UserProfile;
}

export interface HomeBuyerData {
  heroArtwork: Artwork | null;
  trendingArtworks: Artwork[];
  recentlyListed: Artwork[];
  recentlySold: Artwork[];
  featuredArtists: UserProfile[];
  endingSoonAuctions: Auction[];
  trendingPosts: Post[];
  upcomingEvents: CalendarEvent[];
  categories: MarketplaceCategorySummary[];
}

export async function getFeaturedArtworksServer(count: number = 1): Promise<Artwork[]> {
  try {
    const db = await getAdminDb();
    const snapshot = await db
      .collection('artworks')
      .where('status', '==', 'published')
      .where('isFeatured', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(count)
      .get();
    return snapshot.docs.map(mapArtworkDoc);
  } catch (error) {
    console.error('Error fetching featured artworks server-side:', error);
    return [];
  }
}

export async function getFeaturedArtistsServer(count: number = 8): Promise<UserProfile[]> {
  try {
    const db = await getAdminDb();
    const snapshot = await db
      .collection('users')
      .where('role', 'in', ['artist', 'verified_artist'])
      .where('isVerified', '==', true)
      .orderBy('followerCount', 'desc')
      .limit(count)
      .get();
    return snapshot.docs.map(mapUserProfileDoc);
  } catch (error) {
    console.error('Error fetching featured artists server-side:', error);
    return [];
  }
}

export async function getEndingSoonAuctionsServer(count: number = 6): Promise<Auction[]> {
  try {
    const db = await getAdminDb();
    const snapshot = await db
      .collection('auctions')
      .where('status', 'in', ['live', 'ending_soon'])
      .orderBy('endsAt', 'asc')
      .limit(count)
      .get();
    return snapshot.docs.map(mapAuctionDoc);
  } catch (error) {
    console.error('Error fetching ending-soon auctions server-side:', error);
    return [];
  }
}

export async function getTrendingPostsServer(count: number = 3): Promise<Post[]> {
  try {
    const db = await getAdminDb();
    const snapshot = await db
      .collection('posts')
      .where('isTrending', '==', true)
      .orderBy('likeCount', 'desc')
      .limit(count)
      .get();
    return snapshot.docs.map(mapPostDoc);
  } catch (error) {
    console.error('Error fetching trending posts server-side:', error);
    return [];
  }
}

export async function getUpcomingEventsServer(count: number = 4): Promise<CalendarEvent[]> {
  try {
    const db = await getAdminDb();
    const snapshot = await db
      .collection('events')
      .where('status', '==', 'upcoming')
      .orderBy('startDate', 'asc')
      .limit(count)
      .get();
    return snapshot.docs.map(mapEventDoc);
  } catch (error) {
    console.error('Error fetching upcoming events server-side:', error);
    return [];
  }
}

export async function getTrendingArtworksServer(count: number = 8): Promise<Artwork[]> {
  try {
    const db = await getAdminDb();
    const snapshot = await db
      .collection('artworks')
      .where('status', '==', 'published')
      .orderBy('viewCount', 'desc')
      .limit(count + 4)
      .get();
    return snapshot.docs
      .map(mapArtworkDoc)
      .filter((a) => a.listingType === 'fixed_price' || a.listingType === 'auction')
      .slice(0, count);
  } catch (error) {
    console.error('Error fetching trending artworks server-side:', error);
    return [];
  }
}

export async function getRecentlyListedArtworksServer(count: number = 8): Promise<Artwork[]> {
  try {
    const db = await getAdminDb();
    const snapshot = await db
      .collection('artworks')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(count)
      .get();
    return snapshot.docs.map(mapArtworkDoc);
  } catch (error) {
    console.error('Error fetching recently listed artworks server-side:', error);
    return [];
  }
}

export async function getRecentlySoldArtworksServer(count: number = 6): Promise<Artwork[]> {
  try {
    const db = await getAdminDb();
    const snapshot = await db
      .collection('artworks')
      .where('status', '==', 'sold')
      .orderBy('updatedAt', 'desc')
      .limit(count)
      .get();
    return snapshot.docs.map(mapArtworkDoc);
  } catch (error) {
    console.error('Error fetching recently sold artworks server-side:', error);
    return [];
  }
}

export async function getHeroArtworkServer(): Promise<Artwork | null> {
  const featured = await getFeaturedArtworksServer(1);
  if (featured[0]) return featured[0];
  const trending = await getTrendingArtworksServer(1);
  if (trending[0]) return trending[0];
  const recent = await getRecentlyListedArtworksServer(1);
  return recent[0] ?? null;
}

export async function getHomeBuyerDataServer(): Promise<HomeBuyerData> {
  const [
    heroArtwork,
    trendingArtworks,
    recentlyListed,
    recentlySold,
    featuredArtists,
    endingSoonAuctions,
    trendingPosts,
    upcomingEvents,
    categories,
  ] = await Promise.all([
    getHeroArtworkServer(),
    getTrendingArtworksServer(8),
    getRecentlyListedArtworksServer(8),
    getRecentlySoldArtworksServer(6),
    getFeaturedArtistsServer(8),
    getEndingSoonAuctionsServer(6),
    getTrendingPostsServer(3),
    getUpcomingEventsServer(4),
    getMarketplaceCategorySummariesServer(),
  ]);

  const populatedCategories = categories.filter((c) => c.artworkCount > 0);

  return {
    heroArtwork,
    trendingArtworks,
    recentlyListed,
    recentlySold,
    featuredArtists,
    endingSoonAuctions,
    trendingPosts,
    upcomingEvents,
    categories: populatedCategories,
  };
}
