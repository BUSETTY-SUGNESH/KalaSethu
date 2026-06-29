import { adminDb } from '@/lib/firebase/admin';
import type { Artwork, MarketplaceCategorySummary } from '@/app/types';
import type { ArtworkPaginationCursor } from '@/lib/firebase/firestore';
import { ARTWORK_CATEGORIES, CATEGORY_PLACEHOLDER_IMAGE } from '@/lib/constants/artwork-categories';

/**
 * Server-only service for fetching artworks using firebase-admin.
 * Do not import this in Client Components.
 */
export async function getPublishedArtworksServer(
  pageSize: number = 20,
  filters?: {
    category?: string;
    medium?: string;
    sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular';
  }
) {
  let query: FirebaseFirestore.Query = adminDb.collection('artworks').where('status', '==', 'published');

  if (filters?.category) {
    query = query.where('category', '==', filters.category);
  }
  if (filters?.medium) {
    query = query.where('medium', '==', filters.medium);
  }

  switch (filters?.sortBy) {
    case 'price_low':
      query = query.orderBy('price', 'asc');
      break;
    case 'price_high':
      query = query.orderBy('price', 'desc');
      break;
    case 'popular':
      query = query.orderBy('viewCount', 'desc');
      break;
    default:
      query = query.orderBy('createdAt', 'desc');
  }

  query = query.limit(pageSize + 1);

  const snapshot = await query.get();
  
  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  const data = docs.map(doc => {
    const docData = doc.data();
    return {
      id: doc.id,
      ...docData,
      // Ensure any potential Firebase admin Timestamps are converted to ISO strings
      // (Though the types imply createdAt is stored as a string already, this is a safeguard)
      createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : docData.createdAt,
      updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate().toISOString() : docData.updatedAt,
      publishedAt: docData.publishedAt?.toDate ? docData.publishedAt.toDate().toISOString() : docData.publishedAt,
    } as Artwork;
  });

  // Extract the sort field value from the last document for pagination
  let lastCursor: ArtworkPaginationCursor = null;
  if (docs.length > 0) {
    const lastDoc = docs[docs.length - 1];
    const lastDocData = lastDoc.data();
    switch (filters?.sortBy) {
      case 'price_low':
      case 'price_high':
        lastCursor = lastDocData.price;
        break;
      case 'popular':
        lastCursor = lastDocData.viewCount;
        break;
      default:
        lastCursor = lastDocData.createdAt;
    }
  }

  return {
    data,
    hasMore,
    lastCursor,
  };
}

export async function getMarketplaceCategorySummariesServer(): Promise<MarketplaceCategorySummary[]> {
  return Promise.all(
    ARTWORK_CATEGORIES.map(async ({ slug, label }) => {
      const baseQuery = adminDb
        .collection('artworks')
        .where('status', '==', 'published')
        .where('category', '==', slug);

      const [countSnap, repSnap] = await Promise.all([
        baseQuery.count().get(),
        baseQuery.orderBy('viewCount', 'desc').limit(1).get(),
      ]);

      const repData = repSnap.docs[0]?.data();
      const imageUrl =
        repData?.thumbnailUrl ||
        repData?.images?.[0]?.url ||
        CATEGORY_PLACEHOLDER_IMAGE;

      return {
        slug,
        label,
        artworkCount: countSnap.data().count,
        imageUrl,
      };
    })
  );
}
