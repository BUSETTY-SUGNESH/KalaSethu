// ============================================================
// KalaSetu — Artwork Repository (Firestore Implementation)
// ============================================================
import {
  collections,
  docRef,
  getDoc,
  getDocs,
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
  type QueryConstraint,
} from '@/lib/firebase/firestore';
import type { Artwork, ArtworkStatus, PaginatedResult } from '@/app/types';

export const artworkRepository = {
  async findById(id: string): Promise<Artwork | null> {
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
    return paginatedQuery<Artwork>(
      collections.artworks(),
      [where('artistId', '==', artistId), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  async findPublished(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null,
    filters?: {
      category?: string;
      medium?: string;
      sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular';
    }
  ): Promise<PaginatedResult<Artwork>> {
    const constraints: QueryConstraint[] = [where('status', '==', 'published')];
    if (filters?.category) constraints.push(where('category', '==', filters.category));
    if (filters?.medium) constraints.push(where('medium', '==', filters.medium));
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

  async searchArtworks(term: string, max: number = 30): Promise<Artwork[]> {
    if (!term) return [];
    
    // Capitalize the term to match Title Case typically used in KalaSetu
    const formattedTerm = term.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // Query 1: Title Prefix
    const qTitle = query(
      collections.artworks(),
      where('status', '==', 'published'),
      where('title', '>=', formattedTerm),
      where('title', '<=', formattedTerm + '\uf8ff'),
      limit(max)
    );

    // Query 2: Artist Name Prefix
    const qArtist = query(
      collections.artworks(),
      where('status', '==', 'published'),
      where('artistName', '>=', formattedTerm),
      where('artistName', '<=', formattedTerm + '\uf8ff'),
      limit(max)
    );

    // Query 3: Category Exact Match
    const qCategory = query(
      collections.artworks(),
      where('status', '==', 'published'),
      where('category', '==', formattedTerm),
      limit(max)
    );

    // Execute in parallel
    const [titleSnap, artistSnap, categorySnap] = await Promise.all([
      getDocs(qTitle),
      getDocs(qArtist),
      getDocs(qCategory),
    ]);

    // Merge and deduplicate by ID
    const resultsMap = new Map<string, Artwork>();
    
    [...titleSnap.docs, ...artistSnap.docs, ...categorySnap.docs].forEach(d => {
      if (!resultsMap.has(d.id)) {
        resultsMap.set(d.id, { id: d.id, ...d.data() } as Artwork);
      }
    });

    return Array.from(resultsMap.values()).slice(0, max);
  },
};
