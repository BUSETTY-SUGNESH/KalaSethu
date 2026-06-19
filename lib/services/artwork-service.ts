// ============================================================
// KalaSetu — Artwork Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { artworkRepository } from '@/lib/repositories';
import type {
  Artwork,
  ArtworkFormData,
  ArtworkImage,
  ArtworkStatus,
  PaginatedResult,
} from '@/app/types';
import type { DocumentSnapshot } from '@/lib/firebase/firestore';

// --- Create Artwork ---
export async function createArtwork(
  artistId: string,
  artistName: string,
  artistVerified: boolean,
  data: ArtworkFormData,
  images: ArtworkImage[]
): Promise<string> {
  const now = new Date().toISOString();
  const artwork: Omit<Artwork, 'id'> = {
    ...data,
    artistId,
    artistName,
    artistVerified,
    artistAvatarUrl: undefined,
    currency: 'INR',
    images,
    thumbnailUrl: images[0]?.thumbnailUrl || images[0]?.url || '',
    status: 'draft',
    isFeatured: false,
    viewCount: 0,
    likeCount: 0,
    favoriteCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  return artworkRepository.create(artwork);
}

// --- Get Single Artwork ---
export async function getArtwork(artworkId: string): Promise<Artwork | null> {
  return artworkRepository.findById(artworkId);
}

// --- Update Artwork ---
export async function updateArtwork(
  artworkId: string,
  data: Partial<Artwork>
): Promise<void> {
  return artworkRepository.update(artworkId, data);
}

// --- Update Artwork Status ---
export async function updateArtworkStatus(
  artworkId: string,
  status: ArtworkStatus
): Promise<void> {
  return artworkRepository.setStatus(artworkId, status);
}

// --- Publish Artwork ---
export async function publishArtwork(artworkId: string): Promise<void> {
  return artworkRepository.setStatus(artworkId, 'published');
}

// --- Archive Artwork ---
export async function archiveArtwork(artworkId: string): Promise<void> {
  return artworkRepository.setStatus(artworkId, 'archived');
}

// --- Delete Artwork ---
export async function deleteArtwork(artworkId: string): Promise<void> {
  return artworkRepository.delete(artworkId);
}

// --- Get Artworks by Artist ---
export async function getArtworksByArtist(
  artistId: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Artwork>> {
  return artworkRepository.findByArtist(artistId, pageSize, lastDoc);
}

// --- Get Published Artworks (for marketplace) ---
export async function getPublishedArtworks(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null,
  filters?: {
    category?: string;
    medium?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular';
  }
): Promise<PaginatedResult<Artwork>> {
  return artworkRepository.findPublished(pageSize, lastDoc, filters);
}

// --- Get Featured Artworks ---
export async function getFeaturedArtworks(count: number = 10): Promise<Artwork[]> {
  return artworkRepository.findFeatured(count);
}

// --- Search Artworks ---
export async function searchArtworks(
  searchTerm: string,
  maxResults: number = 20
): Promise<Artwork[]> {
  return artworkRepository.searchByTitle(searchTerm, maxResults);
}

// --- Increment View Count ---
export async function incrementArtworkViews(artworkId: string): Promise<void> {
  return artworkRepository.incrementViews(artworkId);
}

// --- Toggle Favorite ---
export async function incrementArtworkFavorites(
  artworkId: string,
  delta: number
): Promise<void> {
  return artworkRepository.incrementFavorites(artworkId, delta);
}

// --- Get Artworks by Category ---
export async function getArtworksByCategory(
  category: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Artwork>> {
  return artworkRepository.findByCategory(category, pageSize, lastDoc);
}

// --- Get Pending Artworks (for admin) ---
export async function getPendingArtworks(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Artwork>> {
  return artworkRepository.findPending(pageSize, lastDoc);
}
