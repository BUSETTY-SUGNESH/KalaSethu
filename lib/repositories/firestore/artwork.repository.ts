// ============================================================
// KalaSetu — Artwork Repository (Firestore Implementation)
// ============================================================
import {
  collections,
  docRef,
  getDoc,
  getDocs,
  getCountFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  paginatedQuery,
  type DocumentSnapshot,
  type ArtworkPaginationCursor,
  type QueryConstraint,
} from '@/lib/firebase/firestore';
import { emptyPaginatedResult, isValidQueryString, filterValidIds } from '@/lib/firebase/query-guards';
import type { Artwork, ArtworkStatus, MarketplaceCategorySummary, PaginatedResult } from '@/app/types';
import {
  ARTWORK_CATEGORIES,
  CATEGORY_PLACEHOLDER_IMAGE,
  findMatchingCategorySlugs,
} from '@/lib/constants/artwork-categories';

function getSearchTermVariants(term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return [];
  const titleCase = trimmed
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  const lower = trimmed.toLowerCase();
  return [...new Set([trimmed, titleCase, lower])];
}

export const artworkRepository = {
  async findById(id: string): Promise<Artwork | null> {
    if (!isValidQueryString(id)) return null;
    const snap = await getDoc(docRef.artwork(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Artwork;
  },

  async create(data: Omit<Artwork, 'id'>): Promise<string> {
    const ref = await addDoc(collections.artworks(), data);
    return ref.id;
  },

  async update(id: string, data: Partial<Artwork>): Promise<void> {
    await updateDoc(docRef.artwork(id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(docRef.artwork(id));
  },

  async setStatus(id: string, status: ArtworkStatus): Promise<void> {
    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status === 'published') updates.publishedAt = new Date().toISOString();
    await updateDoc(docRef.artwork(id), updates);
  },

  async incrementViews(id: string): Promise<void> {
    await updateDoc(docRef.artwork(id), { viewCount: increment(1) });
  },

  async incrementFavorites(id: string, delta: number): Promise<void> {
    await updateDoc(docRef.artwork(id), { favoriteCount: increment(delta) });
  },

  async findByArtist(
    artistId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Artwork>> {
    if (!isValidQueryString(artistId)) return emptyPaginatedResult<Artwork>();
    return paginatedQuery<Artwork>(
      collections.artworks(),
      [where('artistId', '==', artistId), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  async findPublishedByArtist(
    artistId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Artwork>> {
    if (!isValidQueryString(artistId)) return emptyPaginatedResult<Artwork>();
    return paginatedQuery<Artwork>(
      collections.artworks(),
      [
        where('artistId', '==', artistId),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc'),
      ],
      pageSize,
      lastDoc
    );
  },

  async findPublished(
    pageSize: number = 20,
    lastDoc?: ArtworkPaginationCursor,
    filters?: {
      category?: string;
      medium?: string;
      sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular';
    }
  ): Promise<PaginatedResult<Artwork>> {
    const constraints: QueryConstraint[] = [where('status', '==', 'published')];
    if (isValidQueryString(filters?.category)) {
      constraints.push(where('category', '==', filters.category));
    }
    if (isValidQueryString(filters?.medium)) {
      constraints.push(where('medium', '==', filters.medium));
    }
    switch (filters?.sortBy) {
      case 'price_low': constraints.push(orderBy('price', 'asc')); break;
      case 'price_high': constraints.push(orderBy('price', 'desc')); break;
      case 'popular': constraints.push(orderBy('viewCount', 'desc')); break;
      default: constraints.push(orderBy('createdAt', 'desc'));
    }
    return paginatedQuery<Artwork>(collections.artworks(), constraints, pageSize, lastDoc);
  },

  async findFeatured(count: number = 10): Promise<Artwork[]> {
    const q = query(
      collections.artworks(),
      where('status', '==', 'published'),
      where('isFeatured', '==', true),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Artwork);
  },

  async findByCategory(
    category: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Artwork>> {
    if (!isValidQueryString(category)) return emptyPaginatedResult<Artwork>();
    return paginatedQuery<Artwork>(
      collections.artworks(),
      [
        where('status', '==', 'published'),
        where('category', '==', category),
        orderBy('createdAt', 'desc'),
      ],
      pageSize,
      lastDoc
    );
  },

  async findPending(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Artwork>> {
    return paginatedQuery<Artwork>(
      collections.artworks(),
      [where('status', '==', 'pending'), orderBy('createdAt', 'asc')],
      pageSize,
      lastDoc
    );
  },

  async countPublishedByCategory(category: string): Promise<number> {
    const q = query(
      collections.artworks(),
      where('status', '==', 'published'),
      where('category', '==', category)
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  },

  async findRepresentativeByCategory(category: string): Promise<Artwork | null> {
    const q = query(
      collections.artworks(),
      where('status', '==', 'published'),
      where('category', '==', category),
      orderBy('viewCount', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Artwork;
  },

  async getMarketplaceCategorySummaries(): Promise<MarketplaceCategorySummary[]> {
    return Promise.all(
      ARTWORK_CATEGORIES.map(async ({ slug, label }) => {
        const [artworkCount, representative] = await Promise.all([
          artworkRepository.countPublishedByCategory(slug),
          artworkRepository.findRepresentativeByCategory(slug),
        ]);
        const imageUrl =
          representative?.thumbnailUrl ||
          representative?.images[0]?.url ||
          CATEGORY_PLACEHOLDER_IMAGE;
        return { slug, label, artworkCount, imageUrl };
      })
    );
  },

  async searchArtworks(term: string, max: number = 30): Promise<Artwork[]> {
    const variants = getSearchTermVariants(term);
    if (variants.length === 0) return [];

    const prefixQueries = variants.flatMap((variant) => [
      query(
        collections.artworks(),
        where('status', '==', 'published'),
        where('title', '>=', variant),
        where('title', '<=', variant + '\uf8ff'),
        limit(max)
      ),
      query(
        collections.artworks(),
        where('status', '==', 'published'),
        where('artistName', '>=', variant),
        where('artistName', '<=', variant + '\uf8ff'),
        limit(max)
      ),
    ]);

    const matchingSlugs = findMatchingCategorySlugs(term);
    const categoryQueries = matchingSlugs.map((slug) =>
      query(
        collections.artworks(),
        where('status', '==', 'published'),
        where('category', '==', slug),
        limit(max)
      )
    );

    const snapshots = await Promise.all([
      ...prefixQueries.map((q) => getDocs(q)),
      ...categoryQueries.map((q) => getDocs(q)),
    ]);

    const resultsMap = new Map<string, Artwork>();
    snapshots.forEach((snap) => {
      snap.docs.forEach((d) => {
        if (!resultsMap.has(d.id)) {
          resultsMap.set(d.id, { id: d.id, ...d.data() } as Artwork);
        }
      });
    });

    return Array.from(resultsMap.values()).slice(0, max);
  },
};
